import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchGoals, fetchGoalById, createGoal, updateGoal, contributeToGoal, deleteGoal } from '@/services/api/goals'
import type { Goal } from '@/types/database'

export const goalKeys = {
  all: ['goals'] as const,
  list: () => [...goalKeys.all, 'list'] as const,
  detail: (id: string) => [...goalKeys.all, 'detail', id] as const,
}

export function useGoals() {
  return useQuery({ queryKey: goalKeys.list(), queryFn: fetchGoals })
}

export function useGoal(id: string) {
  return useQuery({ queryKey: goalKeys.detail(id), queryFn: () => fetchGoalById(id), enabled: !!id })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at'>) =>
      createGoal(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.all }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<Goal, 'id' | 'user_id'>> }) =>
      updateGoal(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.all }),
  })
}

export function useContributeToGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => contributeToGoal(id, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.all }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: goalKeys.all }),
  })
}
