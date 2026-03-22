import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTransactions, fetchTransactionById, createTransaction, updateTransaction, deleteTransaction, fetchRecentTransactions, fetchMonthlySummary, type TransactionFilters } from '@/services/api/transactions'
import type { Transaction } from '@/types/database'

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters?: TransactionFilters) => [...transactionKeys.all, 'list', filters] as const,
  detail: (id: string) => [...transactionKeys.all, 'detail', id] as const,
  recent: (limit?: number) => [...transactionKeys.all, 'recent', limit] as const,
  summary: (year: number, month: number) => [...transactionKeys.all, 'summary', year, month] as const,
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: transactionKeys.all })
  qc.invalidateQueries({ queryKey: ['accounts'] })
  qc.invalidateQueries({ queryKey: ['budgets'] })
  qc.invalidateQueries({ queryKey: ['financialInsights'] })
  qc.invalidateQueries({ queryKey: ['anomalies'] })
  qc.invalidateQueries({ queryKey: ['trendAnalysis'] })
}

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: () => fetchTransactions(filters),
  })
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => fetchTransactionById(id),
    enabled: !!id,
  })
}

export function useRecentTransactions(limit = 5) {
  return useQuery({
    queryKey: transactionKeys.recent(limit),
    queryFn: () => fetchRecentTransactions(limit),
  })
}

export function useMonthlySummary(year: number, month: number) {
  return useQuery({
    queryKey: transactionKeys.summary(year, month),
    queryFn: () => fetchMonthlySummary(year, month),
    staleTime: 0,
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
      createTransaction(payload),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<Transaction, 'id' | 'user_id'>> }) =>
      updateTransaction(id, payload),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => invalidateAll(qc),
  })
}
