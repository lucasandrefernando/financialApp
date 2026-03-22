import { supabase } from '@/services/supabase'
import type { Category, Database } from '@/types/database'

type CategoryInsert = Database['public']['Tables']['categories']['Insert']
type CategoryUpdate = Database['public']['Tables']['categories']['Update']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return data as Category[]
}

export async function createCategory(payload: CategoryInsert) {
  const { data, error } = await (supabase
    .from('categories') as AnyTable)
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as Category
}

export async function updateCategory(id: string, payload: CategoryUpdate) {
  const { data, error } = await (supabase
    .from('categories') as AnyTable)
    .update(payload)
    .eq('id', id)
    .eq('is_system', false)
    .select()
    .single()
  if (error) throw error
  return data as Category
}

export async function deleteCategory(id: string) {
  const { error } = await (supabase
    .from('categories') as AnyTable)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('is_system', false)
  if (error) throw error
}
