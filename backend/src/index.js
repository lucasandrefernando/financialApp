import express from 'express'
import cors from 'cors'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const MODEL = 'llama-3.3-70b-versatile'

async function callGroqAPI(prompt, temperature = 0.2, maxTokens = 256) {
  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )
  return response.data.choices[0].message.content
}

// Middleware
app.use(cors())
app.use(express.json())





/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})



/**
 * Endpoint genérico para gerar conteúdo com Groq
 * POST /api/ai/generate
 */
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { prompt, temperature = 0.2, maxTokens = 256 } = req.body

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt é obrigatório' })
    }

    console.log('📤 Enviando requisição para Groq (generate)...')
    const result = await callGroqAPI(prompt, temperature, maxTokens)
    console.log('✅ Resposta recebida do Groq')

    res.json({ success: true, result })
  } catch (error) {
    console.error('❌ Erro ao chamar Groq:',  error.response?.data || error.message)
    
    const statusCode = error.response?.status || 500
    const errorMessage = error.response?.data?.error?.message || error.message || 'Erro desconhecido'

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    })
  }
})

/**
 * Endpoint para gerar insights
 * POST /api/ai/insights
 */
app.post('/api/ai/insights', async (req, res) => {
  try {
    const { data, period = 'monthly' } = req.body

    if (!data) {
      return res.status(400).json({ error: 'Data é obrigatória' })
    }

    console.log('📤 Enviando requisição para gerar insights...')
    
    const prompt = `Analise os seguintes dados financeiros e forneça insights úteis. Período: ${period}. Dados: ${JSON.stringify(data)}`
    const result = await callGroqAPI(prompt, 0.3, 512)
    console.log('✅ Insights gerados com sucesso')

    res.json({ success: true, insights: result })
  } catch (error) {
    console.error('❌ Erro ao gerar insights:',  error.response?.data || error.message)
    
    const statusCode = error.response?.status || 500
    const errorMessage = error.response?.data?.error?.message || error.message || 'Erro desconhecido'

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    })
  }
})

/**
 * Endpoint para detectar anomalias
 * POST /api/ai/anomalies
 */
app.post('/api/ai/anomalies', async (req, res) => {
  try {
    const { transactions } = req.body

    if (!transactions) {
      return res.status(400).json({ error: 'Transações são obrigatórias' })
    }

    console.log('📤 Enviando requisição para detectar anomalias...')
    
    const prompt = `Analise as seguintes transações e identifique possíveis anomalias ou padrões suspeitos: ${JSON.stringify(transactions)}`
    const result = await callGroqAPI(prompt, 0.2, 512)
    console.log('✅ Análise de anomalias concluída')

    res.json({ success: true, anomalies: result })
  } catch (error) {
    console.error('❌ Erro ao detectar anomalias:',  error.response?.data || error.message)
    
    const statusCode = error.response?.status || 500
    const errorMessage = error.response?.data?.error?.message || error.message || 'Erro desconhecido'

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    })
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Erro não tratado:', err)
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`)
  console.log(`📡 Endpoints disponíveis:`)
  console.log(`   - GET  /health`)
  console.log(`   - POST /api/ai/generate`)
})
