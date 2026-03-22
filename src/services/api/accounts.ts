import { supabase } from '@/services/supabase'
import type { Account, AccountSummary, Database } from '@/types/database'

type AccountInsert = Database['public']['Tables']['accounts']['Insert']
type AccountUpdate = Database['public']['Tables']['accounts']['Update']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any

export async function fetchAccounts() {
  const { data, error } = await supabase
    .from('vw_account_summary')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as AccountSummary[]
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
