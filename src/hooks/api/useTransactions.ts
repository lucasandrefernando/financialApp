import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsService } from '../../services/transactions'

type TransactionFilters = Record<string, string | number | undefined>
type UpdateTransactionPayload = { id: number } & Record<string, unknown>

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => transactionsService.list(filters),
  })
}

export function useTransactionsSummary(year: number, month: number) {
  return useQuery({
    queryKey: ['transactions', 'summary', year, month],
    queryFn: () => transactionsService.summary(year, month),
  })
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['transactions'] })
  qc.invalidateQueries({ queryKey: ['accounts'] })
  qc.invalidateQueries({ queryKey: ['dashboard'] })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: transactionsService.create,
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateTransactionPayload) => transactionsService.update(id, data),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: transactionsService.delete,
    onSuccess: () => invalidateAll(qc),
  })
}
