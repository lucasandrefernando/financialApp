import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { recalculateBalance } from './accounts.js'

const router = Router()
router.use(requireAuth)

// Helper: get account IDs the user has access to
async function getUserAccountIds(userId) {
  const [rows] = await pool.query(
    `SELECT account_id FROM account_members WHERE user_id = ?`,
    [userId]
  )
  return rows.map((r) => r.account_id)
}

// Helper: check access to a specific account
async function hasAccountAccess(userId, accountId) {
  const [rows] = await pool.query(
    `SELECT am.role FROM account_members am
     JOIN bank_accounts ba ON ba.id = am.account_id
     WHERE am.user_id = ? AND am.account_id = ? AND ba.deleted_at IS NULL`,
    [userId, accountId]
  )
  return rows.length > 0 ? rows[0].role : null
}

function parseMoneyValue(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN
  }

  if (typeof value !== 'string') {
    return NaN
  }

  const trimmed = value.trim()
  if (!trimmed) return NaN

  const raw = trimmed.replace(/[^\d,.-]/g, '')
  if (!raw) return NaN

  const lastComma = raw.lastIndexOf(',')
  const lastDot = raw.lastIndexOf('.')
  let normalized = raw

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      normalized = raw.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = raw.replace(/,/g, '')
    }
  } else if (lastComma !== -1) {
    normalized = raw.replace(/\./g, '').replace(',', '.')
  } else if (lastDot !== -1 && /^-?\d{1,3}(?:\.\d{3})+$/.test(raw)) {
    normalized = raw.replace(/\./g, '')
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : NaN
}

const VALID_RECURRING_FREQUENCIES = new Set([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'semiannual',
  'yearly',
])

