import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// GET /api/income
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, ba.name AS account_name
       FROM income_sources i
       JOIN bank_accounts ba ON ba.id = i.account_id
       WHERE i.user_id = ? AND i.deleted_at IS NULL
       ORDER BY i.created_at DESC`,
      [req.userId]
    )
    return res.json({ data: rows })
  } catch (err) {
    console.error('income GET error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /api/income
router.post('/', async (req, res) => {
  try {
    const { account_id, name, type, amount, day_of_month, active = true, notes } = req.body

    if (!account_id || !name || !type || !amount || !day_of_month) {
      return res.status(400).json({
        error: 'account_id, name, type, amount e day_of_month são obrigatórios',
      })
    }

    // Verify account belongs to user
    const [accounts] = await pool.query(
      `SELECT id FROM bank_accounts
       WHERE id = ? AND deleted_at IS NULL
       AND (owner_id = ? OR id IN (SELECT account_id FROM account_members WHERE user_id = ?))`,
      [account_id, req.userId, req.userId]
    )
    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Conta não encontrada' })
    }

    const [result] = await pool.query(
      `INSERT INTO income_sources (user_id, account_id, name, type, amount, day_of_month, active, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, account_id, name, type, amount, day_of_month, active, notes || null]
    )

    const [rows] = await pool.query(
      'SELECT * FROM income_sources WHERE id = ?',
      [result.insertId]
    )

    return res.status(201).json({ data: rows[0] })
  } catch (err) {
    console.error('income POST error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// PUT /api/income/:id
router.put('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM income_sources WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [req.params.id, req.userId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Fonte de renda não encontrada' })
    }

    const { account_id, name, type, amount, day_of_month, active, notes } = req.body
    const fields = []
    const values = []

    if (account_id !== undefined) { fields.push('account_id = ?'); values.push(account_id) }
    if (name !== undefined) { fields.push('name = ?'); values.push(name) }
    if (type !== undefined) { fields.push('type = ?'); values.push(type) }
    if (amount !== undefined) { fields.push('amount = ?'); values.push(amount) }
    if (day_of_month !== undefined) { fields.push('day_of_month = ?'); values.push(day_of_month) }
    if (active !== undefined) { fields.push('active = ?'); values.push(active) }
    if (notes !== undefined) { fields.push('notes = ?'); values.push(notes) }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    }

    fields.push('updated_at = NOW()')
    values.push(req.params.id)

    await pool.query(
      `UPDATE income_sources SET ${fields.join(', ')} WHERE id = ?`,
      values
    )

    const [updated] = await pool.query(
      'SELECT * FROM income_sources WHERE id = ?',
      [req.params.id]
    )

    return res.json({ data: updated[0] })
  } catch (err) {
    console.error('income PUT error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// DELETE /api/income/:id
router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id FROM income_sources WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [req.params.id, req.userId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Fonte de renda não encontrada' })
    }

    await pool.query(
      'UPDATE income_sources SET deleted_at = NOW() WHERE id = ?',
      [req.params.id]
    )

    return res.json({ data: { message: 'Fonte de renda excluída com sucesso' } })
  } catch (err) {
    console.error('income DELETE error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
