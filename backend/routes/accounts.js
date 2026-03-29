import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// Helper: check if user has access to an account, returns member row or null
async function getAccountAccess(accountId, userId) {
  const [rows] = await pool.query(
    `SELECT am.role, ba.owner_id
     FROM bank_accounts ba
     JOIN account_members am ON am.account_id = ba.id AND am.user_id = ?
     WHERE ba.id = ? AND ba.deleted_at IS NULL`,
    [userId, accountId]
  )
  return rows.length > 0 ? rows[0] : null
}

// Helper: recalculate current_balance for an account
async function recalculateBalance(accountId, conn) {
  const db = conn || pool
  const [accounts] = await db.query(
    'SELECT initial_balance FROM bank_accounts WHERE id = ?',
    [accountId]
  )
  if (accounts.length === 0) return

  const [income] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE account_id = ? AND type = 'income' AND status = 'completed' AND deleted_at IS NULL`,
    [accountId]
  )
  const [expense] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE account_id = ? AND type = 'expense' AND status = 'completed' AND deleted_at IS NULL`,
    [accountId]
  )
  // Transfers out
  const [transferOut] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE account_id = ? AND type = 'transfer' AND status = 'completed' AND deleted_at IS NULL`,
    [accountId]
  )
  // Transfers in (this account is the destination)
  const [transferIn] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE transfer_to_account_id = ? AND type = 'transfer' AND status = 'completed' AND deleted_at IS NULL`,
    [accountId]
  )

  const initial = parseFloat(accounts[0].initial_balance)
  const newBalance =
    initial +
    parseFloat(income[0].total) -
    parseFloat(expense[0].total) -
    parseFloat(transferOut[0].total) +
    parseFloat(transferIn[0].total)

  await db.query(
    'UPDATE bank_accounts SET current_balance = ?, updated_at = NOW() WHERE id = ?',
    [newBalance.toFixed(2), accountId]
  )

  return newBalance
}

export { recalculateBalance }

// GET /api/accounts
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ba.*, am.role AS member_role,
              u.name AS owner_name
       FROM bank_accounts ba
       JOIN account_members am ON am.account_id = ba.id AND am.user_id = ?
       JOIN users u ON u.id = ba.owner_id
       WHERE ba.deleted_at IS NULL
       ORDER BY ba.created_at ASC`,
      [req.userId]
    )
    return res.json({ data: rows })
  } catch (err) {
    console.error('accounts GET error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /api/accounts
router.post('/', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const {
      name,
      type,
      bank_name,
      initial_balance = 0,
      color,
      icon,
      include_in_total = true,
      notes,
    } = req.body

    if (!name || !type) {
      await conn.rollback()
      conn.release()
      return res.status(400).json({ error: 'Nome e tipo são obrigatórios' })
    }

    const [result] = await conn.query(
      `INSERT INTO bank_accounts (owner_id, name, type, bank_name, initial_balance, current_balance, color, icon, include_in_total, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        name,
        type,
        bank_name || null,
        initial_balance,
        initial_balance,
        color || '#7C3AED',
        icon || 'wallet',
        include_in_total,
        notes || null,
      ]
    )

    const accountId = result.insertId

    // Auto-insert owner into account_members
    await conn.query(
      `INSERT INTO account_members (account_id, user_id, role, accepted_at)
       VALUES (?, ?, 'owner', NOW())`,
      [accountId, req.userId]
    )

    await conn.commit()
    conn.release()

    const [accounts] = await pool.query(
      'SELECT * FROM bank_accounts WHERE id = ?',
      [accountId]
    )

    return res.status(201).json({ data: accounts[0] })
  } catch (err) {
    await conn.rollback()
    conn.release()
    console.error('accounts POST error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// PUT /api/accounts/:id
router.put('/:id', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id)
    const access = await getAccountAccess(accountId, req.userId)

    if (!access) {
      return res.status(404).json({ error: 'Conta não encontrada' })
    }
    if (!['owner', 'editor'].includes(access.role)) {
      return res.status(403).json({ error: 'Sem permissão para editar esta conta' })
    }

    const { name, type, bank_name, color, icon, include_in_total, notes, initial_balance } =
      req.body

    const fields = []
    const values = []

    if (name !== undefined) { fields.push('name = ?'); values.push(name) }
    if (type !== undefined) { fields.push('type = ?'); values.push(type) }
    if (bank_name !== undefined) { fields.push('bank_name = ?'); values.push(bank_name) }
    if (color !== undefined) { fields.push('color = ?'); values.push(color) }
    if (icon !== undefined) { fields.push('icon = ?'); values.push(icon) }
    if (include_in_total !== undefined) { fields.push('include_in_total = ?'); values.push(include_in_total) }
    if (notes !== undefined) { fields.push('notes = ?'); values.push(notes) }
    if (initial_balance !== undefined) { fields.push('initial_balance = ?'); values.push(initial_balance) }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    }

    fields.push('updated_at = NOW()')
    values.push(accountId)

    await pool.query(
      `UPDATE bank_accounts SET ${fields.join(', ')} WHERE id = ?`,
      values
    )

    if (initial_balance !== undefined) {
      await recalculateBalance(accountId)
    }

    const [accounts] = await pool.query(
      'SELECT * FROM bank_accounts WHERE id = ?',
      [accountId]
    )

    return res.json({ data: accounts[0] })
  } catch (err) {
    console.error('accounts PUT error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// DELETE /api/accounts/:id
router.delete('/:id', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id)
    const access = await getAccountAccess(accountId, req.userId)

    if (!access) {
      return res.status(404).json({ error: 'Conta não encontrada' })
    }
    if (access.role !== 'owner') {
      return res.status(403).json({ error: 'Somente o dono pode excluir esta conta' })
    }

    await pool.query(
      'UPDATE bank_accounts SET deleted_at = NOW() WHERE id = ?',
      [accountId]
    )

    return res.json({ data: { message: 'Conta excluída com sucesso' } })
  } catch (err) {
    console.error('accounts DELETE error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /api/accounts/:id/recalculate
router.post('/:id/recalculate', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id)
    const access = await getAccountAccess(accountId, req.userId)

    if (!access) {
      return res.status(404).json({ error: 'Conta não encontrada' })
    }
    if (!['owner', 'editor'].includes(access.role)) {
      return res.status(403).json({ error: 'Sem permissão para recalcular esta conta' })
    }

    const newBalance = await recalculateBalance(accountId)

    const [accounts] = await pool.query(
      'SELECT * FROM bank_accounts WHERE id = ?',
      [accountId]
    )

    return res.json({ data: { ...accounts[0], recalculated_balance: newBalance } })
  } catch (err) {
    console.error('accounts recalculate error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
