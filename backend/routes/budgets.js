import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// Helper: get current spending for a budget's period
async function getCurrentSpending(userId, categoryId, period) {
  const now = new Date()
  let dateFrom, dateTo

  if (period === 'monthly') {
    dateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    dateTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`
  } else if (period === 'weekly') {
    const day = now.getDay()
    const start = new Date(now)
    start.setDate(now.getDate() - day)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    dateFrom = start.toISOString().split('T')[0]
    dateTo = end.toISOString().split('T')[0]
  } else if (period === 'yearly') {
    dateFrom = `${now.getFullYear()}-01-01`
    dateTo = `${now.getFullYear()}-12-31`
  }

  // Get accounts user has access to
  const [accountRows] = await pool.query(
    'SELECT account_id FROM account_members WHERE user_id = ?',
    [userId]
  )
  const accountIds = accountRows.map((r) => r.account_id)
  if (accountIds.length === 0) return 0

  const placeholders = accountIds.map(() => '?').join(',')

  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE category_id = ?
       AND account_id IN (${placeholders})
       AND type = 'expense'
       AND status = 'completed'
       AND date BETWEEN ? AND ?
       AND deleted_at IS NULL`,
    [categoryId, ...accountIds, dateFrom, dateTo]
  )

  return parseFloat(rows[0].total)
}

// GET /api/budgets
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.user_id = ? AND b.deleted_at IS NULL AND b.active = TRUE
       ORDER BY b.created_at DESC`,
      [req.userId]
    )

    // Add current spending to each budget
    const budgets = await Promise.all(
      rows.map(async (budget) => {
        const spent = await getCurrentSpending(req.userId, budget.category_id, budget.period)
        const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
        return {
          ...budget,
          spent,
          percentage: parseFloat(percentage.toFixed(1)),
          remaining: parseFloat((budget.amount - spent).toFixed(2)),
          is_over_threshold: percentage >= budget.alert_threshold,
          is_over_budget: spent > budget.amount,
        }
      })
    )

    return res.json({ data: budgets })
  } catch (err) {
    console.error('budgets GET error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /api/budgets
router.post('/', async (req, res) => {
  try {
    const { category_id, amount, period = 'monthly', alert_threshold = 80 } = req.body

    if (!category_id || !amount) {
      return res.status(400).json({ error: 'category_id e amount são obrigatórios' })
    }

    // Check if budget already exists for this category/period
    const [existing] = await pool.query(
      'SELECT id FROM budgets WHERE user_id = ? AND category_id = ? AND period = ? AND deleted_at IS NULL',
      [req.userId, category_id, period]
    )
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Já existe um orçamento para esta categoria e período' })
    }

    const [result] = await pool.query(
      `INSERT INTO budgets (user_id, category_id, amount, period, alert_threshold)
       VALUES (?, ?, ?, ?, ?)`,
      [req.userId, category_id, amount, period, alert_threshold]
    )

    const [rows] = await pool.query(
      `SELECT b.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.id = ?`,
      [result.insertId]
    )

    const spent = await getCurrentSpending(req.userId, category_id, period)
    const percentage = amount > 0 ? (spent / amount) * 100 : 0

    return res.status(201).json({
      data: {
        ...rows[0],
        spent,
        percentage: parseFloat(percentage.toFixed(1)),
        remaining: parseFloat((amount - spent).toFixed(2)),
        is_over_threshold: percentage >= alert_threshold,
        is_over_budget: spent > amount,
      },
    })
  } catch (err) {
    console.error('budgets POST error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// PUT /api/budgets/:id
router.put('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM budgets WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [req.params.id, req.userId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Orçamento não encontrado' })
    }

    const { amount, period, alert_threshold, active } = req.body
    const fields = []
    const values = []

    if (amount !== undefined) { fields.push('amount = ?'); values.push(amount) }
    if (period !== undefined) { fields.push('period = ?'); values.push(period) }
    if (alert_threshold !== undefined) { fields.push('alert_threshold = ?'); values.push(alert_threshold) }
    if (active !== undefined) { fields.push('active = ?'); values.push(active) }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    }

    fields.push('updated_at = NOW()')
    values.push(req.params.id)

    await pool.query(
      `UPDATE budgets SET ${fields.join(', ')} WHERE id = ?`,
      values
    )

    const [updated] = await pool.query(
      `SELECT b.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.id = ?`,
      [req.params.id]
    )

    const budget = updated[0]
    const spent = await getCurrentSpending(req.userId, budget.category_id, budget.period)
    const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

    return res.json({
      data: {
        ...budget,
        spent,
        percentage: parseFloat(percentage.toFixed(1)),
        remaining: parseFloat((budget.amount - spent).toFixed(2)),
        is_over_threshold: percentage >= budget.alert_threshold,
        is_over_budget: spent > budget.amount,
      },
    })
  } catch (err) {
    console.error('budgets PUT error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// DELETE /api/budgets/:id
router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id FROM budgets WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [req.params.id, req.userId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Orçamento não encontrado' })
    }

    await pool.query(
      'UPDATE budgets SET deleted_at = NOW() WHERE id = ?',
      [req.params.id]
    )

    return res.json({ data: { message: 'Orçamento excluído com sucesso' } })
  } catch (err) {
    console.error('budgets DELETE error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
