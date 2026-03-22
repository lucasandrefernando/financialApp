/**
 * Hook para insights financeiros baseados em IA
 */

import { useQuery } from '@tanstack/react-query'
import { aiClient } from '../services/ai/index'
import type { Transaction } from '../types/database'

export interface FinancialInsight {
  type: 'savings' | 'spending' | 'pattern' | 'alert'
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  actionable: boolean
  suggestion?: string
}

/**
 * Hook para gerar insights do spending
 */
export function useFinancialInsights(
  transactions: Transaction[] | undefined,
  budgets: Record<string, number> | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['financialInsights', JSON.stringify(transactions?.length), JSON.stringify(budgets)],
    queryFn: async () => {
      if (!transactions || transactions.length === 0) {
        return []
      }

      // Formata transações para Gemini
      const formattedTransactions = transactions.map((t) => ({
        description: t.description,
        amount: Number(t.amount),
        category: 'outro',
      }))

      try {
        const insightsText = await aiClient.generateInsights(formattedTransactions, budgets)
        return parseInsights(insightsText)
      } catch (error) {
        console.error('Error generating insights:', error)
        return generateLocalInsights(transactions, budgets)
      }
    },
    enabled: enabled && !!transactions && transactions.length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutos
  })
}

/**
 * Hook para detectar anomalias
 */
export function useAnomalyDetection(
  transactions: Transaction[] | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['anomalies', JSON.stringify(transactions?.map((t) => t.id))],
    queryFn: async () => {
      if (!transactions || transactions.length === 0) {
        return []
      }

      const formattedTransactions = transactions.map((t) => ({
        description: t.description,
        amount: Number(t.amount),
        category: 'outro',
        date: t.created_at || new Date().toISOString(),
      }))

      try {
        return await aiClient.detectAnomalies(formattedTransactions)
      } catch (error) {
        console.error('Error detecting anomalies:', error)
        return detectLocalAnomalies(transactions)
      }
    },
    enabled: enabled && !!transactions && transactions.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hora
  })
}

/**
 * Hook para sugestões de economia
 */
export function useSavingsSuggestions(
  categorySpending: Record<string, number> | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['savingsSuggestions', JSON.stringify(categorySpending)],
    queryFn: async () => {
      if (!categorySpending || Object.keys(categorySpending).length === 0) {
        return ''
      }

      try {
        return await aiClient.suggestSavings(categorySpending)
      } catch (error) {
        console.error('Error generating savings suggestions:', error)
        return generateLocalSavingsSuggestions(categorySpending)
      }
    },
    enabled: enabled && !!categorySpending,
    staleTime: 1000 * 60 * 60, // 1 hora
  })
}

/**
 * Hook para análise de tendências
 */
export function useTrendAnalysis(
  transactions: Transaction[] | undefined,
  monthsToAnalyze = 6,
  enabled = true,
) {
  return useQuery({
    queryKey: ['trendAnalysis', JSON.stringify(transactions?.length), monthsToAnalyze],
    queryFn: () => {
      if (!transactions || transactions.length === 0) {
        return { trend: 'stable', monthlyAverage: 0, categories: {} }
      }

      return analyzeTrends(transactions, monthsToAnalyze)
    },
    enabled: enabled && !!transactions && transactions.length > 0,
    staleTime: 1000 * 60 * 60 * 24, // 24 horas
  })
}

// ============ Helpers ============

/**
 * Analisa tendências de gastos
 */
