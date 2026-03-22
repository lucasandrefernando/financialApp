import { supabase } from '@/services/supabase'
import type { MonthlyFlow, CategorySpending } from '@/types/database'

export async function fetchMonthlyCashFlow(months = 12) {
  const { data, error } = await supabase
    .from('vw_monthly_cash_flow')
    .select('*')
    .order('month', { ascending: false })
    .limit(months)
  if (error) throw error
  return (data as MonthlyFlow[]).reverse()
}

export async function fetchCategorySpending(year: number, month: number) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}-01`
  const { data, error } = await supabase
    .from('vw_category_spending')
    .select('*')
    .eq('month', monthStr)
    .order('total_amount', { ascending: false })
  if (error) throw error
  return data as CategorySpending[]
}
