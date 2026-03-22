/**
 * Módulo de integração com Groq API
 * Única fonte de IA com tratamento robusto de erro
 */

import { groqClient } from './groq'

// Tipo para os métodos comuns dos clientes de IA
export interface AIClient {
  categorizeTransaction(
    description: string,
    amount: number,
    categories: string[]
  ): Promise<{ category: string; confidence: number; reasoning: string }>
  
  generateInsights(
    transactions: Array<{ description: string; amount: number; category: string }>,
    budget?: Record<string, number>
  ): Promise<string>
  
  detectAnomalies(
    transactions: Array<{ description: string; amount: number; category: string; date: string }>
  ): Promise<string[]>
  
  suggestSavings(categorySpending: Record<string, number>): Promise<string>
  clearCache(): void
  getCacheStats(): { size: number; entries: number }
}

// Factory para criar o cliente de IA correto
export function createAIClient(): AIClient {
  console.log('🚀 Using Groq AI provider')
  return groqClient
}

// Exporta o cliente ativo
export const aiClient = createAIClient()

// Re-exporta os clientes individuais para uso direto se necessário
export { groqClient } from './groq'
export { geminiClient } from './gemini'