/**
 * Hook para usar serviço de IA e categorização
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categorizationService } from '../services/ai/categorization'

/**
 * Hook para categorizar uma transação
 */
export function useCategorization(description: string, amount?: number, enabled = true) {
  return useQuery({
    queryKey: ['categorization', description, amount],
    queryFn: () => categorizationService.categorizeTransaction(description, amount),
    enabled: enabled && !!description,
    staleTime: 1000 * 60 * 60, // 1 hora
    gcTime: 1000 * 60 * 60 * 24, // 24 horas
  })
}

/**
 * Hook para sugerir categorias para múltiplas transações
 */
export function useBatchCategorization(
  transactions: Array<{ id: string; description: string; amount: number }>,
  enabled = true,
) {
  return useQuery({
    queryKey: ['batchCategorization', JSON.stringify(transactions)],
    queryFn: () => categorizationService.suggestCategoriesForBatch(transactions),
    enabled: enabled && transactions.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para registrar feedback de categorização
 */
export function useCategorizationFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ description, category, confidence }: { description: string; category: string; confidence: number }) => {
      categorizationService.recordFeedback(description, category, confidence)
      return Promise.resolve()
    },
    onSuccess: () => {
      // Invalida queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['categorization'] })
    },
  })
}

/**
 * Hook para obter relatório de confiança
 */
export function useCategorizationReport() {
  return useQuery({
    queryKey: ['categorizationReport'],
    queryFn: () => categorizationService.getConfidenceReport(),
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para limpar cache de categorização
 */
export function useClearCategorizationCache() {
  const queryClient = useQueryClient()

  return () => {
    categorizationService.clearCache()
    queryClient.invalidateQueries({ queryKey: ['categorization'] })
    queryClient.invalidateQueries({ queryKey: ['batchCategorization'] })
  }
}
