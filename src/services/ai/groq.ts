/**
 * Cliente Groq AI para categorização de transações
 * Integração com Groq API usando fetch (seguro para browser)
 */

const API_KEY = import.meta.env.VITE_GROQ_API_KEY?.trim()
const API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000' // URL do backend local
const MODEL = 'llama-3.3-70b-versatile' // Modelo rápido e eficiente
const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true' // Flag para usar backend

interface GroqRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  model: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

interface GroqResponse {
  choices: Array<{
    message: {
      content: string
      role: string
    }
    finish_reason: string
    index: number
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class GroqClient {
  private apiKey: string | undefined
  private cache: Map<string, { response: string; timestamp: number }> = new Map()
  private cacheTTL: number = (parseInt(import.meta.env.VITE_AI_CACHE_TTL || '3600') || 3600)

  constructor(apiKey?: string) {
    this.apiKey = apiKey || API_KEY
    if (!this.apiKey) {
      console.error('❌ ERRO: Chave do Groq API não configurada!')
      console.error('Configure VITE_GROQ_API_KEY no seu arquivo .env.local')
    }
  }

  /**
   * Envia requisição para o backend que faz proxy ao Groq ou direto à API Groq
   */
  async generateContent(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    // Verifica cache
    const cacheKey = this.getCacheKey(prompt)
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL * 1000) {
      return cached.response
    }

    try {
      let result: string

      if (USE_BACKEND) {
        // Usar backend local como proxy
        console.log('📡 Enviando ao backend local:', BACKEND_URL)
        const response = await fetch(`${BACKEND_URL}/api/ai/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            temperature: options?.temperature || 0.2,
            maxTokens: options?.maxTokens || 256,
          }),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
          throw new Error(`Backend error: ${error.error?.message || response.statusText}`)
        }

        const data = await response.json()
        result = data.result || ''
      } else {
        // Chamar Groq API diretamente
        if (!this.apiKey) {
          throw new Error('Chave Groq API não configurada. Configure VITE_GROQ_API_KEY no .env.local')
        }

        console.log('🤖 Chamando Groq API diretamente')
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            model: MODEL,
            temperature: options?.temperature || 0.2,
            max_tokens: options?.maxTokens || 256,
            stream: false,
          } as GroqRequest),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
          throw new Error(`Groq API error: ${error.error?.message || response.statusText}`)
        }

        const data = (await response.json()) as GroqResponse
        result = data.choices?.[0]?.message?.content || ''
      }

      // Salva em cache
      this.cache.set(cacheKey, {
        response: result,
        timestamp: Date.now(),
      })

      return result
    } catch (error) {
      console.error('Error generating content:', error)
      throw error
    }
  }

  /**
   * Categoriza uma transação usando Groq
   */
  async categorizeTransaction(
    description: string,
    amount: number,
    categories: string[],
  ): Promise<{ category: string; confidence: number; reasoning: string }> {
    const prompt = `Você é um especialista em categorização de transações financeiras brasileiras. Analise esta transação e sugira a melhor categoria.

Transação: "${description}"
Valor: R$ ${Number(amount).toFixed(2)}
Categorias disponíveis: ${categories.join(', ')}

Responda APENAS com um objeto JSON (sem markdown, sem texto extra):
{
  "category": "categoria_escolhida",
  "confidence": 0-100,
  "reasoning": "breve explicação em português"
}

Considere:
- Comerciantes e serviços comuns no Brasil
- Contexto da transação pela descrição
- Valor razoável para a categoria
- Retorne apenas categorias válidas da lista fornecida`

    try {
      const response = await this.generateContent(prompt, { temperature: 0.1, maxTokens: 150 })
      const result = JSON.parse(response)
      return {
        category: result.category || 'outro',
        confidence: Math.min(100, Math.max(0, result.confidence || 50)),
        reasoning: result.reasoning || '',
      }
    } catch (error) {
      console.error('Error categorizing with Groq:', error)
      throw error
    }
  }

  /**
   * Gera insights financeiros usando Groq
   */
  async generateInsights(
    transactions: Array<{ description: string; amount: number; category: string }>,
    budget?: Record<string, number>,
  ): Promise<string> {
    const prompt = `Analise estes gastos mensais e gere insights financeiros em português (máximo 3 observações):

Gastos:
${transactions
  .slice(0, 10)
  .map((t) => `- ${t.category}: R$ ${t.amount.toFixed(2)} - ${t.description}`)
  .join('\n')}

${budget ? `Limites do Orçamento:\n${Object.entries(budget).map(([cat, limit]) => `- ${cat}: R$ ${limit.toFixed(2)}`).join('\n')}` : 'Sem limites de orçamento definidos'}

Forneça insights práticos sobre:
1. Padrões de gasto identificados
2. Oportunidades de economia
3. Alertas se houver gastos fora do normal`

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
    const prompt = `Identifique transações suspeitas ou anormais nestas transações financeiras brasileiras:

${transactions
  .slice(0, 20)
  .map((t) => `${t.date}: ${t.category} R$ ${t.amount.toFixed(2)} - ${t.description}`)
  .join('\n')}

Analise e retorne APENAS um array JSON com descrições breves das anomalias detectadas:
["anomalia 1", "anomalia 2"]

Se não houver anomalias, retorne [].

Considere:
- Valores muito altos ou muito baixos para a categoria
- Transações em horários incomuns
- Descrições suspeitas`

    try {
      const response = await this.generateContent(prompt, { temperature: 0.3, maxTokens: 200 })
      const match = response.match(/\[[\s\S]*\]/)
      const result = match ? JSON.parse(match[0]) : []
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
    const prompt = `Com base nestes gastos mensais brasileiros, sugira 3-5 formas práticas de economizar dinheiro:

${Object.entries(categorySpending)
  .map(([cat, amount]) => `${cat}: R$ ${amount.toFixed(2)}`)
  .join('\n')}

Forneça sugestões específicas e acionáveis em português, considerando o contexto brasileiro e hábitos de consumo.`

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
    return `groq_${prompt.substring(0, 50)}`
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
export const groqClient = new GroqClient()