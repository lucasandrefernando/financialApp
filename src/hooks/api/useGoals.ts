import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { goalsService } from '../../services/goals'

export function useGoals() {
  return useQuery({ queryKey: ['goals'], queryFn: goalsService.list })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: goalsService.create,
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      await Promise.all([
        qc.refetchQueries({ queryKey: ['goals'], type: 'active' }),
        qc.refetchQueries({ queryKey: ['dashboard'], type: 'active' }),
      ])
    },
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: any) => goalsService.update(id, data),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      await Promise.all([
        qc.refetchQueries({ queryKey: ['goals'], type: 'active' }),
        qc.refetchQueries({ queryKey: ['dashboard'], type: 'active' }),
      ])
    },
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: goalsService.delete,
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      await Promise.all([
        qc.refetchQueries({ queryKey: ['goals'], type: 'active' }),
        qc.refetchQueries({ queryKey: ['dashboard'], type: 'active' }),
      ])
    },
  })
}
