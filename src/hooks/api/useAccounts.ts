import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAccounts, fetchAccountById, createAccount, updateAccount, deleteAccount, fetchTotalBalance } from '@/services/api/accounts'
import type { Account } from '@/types/database'

export const accountKeys = {
  all: ['accounts'] as const,
  list: () => [...accountKeys.all, 'list'] as const,
  detail: (id: string) => [...accountKeys.all, 'detail', id] as const,
  balance: () => [...accountKeys.all, 'balance'] as const,
}

export function useAccounts() {
  return useQuery({
    queryKey: accountKeys.list(),
    queryFn: fetchAccounts,
    staleTime: 0,
  })
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: accountKeys.detail(id),
    queryFn: () => fetchAccountById(id),
    enabled: !!id,
  })
}

export function useTotalBalance() {
  return useQuery({
    queryKey: accountKeys.balance(),
    queryFn: fetchTotalBalance,
  })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
      createAccount(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.all }),
  })
}

export function useUpdateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<Account, 'id' | 'user_id'>> }) =>
      updateAccount(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.all }),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: accountKeys.all }),
  })
}
