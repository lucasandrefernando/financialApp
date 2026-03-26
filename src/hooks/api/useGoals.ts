import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { goalsService } from '../../services/goals'

export function useGoals() {
  return useQuery({ queryKey: ['goals'], queryFn: goalsService.list })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: goalsService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: any) => goalsService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: goalsService.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}
