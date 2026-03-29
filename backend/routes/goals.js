import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

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

function parseNullableMoney(value) {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const parsed = parseMoneyValue(value)
  return Number.isFinite(parsed) ? parsed : NaN
}

function normalizeGoalRow(goal) {
  const target = Number(goal.target_amount || 0)
  const current = Number(goal.current_amount || 0)
  const monthlyContribution = goal.monthly_contribution == null ? null : Number(goal.monthly_contribution)
  const safeTarget = Number.isFinite(target) ? target : 0
  const safeCurrent = Number.isFinite(current) ? current : 0
  const percentage = safeTarget > 0 ? Math.min((safeCurrent / safeTarget) * 100, 999) : 0
  const remaining = Math.max(safeTarget - safeCurrent, 0)

  let months_to_goal = null
  if (monthlyContribution && monthlyContribution > 0 && remaining > 0) {
    months_to_goal = Math.ceil(remaining / monthlyContribution)
  }

  return {
    ...goal,
    target_amount: parseFloat(safeTarget.toFixed(2)),
    current_amount: parseFloat(safeCurrent.toFixed(2)),
    monthly_contribution:
      monthlyContribution == null || !Number.isFinite(monthlyContribution)
        ? null
        : parseFloat(monthlyContribution.toFixed(2)),
    percentage: parseFloat(percentage.toFixed(1)),
    progress: parseFloat(percentage.toFixed(1)),
    remaining: parseFloat(remaining.toFixed(2)),
    months_to_goal,
  }
}

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

    return res.json({ data: rows.map(normalizeGoalRow) })
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
      return res.status(404).json({ error: 'Meta nao encontrada' })
    }

    return res.json({ data: normalizeGoalRow(rows[0]) })
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
      color = '#7C3AED',
    } = req.body

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Nome da meta e obrigatorio' })
    }

    const parsedTarget = parseMoneyValue(target_amount)
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      return res.status(400).json({ error: 'Valor alvo invalido' })
    }

    const parsedCurrent = parseMoneyValue(current_amount)
    if (!Number.isFinite(parsedCurrent) || parsedCurrent < 0) {
      return res.status(400).json({ error: 'Valor atual invalido' })
    }

    const parsedMonthlyContribution = parseNullableMoney(monthly_contribution)
    if (Number.isNaN(parsedMonthlyContribution) || (parsedMonthlyContribution != null && parsedMonthlyContribution < 0)) {
      return res.status(400).json({ error: 'Contribuicao mensal invalida' })
    }

    const parsedPriority = Number(priority)
    const safePriority = Number.isInteger(parsedPriority) && parsedPriority >= 1 && parsedPriority <= 5 ? parsedPriority : 3

    const [result] = await pool.query(
      `INSERT INTO goals (user_id, account_id, name, description, target_amount, current_amount,
                         monthly_contribution, deadline, priority, status, icon, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        account_id || null,
        String(name).trim(),
        description || null,
        parsedTarget,
        parsedCurrent,
        parsedMonthlyContribution,
        deadline || null,
        safePriority,
        status,
        icon,
        color,
      ]
    )

    const [rows] = await pool.query('SELECT * FROM goals WHERE id = ?', [result.insertId])
    return res.status(201).json({ data: normalizeGoalRow(rows[0]) })
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
      return res.status(404).json({ error: 'Meta nao encontrada' })
    }

    const {
      account_id,
      name,
      description,
      target_amount,
      current_amount,
      monthly_contribution,
      deadline,
      priority,
      status,
      icon,
      color,
    } = req.body

    const fields = []
    const values = []

    if (account_id !== undefined) {
      fields.push('account_id = ?')
      values.push(account_id || null)
    }

    if (name !== undefined) {
      const normalizedName = String(name || '').trim()
      if (!normalizedName) return res.status(400).json({ error: 'Nome da meta e obrigatorio' })
      fields.push('name = ?')
      values.push(normalizedName)
    }

    if (description !== undefined) {
      fields.push('description = ?')
      values.push(description || null)
    }

    if (target_amount !== undefined) {
      const parsedTarget = parseMoneyValue(target_amount)
      if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
        return res.status(400).json({ error: 'Valor alvo invalido' })
      }
      fields.push('target_amount = ?')
      values.push(parsedTarget)
    }

    if (current_amount !== undefined) {
      const parsedCurrent = parseMoneyValue(current_amount)
      if (!Number.isFinite(parsedCurrent) || parsedCurrent < 0) {
        return res.status(400).json({ error: 'Valor atual invalido' })
      }
      fields.push('current_amount = ?')
      values.push(parsedCurrent)
    }

    if (monthly_contribution !== undefined) {
      const parsedMonthlyContribution = parseNullableMoney(monthly_contribution)
      if (Number.isNaN(parsedMonthlyContribution) || (parsedMonthlyContribution != null && parsedMonthlyContribution < 0)) {
        return res.status(400).json({ error: 'Contribuicao mensal invalida' })
      }
      fields.push('monthly_contribution = ?')
      values.push(parsedMonthlyContribution)
    }

    if (deadline !== undefined) {
      fields.push('deadline = ?')
      values.push(deadline || null)
    }

    if (priority !== undefined) {
      const parsedPriority = Number(priority)
      if (!Number.isInteger(parsedPriority) || parsedPriority < 1 || parsedPriority > 5) {
        return res.status(400).json({ error: 'Prioridade invalida' })
      }
      fields.push('priority = ?')
      values.push(parsedPriority)
    }

    if (status !== undefined) {
      fields.push('status = ?')
      values.push(status)
    }

    if (icon !== undefined) {
      fields.push('icon = ?')
      values.push(icon)
    }

    if (color !== undefined) {
      fields.push('color = ?')
      values.push(color)
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    }

    fields.push('updated_at = NOW()')
    values.push(req.params.id)

    await pool.query(`UPDATE goals SET ${fields.join(', ')} WHERE id = ?`, values)

    const [updated] = await pool.query('SELECT * FROM goals WHERE id = ?', [req.params.id])
    return res.json({ data: normalizeGoalRow(updated[0]) })
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
      return res.status(404).json({ error: 'Meta nao encontrada' })
    }

    await pool.query('UPDATE goals SET deleted_at = NOW() WHERE id = ?', [req.params.id])
    return res.json({ data: { message: 'Meta excluida com sucesso' } })
  } catch (err) {
    console.error('goals DELETE error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
