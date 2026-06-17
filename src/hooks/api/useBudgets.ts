import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetsService } from '../../services/budgets'
import { financialQueryOptions, syncFinancialQueries } from './financialSync'

export function useBudgets() {
  return useQuery({ queryKey: ['budgets'], queryFn: budgetsService.list, ...financialQueryOptions })
}

export function useCreateBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: budgetsService.create,
    onSuccess: () => syncFinancialQueries(qc),
  })
}

export function useUpdateBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: any) => budgetsService.update(id, data),
    onSuccess: () => syncFinancialQueries(qc),
  })
}

export function useDeleteBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: budgetsService.delete,
    onSuccess: () => syncFinancialQueries(qc),
  })
}
