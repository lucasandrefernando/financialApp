import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchBudgets, fetchBudgetById, createBudget, updateBudget, deleteBudget, fetchAlertBudgets } from '@/services/api/budgets'
import type { Budget } from '@/types/database'

export const budgetKeys = {
  all: ['budgets'] as const,
  list: () => [...budgetKeys.all, 'list'] as const,
  detail: (id: string) => [...budgetKeys.all, 'detail', id] as const,
  alerts: () => [...budgetKeys.all, 'alerts'] as const,
}

export function useBudgets() {
  return useQuery({ queryKey: budgetKeys.list(), queryFn: fetchBudgets })
}

export function useBudget(id: string) {
  return useQuery({ queryKey: budgetKeys.detail(id), queryFn: () => fetchBudgetById(id), enabled: !!id })
}

export function useAlertBudgets() {
  return useQuery({ queryKey: budgetKeys.alerts(), queryFn: fetchAlertBudgets })
}

export function useCreateBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<Budget, 'id' | 'user_id' | 'spent' | 'created_at' | 'updated_at'>) =>
      createBudget(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: budgetKeys.all }),
  })
}

export function useUpdateBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<Budget, 'id' | 'user_id' | 'spent'>> }) =>
      updateBudget(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: budgetKeys.all }),
  })
}

export function useDeleteBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: budgetKeys.all }),
  })
}
