import { supabase } from '@/services/supabase'
import { recalculateAccountBalances } from '@/services/api/accounts'
import type { RecentTransaction, Transaction, MonthlySummary, Database } from '@/types/database'
import type { TransactionType, TransactionStatus } from '@/types/database'

type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any

export interface TransactionFilters {
  type?: TransactionType
  status?: TransactionStatus
  category_id?: string
  account_id?: string
  start_date?: string
  end_date?: string
  search?: string
  page?: number
  page_size?: number
}

export async function fetchTransactions(filters: TransactionFilters = {}) {
  const { type, status, category_id, account_id, start_date, end_date, search, page = 1, page_size = 25 } = filters
  const offset = (page - 1) * page_size

  let query = supabase
    .from('vw_recent_transactions')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)

  if (type) query = query.eq('type', type)
  if (status) query = query.eq('status', status)
  if (category_id) query = query.eq('category_id', category_id)
  if (account_id) query = query.eq('account_id', account_id)
  if (start_date) query = query.gte('transaction_date', start_date)
  if (end_date) query = query.lte('transaction_date', end_date)
  if (search) query = query.ilike('description', `%${search}%`)

  query = query.order('transaction_date', { ascending: false }).range(offset, offset + page_size - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data as RecentTransaction[], count: count ?? 0 }
}

export async function fetchTransactionById(id: string) {
  const { data, error } = await supabase
    .from('vw_recent_transactions')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as RecentTransaction
}

export async function createTransaction(payload: TransactionInsert) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuario nao autenticado')

  const { data, error } = await (supabase
    .from('transactions') as AnyTable)
    .insert({ ...payload, user_id: user.id })
    .select()
    .single()
  if (error) {
    console.error('Supabase createTransaction error:', JSON.stringify(error))
    throw error
  }

  await recalculateAccountBalances([data.account_id, data.destination_account_id])
  return data as Transaction
}

export async function updateTransaction(id: string, payload: TransactionUpdate) {
  const { data: before, error: beforeError } = await (supabase
    .from('transactions') as AnyTable)
    .select('account_id, destination_account_id')
    .eq('id', id)
    .single()
  if (beforeError) throw beforeError

  const { data, error } = await (supabase
    .from('transactions') as AnyTable)
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  await recalculateAccountBalances([
    before?.account_id,
    before?.destination_account_id,
    data.account_id,
    data.destination_account_id,
  ])

  return data as Transaction
}

export async function deleteTransaction(id: string) {
  const { data: before, error: beforeError } = await (supabase
    .from('transactions') as AnyTable)
    .select('account_id, destination_account_id')
    .eq('id', id)
    .single()
  if (beforeError) throw beforeError

  const { error } = await (supabase
    .from('transactions') as AnyTable)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error

  await recalculateAccountBalances([before?.account_id, before?.destination_account_id])
}

export async function fetchMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  const { data, error } = await supabase
    .from('vw_recent_transactions')
    .select('type, amount, category_name')
    .is('deleted_at', null)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)

  if (error) throw error

  const rows = (data ?? []) as { type: string; amount: number; category_name: string | null }[]

  const total_income = rows
    .filter((r) => r.type === 'income')
    .reduce((s, r) => s + Number(r.amount), 0)

  const total_expense = rows
    .filter((r) => r.type === 'expense')
    .reduce((s, r) => s + Number(r.amount), 0)

  const net_balance = total_income - total_expense
  const transaction_count = rows.length
  const savings_rate = total_income > 0 ? ((total_income - total_expense) / total_income) * 100 : 0

  const categoryTotals: Record<string, number> = {}
  rows.filter((r) => r.type === 'expense').forEach((r) => {
    const cat = r.category_name ?? 'Outros'
    categoryTotals[cat] = (categoryTotals[cat] ?? 0) + Number(r.amount)
  })
  const top_expense_category = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  return { total_income, total_expense, net_balance, transaction_count, top_expense_category, savings_rate }
}

export async function fetchRecentTransactions(limit = 5) {
  const { data, error } = await supabase
    .from('vw_recent_transactions')
    .select('*')
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as RecentTransaction[]
}