function analyzeTrends(
  transactions: Transaction[],
  monthsToAnalyze: number,
): { trend: 'increasing' | 'decreasing' | 'stable'; monthlyAverage: number; categories: Record<string, number> } {
  const now = new Date()
  const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsToAnalyze, now.getDate())

  const relevantTransactions = transactions.filter((t) => {
    const txDate = new Date(t.created_at || new Date())
    return txDate >= cutoffDate
  })

  if (relevantTransactions.length === 0) {
    return { trend: 'stable', monthlyAverage: 0, categories: {} }
  }

  const totalAmount = relevantTransactions.reduce((sum, t) => sum + Number(t.amount), 0)
  const monthlyAverage = totalAmount / monthsToAnalyze

  // Agrupa por categoria
  const categories: Record<string, number> = {}
  relevantTransactions.forEach((t) => {
    const cat = 'outro'
    categories[cat] = (categories[cat] || 0) + Number(t.amount)
  })

  // Determina tendência (simplificado)
  const trend: 'increasing' | 'decreasing' | 'stable' = 'stable'

  return { trend, monthlyAverage, categories }
}

/**
 * Gera insights locais (sem Gemini)
 */
function generateLocalInsights(transactions: Transaction[], budgets?: Record<string, number>): FinancialInsight[] {
  const insights: FinancialInsight[] = []

  // Agrupa por categoria
  const byCategory: Record<string, number> = {}
  transactions.forEach((t) => {
    const cat = 'outro'
    byCategory[cat] = (byCategory[cat] || 0) + Math.abs(Number(t.amount))
  })

  // Verifica categorias com mais gastos
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

  if (sorted.length > 0) {
    const [topCategory, topAmount] = sorted[0]
    insights.push({
      type: 'spending',
      title: 'Maior categoria de gasto',
      description: `${topCategory} representa R$ ${topAmount.toFixed(2)} de seus gastos`,
      impact: 'medium',
      actionable: true,
      suggestion: `Analise suas despesas em ${topCategory} para identificar oportunidades de economia`,
    })
  }

  // Verifica limites de orçamento
  if (budgets) {
    for (const [category, limit] of Object.entries(budgets)) {
      const spent = byCategory[category] || 0
      const percentage = (spent / limit) * 100

      if (percentage > 100) {
        insights.push({
          type: 'alert',
          title: `Orçamento excedido em ${category}`,
          description: `Você gastou R$ ${spent.toFixed(2)} de um orçamento de R$ ${limit.toFixed(2)}`,
          impact: 'high',
          actionable: true,
          suggestion: `Reduza gastos em ${category} ou aumente o limite de orçamento`,
        })
      } else if (percentage > 80) {
        insights.push({
          type: 'alert',
          title: `Atenção ao orçamento de ${category}`,
          description: `Você atingiu ${percentage.toFixed(0)}% do seu orçamento`,
          impact: 'medium',
          actionable: true,
        })
      }
    }
  }

  return insights
}

/**
 * Detecta anomalias localmente
 */
function detectLocalAnomalies(transactions: Transaction[]): string[] {
  const anomalies: string[] = []
  const amounts = transactions.map((t) => Math.abs(Number(t.amount)))
  const average = amounts.reduce((a, b) => a + b, 0) / amounts.length
  const stdDev = Math.sqrt(amounts.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / amounts.length)

  transactions.forEach((t) => {
    const amount = Math.abs(Number(t.amount))
    if (amount > average + stdDev * 2) {
      anomalies.push(`Transação elevada: R$ ${amount.toFixed(2)} - ${t.description}`)
    }
  })

  return anomalies
}

/**
 * Gera sugestões de economia localmente
 */
function generateLocalSavingsSuggestions(categorySpending: Record<string, number>): string {
  const sorted = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])

  const suggestions = sorted.slice(0, 3).map(([category, amount]) => {
    const savings = amount * 0.1 // 10% de economia
    return `• Reduzir ${category} em 10%: economize R$ ${savings.toFixed(2)}/mês`
  })

  return suggestions.join('\n')
}

/**
 * Parse insights da resposta do Gemini
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .replace(/`(.*?)`/g, '$1')
    .trim()
}

function parseInsights(text: string): FinancialInsight[] {
  const lines = text.split('\n').filter((l) => l.trim())

  return lines.map((line) => {
    const clean = stripMarkdown(line)
    return {
      type: 'savings' as const,
      title: clean.substring(0, 60),
      description: clean,
      impact: 'medium' as const,
      actionable: true,
    }
  })
}