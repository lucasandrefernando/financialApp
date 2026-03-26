import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetsService } from '../../services/budgets'

export function useBudgets() {
  return useQuery({ queryKey: ['budgets'], queryFn: budgetsService.list })
}

export function useCreateBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: budgetsService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })
}

export function useUpdateBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: any) => budgetsService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })
}

export function useDeleteBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: budgetsService.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })
}
