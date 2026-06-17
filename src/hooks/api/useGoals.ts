import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { goalsService } from '../../services/goals'
import { financialQueryOptions, syncFinancialQueries } from './financialSync'

export function useGoals() {
  return useQuery({ queryKey: ['goals'], queryFn: goalsService.list, ...financialQueryOptions })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: goalsService.create,
    onSuccess: () => syncFinancialQueries(qc),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: any) => goalsService.update(id, data),
    onSuccess: () => syncFinancialQueries(qc),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: goalsService.delete,
    onSuccess: () => syncFinancialQueries(qc),
  })
}
