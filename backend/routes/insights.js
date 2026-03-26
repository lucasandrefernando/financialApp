import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const MOCK_INSIGHTS = [
  {
    id: 'mock-1',
    type: 'tip',
    title: 'Controle seus gastos com alimentação',
    message:
      'Gastos com alimentação costumam representar uma grande parte do orçamento. Considere planejar refeições semanais e cozinhar em casa com mais frequência para economizar.',
    icon: 'utensils',
    color: '#EF4444',
  },
  {
    id: 'mock-2',
    type: 'insight',
    title: 'A importância da reserva de emergência',
    message:
      'Especialistas recomendam ter entre 3 a 6 meses de despesas guardados como reserva de emergência. Isso protege você de imprevistos sem precisar recorrer a empréstimos.',
    icon: 'shield',
    color: '#10B981',
  },
  {
    id: 'mock-3',
    type: 'goal',
    title: 'Defina metas financeiras claras',
    message:
      'Metas financeiras específicas e mensuráveis aumentam a chance de sucesso. Tente dividir grandes objetivos em marcos menores e acompanhe seu progresso regularmente.',
    icon: 'target',
    color: '#4F46E5',
  },
]

// GET /api/insights
router.get('/', async (req, res) => {
  try {
    const userId = req.userId
    const GROQ_API_KEY = process.env.GROQ_API_KEY

    // Gather last 30 days of transaction data for context
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const dateFrom = thirtyDaysAgo.toISOString().split('T')[0]
    const dateTo = now.toISOString().split('T')[0]

    const [accountRows] = await pool.query(
      'SELECT account_id FROM account_members WHERE user_id = ?',
      [userId]
    )
    const accountIds = accountRows.map((r) => r.account_id)

    if (accountIds.length === 0) {
      return res.json({ data: [{ id: 'p-0', type: 'tip', title: 'Cadastre uma conta bancária', message: 'Para receber insights personalizados, cadastre suas contas bancárias e registre suas movimentações financeiras.', icon: 'wallet', color: '#4F46E5' }], source: 'personalized' })
    }

    const placeholders = accountIds.map(() => '?').join(',')

    const [incomeRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE account_id IN (${placeholders})
         AND type = 'income' AND status = 'completed'
         AND date BETWEEN ? AND ? AND deleted_at IS NULL`,
      [...accountIds, dateFrom, dateTo]
    )

    const [expenseRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE account_id IN (${placeholders})
         AND type = 'expense' AND status = 'completed'
         AND date BETWEEN ? AND ? AND deleted_at IS NULL`,
      [...accountIds, dateFrom, dateTo]
    )

    const [topCats] = await pool.query(
      `SELECT c.name, COALESCE(SUM(t.amount), 0) AS total
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.account_id IN (${placeholders})
         AND t.type = 'expense' AND t.status = 'completed'
         AND t.date BETWEEN ? AND ? AND t.deleted_at IS NULL
       GROUP BY c.name
       ORDER BY total DESC
       LIMIT 5`,
      [...accountIds, dateFrom, dateTo]
    )

    const income = parseFloat(incomeRows[0].total)
    const expenses = parseFloat(expenseRows[0].total)
    const savings = income - expenses
    const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : 0
    const topCategory = topCats[0]

    const fmt = (v) => `R$ ${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

    // Generate personalized insights based on real data even without Groq
    const personalizedMock = []

    if (income === 0 && expenses === 0) {
      personalizedMock.push({
        id: 'p-1', type: 'tip',
        title: 'Comece registrando suas movimentações',
        message: 'Você ainda não tem lançamentos no período. Registre suas receitas e despesas para receber análises personalizadas do seu perfil financeiro.',
        icon: 'plus-circle', color: '#4F46E5',
      })
    } else {
      if (parseFloat(savingsRate) < 10 && income > 0) {
        personalizedMock.push({
          id: 'p-1', type: 'alert',
          title: `Taxa de poupança baixa: ${savingsRate}%`,
          message: `Suas despesas (${fmt(expenses)}) consumiram ${(100 - parseFloat(savingsRate)).toFixed(0)}% da sua receita (${fmt(income)}). O ideal é poupar pelo menos 20% do que você ganha. Revise seus gastos variáveis.`,
          icon: 'alert-triangle', color: '#EF4444',
        })
      } else if (parseFloat(savingsRate) >= 20) {
        personalizedMock.push({
          id: 'p-1', type: 'success',
          title: `Ótima taxa de poupança: ${savingsRate}%`,
          message: `Parabéns! Você está poupando ${fmt(savings)} dos seus ${fmt(income)} de receita. Continue assim e considere investir o excedente para fazer seu dinheiro trabalhar por você.`,
          icon: 'trending-up', color: '#10B981',
        })
      } else {
        personalizedMock.push({
          id: 'p-1', type: 'insight',
          title: `Você poupou ${fmt(savings)} esse período`,
          message: `Com receitas de ${fmt(income)} e despesas de ${fmt(expenses)}, sua taxa de poupança foi de ${savingsRate}%. Tente aumentar para 20% reduzindo gastos variáveis.`,
          icon: 'piggy-bank', color: '#4F46E5',
        })
      }

      if (topCategory) {
        const catPct = income > 0 ? ((parseFloat(topCategory.total) / income) * 100).toFixed(0) : 0
        personalizedMock.push({
          id: 'p-2', type: 'tip',
          title: `${topCategory.name} é seu maior gasto`,
          message: `Você gastou ${fmt(topCategory.total)} em ${topCategory.name} nos últimos 30 dias, representando ${catPct}% da sua receita. Analise se há oportunidade de redução nessa categoria.`,
          icon: 'pie-chart', color: '#F97316',
        })
      }

      if (savings < 0) {
        personalizedMock.push({
          id: 'p-3', type: 'alert',
          title: 'Gastos maiores que receitas',
          message: `Você gastou ${fmt(Math.abs(savings))} a mais do que recebeu. Isso indica um déficit financeiro. Identifique e corte gastos não essenciais imediatamente.`,
          icon: 'alert-circle', color: '#EF4444',
        })
      } else {
        personalizedMock.push({
          id: 'p-3', type: 'goal',
          title: 'Construa sua reserva de emergência',
          message: `Com um saldo positivo de ${fmt(savings)}, você pode direcionar parte disso para uma reserva de emergência de 6 meses de despesas (${fmt(expenses * 6)}). Considere uma conta de rendimento automático.`,
          icon: 'shield', color: '#10B981',
        })
      }
    }

    if (!GROQ_API_KEY) {
      return res.json({ data: personalizedMock, source: 'personalized' })
    }

    const categorySummary = topCats.map((c) => `${c.name}: ${fmt(c.total)}`).join(', ')

    const prompt = `Você é um consultor financeiro pessoal brasileiro especializado. Analise os dados financeiros dos últimos 30 dias e forneça exatamente 3 insights altamente personalizados e acionáveis em português brasileiro.

DADOS REAIS DO USUÁRIO:
- Receita total: ${fmt(income)}
- Despesa total: ${fmt(expenses)}
- Saldo: ${fmt(savings)}
- Taxa de poupança: ${savingsRate}%
- Top gastos por categoria: ${categorySummary || 'sem dados ainda'}

INSTRUÇÕES:
- Seja específico com os valores reais acima
- Dê conselhos práticos e acionáveis
- Se os gastos forem maiores que a receita, alerte
- Se a poupança for baixa (<20%), sugira formas de reduzir gastos
- Mencione categorias específicas quando relevante
- Tom: amigável, direto, motivador

Responda APENAS com JSON válido (sem markdown, sem texto fora do JSON):
[{"id":"i1","type":"tip","title":"título curto","message":"mensagem detalhada","icon":"lucide-icon","color":"#hex"},{"id":"i2","type":"insight","title":"título curto","message":"mensagem detalhada","icon":"lucide-icon","color":"#hex"},{"id":"i3","type":"goal","title":"título curto","message":"mensagem detalhada","icon":"lucide-icon","color":"#hex"}]`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 1200,
      }),
    })

    if (!response.ok) {
      return res.json({ data: personalizedMock, source: 'personalized' })
    }

    const groqData = await response.json()
    const content = groqData.choices?.[0]?.message?.content?.trim()

    if (!content) return res.json({ data: personalizedMock, source: 'personalized' })

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      const insights = JSON.parse(jsonMatch ? jsonMatch[0] : content)
      return res.json({ data: insights, source: 'ai' })
    } catch {
      return res.json({ data: personalizedMock, source: 'personalized' })
    }
  } catch (err) {
    console.error('insights error', err)
    return res.json({ data: MOCK_INSIGHTS, source: 'mock' })
  }
})

export default router
