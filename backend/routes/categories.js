import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM categories
       WHERE (user_id IS NULL OR user_id = ?) AND deleted_at IS NULL
       ORDER BY is_system DESC, name ASC`,
      [req.userId]
    )
    return res.json({ data: rows })
  } catch (err) {
    console.error('categories GET error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /api/categories
router.post('/', async (req, res) => {
  try {
    const { name, type = 'expense', parent_id, color, icon } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Nome é obrigatório' })
    }

    const [result] = await pool.query(
      `INSERT INTO categories (user_id, name, type, parent_id, color, icon, is_system)
       VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
      [
        req.userId,
        name,
        type,
        parent_id || null,
        color || '#6B7280',
        icon || 'tag',
      ]
    )

    const [rows] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [result.insertId]
    )

    return res.status(201).json({ data: rows[0] })
  } catch (err) {
    console.error('categories POST error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// PUT /api/categories/:id
router.put('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM categories WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [req.params.id, req.userId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada ou não pode ser editada' })
    }

    const { name, type, parent_id, color, icon } = req.body
    const fields = []
    const values = []

    if (name !== undefined) { fields.push('name = ?'); values.push(name) }
    if (type !== undefined) { fields.push('type = ?'); values.push(type) }
    if (parent_id !== undefined) { fields.push('parent_id = ?'); values.push(parent_id || null) }
    if (color !== undefined) { fields.push('color = ?'); values.push(color) }
    if (icon !== undefined) { fields.push('icon = ?'); values.push(icon) }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    }

    values.push(req.params.id)

    await pool.query(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
      values
    )

    const [updated] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [req.params.id]
    )

    return res.json({ data: updated[0] })
  } catch (err) {
    console.error('categories PUT error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id FROM categories WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [req.params.id, req.userId]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada ou não pode ser excluída' })
    }

    await pool.query(
      'UPDATE categories SET deleted_at = NOW() WHERE id = ?',
      [req.params.id]
    )

    return res.json({ data: { message: 'Categoria excluída com sucesso' } })
  } catch (err) {
    console.error('categories DELETE error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