function toRecurringDayOfMonth(rawValue, fallbackDate) {
  const parsed = Number(rawValue)
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 31) {
    return parsed
  }

  const fallback = new Date(`${fallbackDate}T00:00:00`)
  const day = fallback.getDate()
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : 1
}

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const {
      account_id,
      type,
      category_id,
      status,
      date_from,
      date_to,
      search,
      page = 1,
      limit = 30,
    } = req.query

    const accountIds = await getUserAccountIds(req.userId)
    if (accountIds.length === 0) {
      return res.json({ data: [], total: 0, page: 1, limit: parseInt(limit) })
    }

    const conditions = ['t.deleted_at IS NULL']
    const params = []

    // Filter to accounts user has access to
    if (account_id) {
      if (!accountIds.includes(parseInt(account_id))) {
        return res.status(403).json({ error: 'Sem acesso a esta conta' })
      }
      conditions.push('t.account_id = ?')
      params.push(parseInt(account_id))
    } else {
      conditions.push(`t.account_id IN (${accountIds.map(() => '?').join(',')})`)
      params.push(...accountIds)
    }

    if (type) { conditions.push('t.type = ?'); params.push(type) }
    if (category_id) { conditions.push('t.category_id = ?'); params.push(parseInt(category_id)) }
    if (status) { conditions.push('t.status = ?'); params.push(status) }
    if (date_from) { conditions.push('t.date >= ?'); params.push(date_from) }
    if (date_to) { conditions.push('t.date <= ?'); params.push(date_to) }
    if (search) {
      conditions.push('t.description LIKE ?')
      params.push(`%${search}%`)
    }

    const where = conditions.join(' AND ')
    const offset = (parseInt(page) - 1) * parseInt(limit)

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM transactions t WHERE ${where}`,
      params
    )
    const total = countRows[0].total

    const [rows] = await pool.query(
      `SELECT t.*,
              c.name AS category_name, c.color AS category_color, c.icon AS category_icon,
              ba.name AS account_name,
              ba2.name AS transfer_to_account_name
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN bank_accounts ba ON ba.id = t.account_id
       LEFT JOIN bank_accounts ba2 ON ba2.id = t.transfer_to_account_id
       WHERE ${where}
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    )

    return res.json({
      data: rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    })
  } catch (err) {
    console.error('transactions GET error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/transactions/summary
router.get('/summary', async (req, res) => {
  try {
    const { year, month } = req.query
    const now = new Date()
    const y = parseInt(year) || now.getFullYear()
    const m = parseInt(month) || now.getMonth() + 1

    const dateFrom = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const dateTo = `${y}-${String(m).padStart(2, '0')}-${lastDay}`

    const accountIds = await getUserAccountIds(req.userId)
    if (accountIds.length === 0) {
      return res.json({
        data: {
          income: 0,
          expenses: 0,
          balance: 0,
          opening_balance: 0,
          month_balance: 0,
          savings_rate: 0,
          daily_avg: 0,
          weekly_avg: 0,
          biweekly_avg: 0,
          projected_month_end: 0,
          top_categories: [],
        },
      })
    }

    const accountPlaceholders = accountIds.map(() => '?').join(',')

    const [incomeRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE account_id IN (${accountPlaceholders})
         AND type = 'income' AND status = 'completed'
         AND date BETWEEN ? AND ? AND deleted_at IS NULL`,
      [...accountIds, dateFrom, dateTo]
    )

    const [expenseRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE account_id IN (${accountPlaceholders})
         AND type = 'expense' AND status = 'completed'
         AND date BETWEEN ? AND ? AND deleted_at IS NULL`,
      [...accountIds, dateFrom, dateTo]
    )

    const [openingRows] = await pool.query(
      `SELECT COALESCE(SUM(
          CASE
            WHEN type = 'income' THEN amount
            WHEN type = 'expense' THEN -amount
            ELSE 0
          END
        ), 0) AS total
       FROM transactions
       WHERE account_id IN (${accountPlaceholders})
         AND status = 'completed'
         AND date < ? AND deleted_at IS NULL`,
      [...accountIds, dateFrom]
    )

    const income = parseFloat(incomeRows[0].total)
    const expenses = parseFloat(expenseRows[0].total)
    const opening_balance = parseFloat(openingRows[0].total)
    const month_balance = income - expenses
    const balance = opening_balance + month_balance
    const savings_rate = income > 0 ? ((month_balance / income) * 100).toFixed(1) : 0

    const daysInMonth = lastDay
    const today = now.getDate()
    const daysPassed = Math.min(today, daysInMonth)
    const daily_avg = daysPassed > 0 ? expenses / daysPassed : 0
    const weekly_avg = daily_avg * 7
    const biweekly_avg = daily_avg * 14
    const remainingDays = daysInMonth - today
    const projected_month_end = expenses + daily_avg * Math.max(0, remainingDays)

    const [topCats] = await pool.query(
      `SELECT c.id, c.name, c.color, c.icon, COALESCE(SUM(t.amount), 0) AS total
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.account_id IN (${accountPlaceholders})
         AND t.type = 'expense' AND t.status = 'completed'
         AND t.date BETWEEN ? AND ? AND t.deleted_at IS NULL
       GROUP BY c.id, c.name, c.color, c.icon
       ORDER BY total DESC
       LIMIT 5`,
      [...accountIds, dateFrom, dateTo]
    )

    return res.json({
      data: {
        income,
        expenses,
        balance,
        opening_balance: parseFloat(opening_balance.toFixed(2)),
        month_balance: parseFloat(month_balance.toFixed(2)),
        savings_rate: parseFloat(savings_rate),
        daily_avg: parseFloat(daily_avg.toFixed(2)),
        weekly_avg: parseFloat(weekly_avg.toFixed(2)),
        biweekly_avg: parseFloat(biweekly_avg.toFixed(2)),
        projected_month_end: parseFloat(projected_month_end.toFixed(2)),
        top_categories: topCats,
      },
    })
  } catch (err) {
    console.error('transactions summary error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /api/transactions
router.post('/', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const {
      account_id,
      category_id,
      type,
      description,
      amount,
      date,
      competence_date,
      status = 'completed',
      expense_type,
      is_installment = false,
      installment_total,
      transfer_to_account_id,
      is_recurring = false,
      recurring_id,
      recurring_frequency = 'monthly',
      recurring_day_of_month,
      recurring_start_date,
      recurring_end_date,
      tags,
      notes,
      attachment_url,
    } = req.body

    const parsedAmount = parseMoneyValue(amount)

    if (!account_id || !type || !description || !date || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      await conn.rollback()
      conn.release()
      return res.status(400).json({
        error: 'account_id, type, description, amount e date são obrigatórios',
      })
    }

    const role = await hasAccountAccess(req.userId, account_id)
    if (!role) {
      await conn.rollback()
      conn.release()
      return res.status(403).json({ error: 'Sem acesso a esta conta' })
    }

    if (type === 'transfer') {
      if (is_recurring) {
        await conn.rollback()
        conn.release()
        return res.status(400).json({ error: 'Transferências não podem ser fixas/recorrentes' })
      }
      if (!transfer_to_account_id) {
        await conn.rollback()
        conn.release()
        return res.status(400).json({ error: 'transfer_to_account_id é obrigatório para transferências' })
      }
      const destRole = await hasAccountAccess(req.userId, transfer_to_account_id)
      if (!destRole) {
        await conn.rollback()
        conn.release()
        return res.status(403).json({ error: 'Sem acesso à conta de destino' })
      }
    }

    if (is_recurring && is_installment) {
      await conn.rollback()
      conn.release()
      return res.status(400).json({ error: 'Lançamento fixo não pode ser parcelado' })
    }

    if (is_recurring && !VALID_RECURRING_FREQUENCIES.has(String(recurring_frequency))) {
      await conn.rollback()
      conn.release()
      return res.status(400).json({ error: 'recurring_frequency inválida' })
    }

    let resolvedRecurringId = recurring_id || null
    if (is_recurring) {
      const startDate = recurring_start_date || date
      const endDate = recurring_end_date || null
      const dayOfMonth = toRecurringDayOfMonth(recurring_day_of_month, startDate)

      const [recurringResult] = await conn.query(
        `INSERT INTO recurring_transactions
         (user_id, account_id, category_id, type, description, amount, frequency, day_of_month,
          start_date, end_date, active, tags, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?)`,
        [
          req.userId,
          account_id,
          category_id || null,
          type,
          description,
          parsedAmount,
          recurring_frequency,
          dayOfMonth,
          startDate,
          endDate,
          tags ? JSON.stringify(tags) : null,
          notes || null,
        ]
      )
      resolvedRecurringId = recurringResult.insertId
    }

    const insertedIds = []

    if (is_installment && installment_total && installment_total > 1) {
      const groupId = uuidv4()
      const baseDate = new Date(date + 'T00:00:00')

      for (let i = 1; i <= installment_total; i++) {
        const installDate = new Date(baseDate)
        installDate.setMonth(installDate.getMonth() + (i - 1))
        const installDateStr = installDate.toISOString().split('T')[0]

        const [result] = await conn.query(
          `INSERT INTO transactions
           (user_id, account_id, category_id, type, description, amount, date, competence_date,
            status, expense_type, is_installment, installment_number, installment_total,
            installment_group_id, is_recurring, recurring_id, transfer_to_account_id, tags, notes, attachment_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.userId, account_id, category_id || null, type,
            `${description} (${i}/${installment_total})`,
            parsedAmount, installDateStr, competence_date || null,
            i === 1 ? status : 'scheduled',
            expense_type || null,
            i, installment_total, groupId,
            is_recurring, resolvedRecurringId,
            transfer_to_account_id || null,
            tags ? JSON.stringify(tags) : null,
            notes || null, attachment_url || null,
          ]
        )
        insertedIds.push(result.insertId)
      }
    } else {
      const [result] = await conn.query(
        `INSERT INTO transactions
         (user_id, account_id, category_id, type, description, amount, date, competence_date,
          status, expense_type, is_installment, installment_number, installment_total,
          installment_group_id, is_recurring, recurring_id, transfer_to_account_id, tags, notes, attachment_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.userId, account_id, category_id || null, type,
          description, parsedAmount, date, competence_date || null,
          status, expense_type || null,
          is_installment ? 1 : 0,
          null, null, null,
          is_recurring ? 1 : 0,
          resolvedRecurringId,
          transfer_to_account_id || null,
          tags ? JSON.stringify(tags) : null,
          notes || null, attachment_url || null,
        ]
      )
      insertedIds.push(result.insertId)
    }

    await conn.commit()
    conn.release()

    // Update balances (only for completed transactions)
    if (status === 'completed') {
      await recalculateBalance(account_id)
      if (type === 'transfer' && transfer_to_account_id) {
        await recalculateBalance(transfer_to_account_id)
      }
    }

    const [rows] = await pool.query(
      `SELECT t.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon,
              ba.name AS account_name
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN bank_accounts ba ON ba.id = t.account_id
       WHERE t.id = ?`,
      [insertedIds[0]]
    )

    return res.status(201).json({
      data: rows[0],
      all_ids: insertedIds,
    })
  } catch (err) {
    await conn.rollback()
    conn.release()
    console.error('transactions POST error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// PUT /api/transactions/:id
router.put('/:id', async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT * FROM transactions WHERE id = ? AND deleted_at IS NULL',
      [req.params.id]
    )
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Transacao nao encontrada' })
    }

    const tx = existing[0]
    const role = await hasAccountAccess(req.userId, tx.account_id)
    if (!role || role === 'viewer') {
      return res.status(403).json({ error: 'Sem permissao para editar esta transacao' })
    }

    const {
      account_id,
      transfer_to_account_id,
      category_id, description, amount, date, competence_date,
      status, expense_type, tags, notes, attachment_url,
    } = req.body

    const fields = []
    const values = []
    let nextAccountId = tx.account_id
    let nextTransferAccountId = tx.transfer_to_account_id || null

    if (account_id !== undefined) {
      const parsedAccountId = parseInt(account_id)
      if (!parsedAccountId || Number.isNaN(parsedAccountId)) {
        return res.status(400).json({ error: 'account_id invalido' })
      }

      const nextRole = await hasAccountAccess(req.userId, parsedAccountId)
      if (!nextRole) {
        return res.status(403).json({ error: 'Sem acesso a nova conta informada' })
      }
      if (nextRole === 'viewer') {
        return res.status(403).json({ error: 'Sem permissao para editar nessa conta' })
      }

      nextAccountId = parsedAccountId
      fields.push('account_id = ?')
      values.push(parsedAccountId)
    }

    if (transfer_to_account_id !== undefined) {
      if (tx.type !== 'transfer') {
        return res.status(400).json({ error: 'transfer_to_account_id so e valido para transferencias' })
      }

      const parsedTransferAccountId = parseInt(transfer_to_account_id)
      if (!parsedTransferAccountId || Number.isNaN(parsedTransferAccountId)) {
        return res.status(400).json({ error: 'transfer_to_account_id invalido' })
      }
      if (parsedTransferAccountId === nextAccountId) {
        return res.status(400).json({ error: 'Conta origem e destino devem ser diferentes' })
      }

      const destinationRole = await hasAccountAccess(req.userId, parsedTransferAccountId)
      if (!destinationRole) {
        return res.status(403).json({ error: 'Sem acesso a conta de destino informada' })
      }

      nextTransferAccountId = parsedTransferAccountId
      fields.push('transfer_to_account_id = ?')
      values.push(parsedTransferAccountId)
    }

    if (category_id !== undefined) { fields.push('category_id = ?'); values.push(category_id || null) }
    if (description !== undefined) { fields.push('description = ?'); values.push(description) }
    if (amount !== undefined) {
      const parsedAmount = parseMoneyValue(amount)
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'amount invalido' })
      }
      fields.push('amount = ?')
      values.push(parsedAmount)
    }
    if (date !== undefined) { fields.push('date = ?'); values.push(date) }
    if (competence_date !== undefined) { fields.push('competence_date = ?'); values.push(competence_date || null) }
    if (status !== undefined) { fields.push('status = ?'); values.push(status) }
    if (expense_type !== undefined) { fields.push('expense_type = ?'); values.push(expense_type || null) }
    if (tags !== undefined) {
      fields.push('tags = ?')
      values.push(tags == null ? null : JSON.stringify(tags))
    }
    if (notes !== undefined) { fields.push('notes = ?'); values.push(notes || null) }
    if (attachment_url !== undefined) { fields.push('attachment_url = ?'); values.push(attachment_url || null) }

    if (tx.type === 'transfer' && !nextTransferAccountId) {
      return res.status(400).json({ error: 'Transferencia precisa de conta de destino' })
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    }

    fields.push('updated_at = NOW()')
    values.push(req.params.id)

    await pool.query(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`,
      values
    )

    const affectedAccounts = new Set([tx.account_id, nextAccountId])
    if (tx.transfer_to_account_id) affectedAccounts.add(tx.transfer_to_account_id)
    if (nextTransferAccountId) affectedAccounts.add(nextTransferAccountId)

    for (const accountId of affectedAccounts) {
      await recalculateBalance(accountId)
    }

    const [rows] = await pool.query(
      `SELECT t.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon,
              ba.name AS account_name,
              ba2.name AS transfer_to_account_name
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN bank_accounts ba ON ba.id = t.account_id
       LEFT JOIN bank_accounts ba2 ON ba2.id = t.transfer_to_account_id
       WHERE t.id = ?`,
      [req.params.id]
    )

    return res.json({ data: rows[0] })
  } catch (err) {
    console.error('transactions PUT error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT * FROM transactions WHERE id = ? AND deleted_at IS NULL',
      [req.params.id]
    )
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Transação não encontrada' })
    }

    const tx = existing[0]
    const role = await hasAccountAccess(req.userId, tx.account_id)
    if (!role || role === 'viewer') {
      return res.status(403).json({ error: 'Sem permissão para excluir esta transação' })
    }

    await pool.query(
      'UPDATE transactions SET deleted_at = NOW() WHERE id = ?',
      [req.params.id]
    )

    await recalculateBalance(tx.account_id)
    if (tx.transfer_to_account_id) {
      await recalculateBalance(tx.transfer_to_account_id)
    }

    return res.json({ data: { message: 'Transação excluída com sucesso' } })
  } catch (err) {
    console.error('transactions DELETE error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router

