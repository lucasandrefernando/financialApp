import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// GET /api/goals
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.*, ba.name AS account_name
       FROM goals g
       LEFT JOIN bank_accounts ba ON ba.id = g.account_id
       WHERE g.user_id = ? AND g.deleted_at IS NULL
       ORDER BY g.priority ASC, g.created_at DESC`,
      [req.userId]
    )

    // Add progress percentage to each goal
    const goals = rows.map((goal) => {
      const progress =
        goal.target_amount > 0
          ? parseFloat(((goal.current_amount / goal.target_amount) * 100).toFixed(1))
          : 0
      const remaining = parseFloat((goal.target_amount - goal.current_amount).toFixed(2))

      let months_to_goal = null
      if (goal.monthly_contribution && goal.monthly_contribution > 0 && remaining > 0) {
        months_to_goal = Math.ceil(remaining / goal.monthly_contribution)
      }

      return { ...goal, progress, remaining, months_to_goal }
    })

    return res.json({ data: goals })
  } catch (err) {
    console.error('goals GET error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/goals/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT g.*, ba.name AS account_name
       FROM goals g
       LEFT JOIN bank_accounts ba ON ba.id = g.account_id
       WHERE g.id = ? AND g.user_id = ? AND g.deleted_at IS NULL`,
      [req.params.id, req.userId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Meta não encontrada' })
    }

    const goal = rows[0]
    const progress =
      goal.target_amount > 0
        ? parseFloat(((goal.current_amount / goal.target_amount) * 100).toFixed(1))
        : 0

    return res.json({ data: { ...goal, progress } })
  } catch (err) {
    console.error('goals GET/:id error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /api/goals
router.post('/', async (req, res) => {
  try {
    const {
      account_id,
      name,
      description,
      target_amount,
      current_amount = 0,
      monthly_contribution,
      deadline,
      priority = 3,
      status = 'active',
      icon = 'target',
      color = '#4F46E5',
    } = req.body

    if (!name || !target_amount) {
      return res.status(400).json({ error: 'Nome e valor alvo são obrigatórios' })
    }

    const [result] = await pool.query(
      `INSERT INTO goals (user_id, account_id, name, description, target_amount, current_amount,
                         monthly_contribution, deadline, priority, status, icon, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        account_id || null,
        name,
        description || null,
        target_amount,
        current_amount,
        monthly_contribution || null,
        deadline || null,
        priority,
        status,
        icon,
        color,
      ]
    )

    const [rows] = await pool.query(
      'SELECT * FROM goals WHERE id = ?',
      [result.insertId]
    )

    return res.status(201).json({ data: rows[0] })
  } catch (err) {
    console.error('goals POST error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// PUT /api/goals/:id
router.put('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id FROM goals WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [req.params.id, req.userId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Meta não encontrada' })
    }

    const {
      account_id, name, description, target_amount, current_amount,
      monthly_contribution, deadline, priority, status, icon, color,
    } = req.body

    const fields = []
    const values = []

    if (account_id !== undefined) { fields.push('account_id = ?'); values.push(account_id || null) }
    if (name !== undefined) { fields.push('name = ?'); values.push(name) }
    if (description !== undefined) { fields.push('description = ?'); values.push(description || null) }
    if (target_amount !== undefined) { fields.push('target_amount = ?'); values.push(target_amount) }
    if (current_amount !== undefined) { fields.push('current_amount = ?'); values.push(current_amount) }
    if (monthly_contribution !== undefined) { fields.push('monthly_contribution = ?'); values.push(monthly_contribution || null) }
    if (deadline !== undefined) { fields.push('deadline = ?'); values.push(deadline || null) }
    if (priority !== undefined) { fields.push('priority = ?'); values.push(priority) }
    if (status !== undefined) { fields.push('status = ?'); values.push(status) }
    if (icon !== undefined) { fields.push('icon = ?'); values.push(icon) }
    if (color !== undefined) { fields.push('color = ?'); values.push(color) }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    }

    fields.push('updated_at = NOW()')
    values.push(req.params.id)

    await pool.query(
      `UPDATE goals SET ${fields.join(', ')} WHERE id = ?`,
      values
    )

    const [updated] = await pool.query(
      'SELECT * FROM goals WHERE id = ?',
      [req.params.id]
    )

    const goal = updated[0]
    const progress =
      goal.target_amount > 0
        ? parseFloat(((goal.current_amount / goal.target_amount) * 100).toFixed(1))
        : 0

    return res.json({ data: { ...goal, progress } })
  } catch (err) {
    console.error('goals PUT error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// DELETE /api/goals/:id
router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id FROM goals WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [req.params.id, req.userId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Meta não encontrada' })
    }

    await pool.query(
      'UPDATE goals SET deleted_at = NOW() WHERE id = ?',
      [req.params.id]
    )

    return res.json({ data: { message: 'Meta excluída com sucesso' } })
  } catch (err) {
    console.error('goals DELETE error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
