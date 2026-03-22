import { supabase } from '@/services/supabase'
import type { Budget, BudgetProgress, Database } from '@/types/database'

type BudgetInsert = Database['public']['Tables']['budgets']['Insert']
type BudgetUpdate = Database['public']['Tables']['budgets']['Update']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any

export async function fetchBudgets() {
  const { data, error } = await supabase
    .from('vw_budget_progress')
    .select('*')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('sort_order', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data as BudgetProgress[]
}

export async function fetchBudgetById(id: string) {
  const { data, error } = await supabase
    .from('vw_budget_progress')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as BudgetProgress
}

export async function createBudget(payload: BudgetInsert) {
  const { data, error } = await (supabase
    .from('budgets') as AnyTable)
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as Budget
}

export async function updateBudget(id: string, payload: BudgetUpdate) {
  const { data, error } = await (supabase
    .from('budgets') as AnyTable)
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Budget
}

export async function deleteBudget(id: string) {
  const { error } = await (supabase
    .from('budgets') as AnyTable)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function fetchAlertBudgets() {
  const { data, error } = await supabase
    .from('vw_budget_progress')
    .select('*')
    .is('deleted_at', null)
    .eq('is_active', true)
    .in('alert_level', ['alert', 'exceeded'])
  if (error) throw error
  return data as BudgetProgress[]
}
