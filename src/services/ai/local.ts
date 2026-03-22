/**
 * Cliente de IA Local - Fallback quando APIs externas falham
 * Usa padrões locais para categorização de transações
 */

import { categoryPatterns } from '../../utils/categoryPatterns'
import type { AIClient } from './index'

export class LocalAIClient implements AIClient {
  private cache: Map<string, { response: string; timestamp: number }> = new Map()

  constructor() {
    console.warn('⚠️ Using Local AI categorization (fallback mode)')
  }

  /**
   * Categoriza transação usando padrões locais
   */
  async categorizeTransaction(
    description: string,
    _amount: number,
    categories: string[]
  ): Promise<{ category: string; confidence: number; reasoning: string }> {
    const lowerDesc = description.toLowerCase()
    const scores: Record<string, number> = {}

    // Inicializa scores
    categories.forEach((cat) => {
      scores[cat] = 0
    })

    // Busca padrões e calcula scores
    Object.entries(categoryPatterns).forEach(([categoryKey, patterns]) => {
      if (!categories.includes(categoryKey)) return

      // Busca keywords
      patterns.keywords.forEach((keyword) => {
        if (lowerDesc.includes(keyword.toLowerCase())) {
          scores[categoryKey] += 2
        }
      })

      // Busca merchants
      patterns.merchants.forEach((merchant) => {
        if (lowerDesc.includes(merchant.toLowerCase())) {
          scores[categoryKey] += 3
        }
      })
    })

    // Encontra categoria com maior score
    let bestCategory = categories[0]
    let bestScore = scores[bestCategory] || 0

    Object.entries(scores).forEach(([cat, score]) => {
      if (score > bestScore) {
        bestScore = score
        bestCategory = cat
      }
    })

    // Calcula confiança (0-100)
    const confidence = Math.min(100, (bestScore / 3) * 20 + 30)

    return {
      category: bestCategory,
      confidence: Math.round(confidence),
      reasoning: `Local pattern matching: "${description}"`,
    }
  }

  /**
   * Gera insights genéricos baseados em padrões
   */
  async generateInsights(
    transactions: Array<{ description: string; amount: number; category: string }>,
    _budget?: Record<string, number>
  ): Promise<string> {
    if (!transactions || transactions.length === 0) {
      return 'Sem transações para análise.'
    }

    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const avgAmount = totalAmount / transactions.length
    const categoryCounts: Record<string, number> = {}

    transactions.forEach((t) => {
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1
    })

    const topCategory = Object.entries(categoryCounts).sort(([, a], [, b]) => b - a)[0]

    return `Foram analisadas ${transactions.length} transações. Valor total: R$ ${totalAmount.toFixed(2)}. Média por transação: R$ ${avgAmount.toFixed(2)}. Categoria mais frequente: ${topCategory?.[0] || 'Indefinida'}.`
  }

  /**
   * Detecta anomalias simples baseadas em valores
   */
  async detectAnomalies(
    transactions: Array<{ description: string; amount: number; category: string; date: string }>
  ): Promise<string[]> {
    const anomalies: string[] = []

    if (!transactions || transactions.length < 3) return anomalies

    // Calcula valores por categoria
    const categoryValues: Record<string, number[]> = {}
    transactions.forEach((t) => {
      if (!categoryValues[t.category]) {
        categoryValues[t.category] = []
      }
      categoryValues[t.category].push(Math.abs(t.amount))
    })

    // Detecta outliers (valores muito altos)
    Object.entries(categoryValues).forEach(([category, values]) => {
      if (values.length < 2) return

      const avg = values.reduce((a, b) => a + b, 0) / values.length
      const maxValue = Math.max(...values)

      if (maxValue > avg * 2) {
        anomalies.push(`Gasto alto em ${category}: R$ ${maxValue.toFixed(2)} (Média: R$ ${avg.toFixed(2)})`)
      }
    })

    return anomalies
  }

  /**
   * Sugere economias genéricas
   */
  async suggestSavings(categorySpending: Record<string, number>): Promise<string> {
    const entries = Object.entries(categorySpending).sort(([, a], [, b]) => b - a)

    if (entries.length === 0) {
      return 'Sem dados para sugestões de economia.'
    }

    const topSpending = entries[0]
    return `Categoria com maior gasto: ${topSpending[0]} (R$ ${topSpending[1].toFixed(2)}). Considere revisar seus gastos nesta categoria.`
  }

  clearCache(): void {
    this.cache.clear()
  }

  getCacheStats(): { size: number; entries: number } {
    return {
      size: this.cache.size,
      entries: this.cache.size,
    }
  }

}

export const localAIClient = new LocalAIClient()
