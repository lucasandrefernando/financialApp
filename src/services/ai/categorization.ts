/**
 * Serviço de Categorização de Transações
 * Combina API Gemini com fallback de padrões locais
 */

import { aiClient } from './index'

const AI_PROVIDER = import.meta.env.VITE_AI_PROVIDER || 'groq'
import { detectCategoryByPattern, categoryPatterns, commonMerchants } from '../../utils/categoryPatterns'
import { normalizeDescription, extractKeywords, calculateSimilarity, extractMerchant } from '../../utils/textProcessing'

export interface CategorizationResult {
  category: string
  confidence: number
  source: 'gemini' | 'groq' | 'pattern' | 'merchant' | 'similarity'
  reasoning: string
}

export interface TransactionSuggestion {
  transactionId: string
  suggestedCategory: string
  confidence: number
  alternatives: { category: string; confidence: number }[]
  reasoning: string
}

// Cache de categorias para transações similares
const categorizationCache = new Map<string, CategorizationResult>()
const CACHE_TTL = 86400000 // 24 horas

class CategorizationService {
  private availableCategories = Object.keys(categoryPatterns)
  private aiEnabled = !!import.meta.env.VITE_GROQ_API_KEY || !!import.meta.env.VITE_GEMINI_API_KEY

  /**
   * Categoriza uma transação usando múltiplas estratégias
   */
  async categorizeTransaction(description: string, amount?: number): Promise<CategorizationResult> {
    const cacheKey = this.getCacheKey(description)
    const cached = categorizationCache.get(cacheKey)

    if (cached) {
      return cached
    }

    let result: CategorizationResult | null = null

    // Estratégia 1: Detectar merchant conhecido
    const merchant = extractMerchant(description)
    if (merchant && commonMerchants[merchant.toLowerCase()]) {
      result = {
        category: commonMerchants[merchant.toLowerCase()],
        confidence: 95,
        source: 'merchant',
        reasoning: `Merchant conhecido: ${merchant}`,
      }
    }

    // Estratégia 2: Padrões locais
    if (!result) {
      const patternMatch = detectCategoryByPattern(description)
      if (patternMatch && patternMatch.confidence > 70) {
        result = {
          category: patternMatch.category,
          confidence: patternMatch.confidence,
          source: 'pattern',
          reasoning: `Detectado por padrões: ${patternMatch.category}`,
        }
      }
    }

    // Estratégia 3: AI Provider (Groq/Gemini) (se disponível e confiança baixa)
    if (!result && this.aiEnabled) {
      try {
        const aiResult = await aiClient.categorizeTransaction(description, amount || 0, this.availableCategories)

        if (aiResult.confidence > 60) {
          result = {
            category: aiResult.category,
            confidence: aiResult.confidence,
            source: AI_PROVIDER === 'groq' ? 'groq' : 'gemini',
            reasoning: aiResult.reasoning,
          }
        }
      } catch (error) {
        console.warn(`${AI_PROVIDER} categorization failed, using pattern fallback:`, error)
      }
    }

    // Estratégia 4: Busca por similaridade com histórico
    if (!result) {
      const similar = await this.findSimilarTransactions(description)
      if (similar) {
        result = {
          category: similar.category,
          confidence: similar.confidence * 0.8, // Reduz confiança por ser baseado em histórico
          source: 'similarity',
          reasoning: similar.reasoning,
        }
      }
    }

    // Fallback: categoria padrão
    if (!result) {
      result = {
        category: 'outro',
        confidence: 20,
        source: 'pattern',
        reasoning: 'Categoria padrão - não foi possível categorizar com certeza',
      }
    }

    // Salva em cache
    categorizationCache.set(cacheKey, result)
    setTimeout(() => categorizationCache.delete(cacheKey), CACHE_TTL)

    return result
  }

  /**
   * Sugere categorias para múltiplas transações
   */
  async suggestCategoriesForBatch(transactions: Array<{ id: string; description: string; amount: number }>): Promise<TransactionSuggestion[]> {
    const suggestions = await Promise.all(
      transactions.map(async (transaction) => {
        const categorization = await this.categorizeTransaction(transaction.description, transaction.amount)

        // Gera alternativas
        const alternatives = this.getAlternativeCategories(transaction.description, categorization.category)

        return {
          transactionId: transaction.id,
          suggestedCategory: categorization.category,
          confidence: categorization.confidence,
          alternatives: alternatives.map((cat) => ({
            category: cat,
            confidence: 30 + Math.random() * 20, // Placeholder, poderia ser mais sofisticado
          })),
          reasoning: categorization.reasoning,
        }
      }),
    )

    return suggestions
  }

  /**
   * Encontra transações similares no histórico (simulado)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async findSimilarTransactions(_description: string): Promise<{ category: string; confidence: number; reasoning: string } | null> {
    // Isso seria implementado com banco de dados real
    // Por enquanto, retorna null para usar outros métodos
    return null
  }

  /**
   * Retorna categorias alternativas para uma transação
   */
  private getAlternativeCategories(description: string, mainCategory: string): string[] {
    const keywords = extractKeywords(description)
    const alternatives: string[] = []

    // Encontra categorias que compartilham keywords
    for (const [category, patterns] of Object.entries(categoryPatterns)) {
      if (category === mainCategory) continue

      const matchCount = keywords.filter((kw) => patterns.keywords.some((pk) => calculateSimilarity(kw, pk) > 0.6)).length

      if (matchCount > 0) {
        alternatives.push(category)
      }
    }

    return alternatives.slice(0, 3)
  }

  /**
   * Aprende com feedback do usuário
   * (Seria armazenado em banco de dados em produção)
   */
  recordFeedback(description: string, userCategory: string, confidence: number): void {
    // Implementação: atualizar modelo local ou enviar feedback para retreinamento
    console.log(`📝 Feedback registered: "${description}" → ${userCategory} (confidence: ${confidence})`)
  }

  /**
   * Gera relatório de confiança de categorização
   */
  getConfidenceReport(): {
    totalCategorized: number
    averageConfidence: number
    sourceBreakdown: Record<string, number>
  } {
    const total = categorizationCache.size
    let totalConfidence = 0
    const sourceCount: Record<string, number> = {}

    categorizationCache.forEach((result) => {
      totalConfidence += result.confidence
      sourceCount[result.source] = (sourceCount[result.source] || 0) + 1
    })

    return {
      totalCategorized: total,
      averageConfidence: total > 0 ? totalConfidence / total : 0,
      sourceBreakdown: sourceCount,
    }
  }

  /**
   * Limpa cache de categorização
   */
  clearCache(): void {
    categorizationCache.clear()
  }

  /**
   * Gera chave de cache
   */
  private getCacheKey(description: string): string {
    return normalizeDescription(description).substring(0, 100)
  }
}

export const categorizationService = new CategorizationService()