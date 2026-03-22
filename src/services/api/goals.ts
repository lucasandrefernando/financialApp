import { supabase } from '@/services/supabase'
import type { Goal, GoalProgress, Database } from '@/types/database'

type GoalInsert = Database['public']['Tables']['goals']['Insert']
type GoalUpdate = Database['public']['Tables']['goals']['Update']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any

export async function fetchGoals() {
  const { data, error } = await supabase
    .from('vw_goal_progress')
    .select('*')
    .is('deleted_at', null)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as GoalProgress[]
}

export async function fetchGoalById(id: string) {
  const { data, error } = await supabase
    .from('vw_goal_progress')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as GoalProgress
}

export async function createGoal(payload: GoalInsert) {
  const { data, error } = await (supabase
    .from('goals') as AnyTable)
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as Goal
}

export async function updateGoal(id: string, payload: GoalUpdate) {
  const { data, error } = await (supabase
    .from('goals') as AnyTable)
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Goal
}

export async function contributeToGoal(id: string, amount: number) {
  const { data: goal, error: fetchError } = await supabase
    .from('goals')
    .select('current_amount, target_amount')
    .eq('id', id)
    .single()
  if (fetchError) throw fetchError

  const newAmount = Math.min((goal as AnyTable).current_amount + amount, (goal as AnyTable).target_amount)

  const { data, error } = await (supabase
    .from('goals') as AnyTable)
    .update({ current_amount: newAmount })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Goal
}

export async function deleteGoal(id: string) {
  const { error } = await (supabase
    .from('goals') as AnyTable)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
