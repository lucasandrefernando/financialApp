import { supabase } from '@/services/supabase'
import type { Account, AccountSummary, Database } from '@/types/database'
import type { TransactionType } from '@/types/database'

type AccountInsert = Database['public']['Tables']['accounts']['Insert']
type AccountUpdate = Database['public']['Tables']['accounts']['Update']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any

type BalanceTransactionRow = {
  account_id: string | null
  destination_account_id: string | null
  type: TransactionType
  amount: number
}

type BalanceAccountRow = {
  id: string
  initial_balance: number
  balance: number
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function uniqueValidIds(accountIds: Array<string | null | undefined>) {
  return [...new Set(accountIds.filter((id): id is string => !!id))]
}

async function getBalancesByAccountId(accountRows: BalanceAccountRow[]) {
  const accountIds = accountRows.map((a) => a.id)
  const accountIdList = accountIds.join(',')

  if (accountIds.length === 0) return new Map<string, number>()

  const { data: txRows, error: txError } = await (supabase
    .from('transactions') as AnyTable)
    .select('account_id, destination_account_id, type, amount')
    .eq('status', 'completed')
    .is('deleted_at', null)
    .or(`account_id.in.(${accountIdList}),destination_account_id.in.(${accountIdList})`)

  if (txError) throw txError

  const deltas = new Map<string, number>()
  accountIds.forEach((id) => deltas.set(id, 0))

  for (const tx of (txRows as BalanceTransactionRow[] ?? [])) {
    const amount = Number(tx.amount || 0)
    if (!amount) continue

    if (tx.type === 'income' && tx.account_id && deltas.has(tx.account_id)) {
      deltas.set(tx.account_id, (deltas.get(tx.account_id) ?? 0) + amount)
      continue
    }

    if (tx.type === 'expense' && tx.account_id && deltas.has(tx.account_id)) {
      deltas.set(tx.account_id, (deltas.get(tx.account_id) ?? 0) - amount)
      continue
    }

    if (tx.type === 'transfer') {
      if (tx.account_id && deltas.has(tx.account_id)) {
        deltas.set(tx.account_id, (deltas.get(tx.account_id) ?? 0) - amount)
      }
      if (tx.destination_account_id && deltas.has(tx.destination_account_id)) {
        deltas.set(tx.destination_account_id, (deltas.get(tx.destination_account_id) ?? 0) + amount)
      }
    }
  }

  const balances = new Map<string, number>()
  for (const row of accountRows) {
    balances.set(row.id, roundMoney(Number(row.initial_balance || 0) + Number(deltas.get(row.id) ?? 0)))
  }
  return balances
}

export async function recalculateAccountBalances(accountIds: Array<string | null | undefined>) {
  const validIds = uniqueValidIds(accountIds)
  if (validIds.length === 0) return new Map<string, number>()

  const { data: accountRows, error: accountError } = await (supabase
    .from('accounts') as AnyTable)
    .select('id, initial_balance, balance')
    .in('id', validIds)
    .is('deleted_at', null)

  if (accountError) throw accountError

  const rows = (accountRows as BalanceAccountRow[] ?? [])
  if (rows.length === 0) return new Map<string, number>()

  const balances = await getBalancesByAccountId(rows)
  const updates = rows
    .map((row) => ({
      id: row.id,
      current: roundMoney(Number(row.balance || 0)),
      calculated: balances.get(row.id) ?? roundMoney(Number(row.initial_balance || 0)),
    }))
    .filter((row) => Math.abs(row.calculated - row.current) >= 0.01)

  if (updates.length > 0) {
    await Promise.all(
      updates.map((row) =>
        (supabase.from('accounts') as AnyTable)
          .update({ balance: row.calculated })
          .eq('id', row.id)
      )
    )
  }

  return balances
}

export async function fetchAccounts() {
  const { data, error } = await supabase
    .from('vw_account_summary')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  if (error) throw error

  const rows = data as AccountSummary[] ?? []
  if (rows.length === 0) return rows

  try {
    const balances = await recalculateAccountBalances(rows.map((row) => row.id))
    return rows.map((row) => ({
      ...row,
      balance: balances.get(row.id) ?? row.balance,
    }))
  } catch (syncError) {
    console.error('Balance recalculation failed on fetchAccounts:', syncError)
    return rows
  }
}

export async function fetchAccountById(id: string) {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) throw error
  return data as Account
}

export async function createAccount(payload: AccountInsert) {
  const { data, error } = await (supabase
    .from('accounts') as AnyTable)
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as Account
}

export async function updateAccount(id: string, payload: AccountUpdate) {
  const { data, error } = await (supabase
    .from('accounts') as AnyTable)
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Account
}

export async function deleteAccount(id: string) {
  const { error } = await (supabase
    .from('accounts') as AnyTable)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function fetchTotalBalance() {
  const { data, error } = await supabase
    .from('accounts')
    .select('balance')
    .is('deleted_at', null)
    .eq('include_in_sum', true)
    .eq('is_active', true)
  if (error) throw error
  return (data as AnyTable[] ?? []).reduce((sum, a) => sum + (a.balance ?? 0), 0)
}
