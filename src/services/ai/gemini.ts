/**
 * Cliente Gemini AI para categorização de transações
 * Integração com Google Gemini API
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent'
// const MODEL = 'gemini-1.5-pro' // Not needed, using API only

interface GeminiRequest {
  contents: {
    parts: {
      text: string
    }[]
  }[]
  generationConfig?: {
    temperature?: number
    topK?: number
    topP?: number
    maxOutputTokens?: number
  }
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string
      }[]
    }
  }[]
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}

export class GeminiClient {
  private apiKey: string | undefined
  private cache: Map<string, { response: string; timestamp: number }> = new Map()
  private cacheTTL: number = (parseInt(import.meta.env.VITE_AI_CACHE_TTL || '3600') || 3600)

  constructor(apiKey?: string) {
    this.apiKey = apiKey || API_KEY
    if (!this.apiKey) {
      console.warn('⚠️ Gemini API key not configured. Using local categorization fallback.')
    }
  }

  /**
   * Envia requisição para Gemini API
   */
  async generateContent(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    // Verifica cache
    const cacheKey = this.getCacheKey(prompt)
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL * 1000) {
      return cached.response
    }

    try {
      if (!this.apiKey) {
        throw new Error('API key not configured')
      }

      const request: GeminiRequest = {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: options?.temperature || 0.2,
          maxOutputTokens: options?.maxTokens || 256,
        },
      }

      const response = await fetch(`${API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`)
      }

      const data: GeminiResponse = await response.json()
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

      // Salva em cache
      this.cache.set(cacheKey, {
        response: result,
        timestamp: Date.now(),
      })

      return result
    } catch (error) {
      console.error('Error calling Gemini API:', error)
      throw error
    }
  }

  /**
   * Categoriza uma transação usando Gemini
   */
  async categorizeTransaction(
    description: string,
    amount: number,
    categories: string[],
  ): Promise<{ category: string; confidence: number; reasoning: string }> {
    const prompt = `You are a transaction categorization expert. Analyze this Brazilian transaction and suggest the best category.

Transaction Description: "${description}"
Amount: R$ ${amount.toFixed(2)}
Available Categories: ${categories.join(', ')}

Respond ONLY with a JSON object (no markdown, no extra text):
{
  "category": "chosen_category",
  "confidence": 0-100,
  "reasoning": "brief explanation in Portuguese"
}

Consider:
- Common Brazilian merchants and services
- Transaction context from the description
- Amount reasonableness for the category
- Return valid categories only from the provided list`

    try {
      const response = await this.generateContent(prompt, { temperature: 0.1, maxTokens: 150 })
      const result = JSON.parse(response)
      return {
        category: result.category || 'outro',
        confidence: Math.min(100, Math.max(0, result.confidence || 50)),
        reasoning: result.reasoning || '',
      }
    } catch (error) {
      console.error('Error categorizing with Gemini:', error)
      throw error
    }
  }

  /**
   * Gera insights financeiros usando Gemini
   */
  async generateInsights(
    transactions: Array<{ description: string; amount: number; category: string }>,
    budget?: Record<string, number>,
  ): Promise<string> {
    const prompt = `Analise estes gastos e gere insights financeiros em português (máximo 3 observações):

Transações:
${transactions
  .slice(0, 10)
  .map((t) => `- ${t.category}: R$ ${t.amount.toFixed(2)} - ${t.description}`)
  .join('\n')}

${budget ? `Limites de Orçamento:\n${Object.entries(budget).map(([cat, limit]) => `- ${cat}: R$ ${limit.toFixed(2)}`).join('\n')}` : 'Sem limites de orçamento definidos'}

Forneça insights acionáveis sobre os padrões de gasto, possíveis economias e advertências se necessário.`

    try {
      return await this.generateContent(prompt, { temperature: 0.7, maxTokens: 300 })
    } catch (error) {
      console.error('Error generating insights:', error)
      return 'Não foi possível gerar insights no momento.'
    }
  }

  /**
   * Detecta padrões de gasto anormais
   */
  async detectAnomalies(transactions: Array<{ description: string; amount: number; category: string; date: string }>): Promise<string[]> {
    const prompt = `Identifique transações suspeitas ou anormais nestas transações brasileiras:

${transactions
  .slice(0, 20)
  .map((t) => `${t.date}: ${t.category} R$ ${t.amount.toFixed(2)} - ${t.description}`)
  .join('\n')}

Retorne APENAS um array JSON com descrições breves de anomalias detectadas:
["anomalia 1", "anomalia 2"]

Se não houver anomalias, retorne [].`

    try {
      const response = await this.generateContent(prompt, { temperature: 0.3, maxTokens: 200 })
      const result = JSON.parse(response)
      return Array.isArray(result) ? result : []
    } catch (error) {
      console.error('Error detecting anomalies:', error)
      return []
    }
  }

  /**
   * Gera sugestões para reduzir despesas
   */
  async suggestSavings(categorySpending: Record<string, number>): Promise<string> {
    const prompt = `Com base nestes gastos mensais brasileiros, sugira 3-5 formas de economizar:

${Object.entries(categorySpending)
  .map(([cat, amount]) => `${cat}: R$ ${amount.toFixed(2)}`)
  .join('\n')}

Respostas em português, breves e acionáveis.`

    try {
      return await this.generateContent(prompt, { temperature: 0.8, maxTokens: 300 })
    } catch (error) {
      console.error('Error suggesting savings:', error)
      return 'Não foi possível gerar sugestões de economia.'
    }
  }

  /**
   * Limpa cache de requisições
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Gera chave para cache
   */
  private getCacheKey(prompt: string): string {
    return `gemini_${prompt.substring(0, 50)}`
  }

  /**
   * Retorna estatísticas de cache
   */
  getCacheStats(): { size: number; entries: number } {
    return {
      size: this.cache.size,
      entries: this.cache.size,
    }
  }
}

// Instância singleton
export const geminiClient = new GeminiClient()