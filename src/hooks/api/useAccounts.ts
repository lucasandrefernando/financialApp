import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsService } from '../../services/accounts'

export function useAccounts() {
  return useQuery({ queryKey: ['accounts'], queryFn: accountsService.list })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: accountsService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useUpdateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: any) => accountsService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: accountsService.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}
