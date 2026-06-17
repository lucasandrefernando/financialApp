import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsService } from '../../services/accounts'
import { financialQueryOptions, syncFinancialQueries } from './financialSync'
import type { BankAccount } from '../../types'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: accountsService.list,
    ...financialQueryOptions,
  })
}

async function syncAccountQueries(qc: ReturnType<typeof useQueryClient>) {
  await syncFinancialQueries(qc)
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: accountsService.create,
    onSuccess: async () => {
      await syncAccountQueries(qc)
    },
  })
}

export function useUpdateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: any) => accountsService.update(id, data),
    onSuccess: async () => {
      await syncAccountQueries(qc)
    },
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: accountsService.delete,
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ['accounts'] })
      const previousAccounts = qc.getQueryData<BankAccount[]>(['accounts'])

      qc.setQueryData<BankAccount[]>(['accounts'], (current = []) =>
        current.filter(account => account.id !== id)
      )

      return { previousAccounts }
    },
    onError: (_error, _id, context) => {
      if (context?.previousAccounts) {
        qc.setQueryData(['accounts'], context.previousAccounts)
      }
    },
    onSettled: async () => {
      await syncAccountQueries(qc)
    },
  })
}
