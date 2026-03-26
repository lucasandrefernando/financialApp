import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    const userId = req.userId
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // Use selected month from query params, fallback to current month
    const year = parseInt(req.query.year) || currentYear
    const month = parseInt(req.query.month) || currentMonth
    const isCurrentMonth = (year === currentYear && month === currentMonth)

    const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const dateTo = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

    // Get accounts
    const [accounts] = await pool.query(
      `SELECT ba.* FROM bank_accounts ba
       JOIN account_members am ON am.account_id = ba.id AND am.user_id = ?
       WHERE ba.deleted_at IS NULL
       ORDER BY ba.created_at ASC`,
      [userId]
    )

    const accountIds = accounts.map((a) => a.id)

    // Total balance (include_in_total only)
    const total_balance = accounts
      .filter((a) => a.include_in_total)
      .reduce((sum, a) => sum + parseFloat(a.current_balance), 0)

    if (accountIds.length === 0) {
      return res.json({
        data: {
          account_balances: [],
          total_balance: 0,
          current_month: { income: 0, expenses: 0, balance: 0, savings_rate: 0 },
          averages: { daily: 0, weekly: 0, biweekly: 0 },
          projected_end_of_month: 0,
          top_categories: [],
          recent_transactions: [],
          budget_alerts: [],
          monthly_cash_flow: [],
        },
      })
    }

    const placeholders = accountIds.map(() => '?').join(',')

    // Current month income
    const [incomeRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE account_id IN (${placeholders})
         AND type = 'income' AND status = 'completed'
         AND date BETWEEN ? AND ? AND deleted_at IS NULL`,
      [...accountIds, dateFrom, dateTo]
    )

    // Current month expenses
    const [expenseRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
       WHERE account_id IN (${placeholders})
         AND type = 'expense' AND status = 'completed'
         AND date BETWEEN ? AND ? AND deleted_at IS NULL`,
      [...accountIds, dateFrom, dateTo]
    )

    const income = parseFloat(incomeRows[0].total)
    const expenses = parseFloat(expenseRows[0].total)
    const balance = income - expenses
    const savings_rate = income > 0 ? parseFloat(((balance / income) * 100).toFixed(1)) : 0

    // Averages — for current month use days passed, for past months use full month days
    const daysPassed = isCurrentMonth ? Math.max(now.getDate(), 1) : lastDay
    const daily_avg = parseFloat((expenses / daysPassed).toFixed(2))
    const weekly_avg = parseFloat((daily_avg * 7).toFixed(2))
    const biweekly_avg = parseFloat((daily_avg * 14).toFixed(2))
    // Projection only makes sense for current month
    const remainingDays = isCurrentMonth ? (lastDay - now.getDate()) : 0
    const projected_end_of_month = isCurrentMonth
      ? parseFloat((expenses + daily_avg * remainingDays).toFixed(2))
      : expenses

    // Top 5 expense categories this month
    const [topCats] = await pool.query(
      `SELECT c.id, c.name AS category_name, c.color, c.icon, COALESCE(SUM(t.amount), 0) AS total
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.account_id IN (${placeholders})
         AND t.type = 'expense' AND t.status = 'completed'
         AND t.date BETWEEN ? AND ? AND t.deleted_at IS NULL
       GROUP BY c.id, c.name, c.color, c.icon
       ORDER BY total DESC
       LIMIT 5`,
      [...accountIds, dateFrom, dateTo]
    )

    // Recent 10 transactions
    const [recentTx] = await pool.query(
      `SELECT t.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon,
              ba.name AS account_name
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       LEFT JOIN bank_accounts ba ON ba.id = t.account_id
       WHERE t.account_id IN (${placeholders}) AND t.deleted_at IS NULL
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT 10`,
      [...accountIds]
    )

    // Budget alerts (over threshold)
    const [budgets] = await pool.query(
      `SELECT b.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       WHERE b.user_id = ? AND b.deleted_at IS NULL AND b.active = TRUE`,
      [userId]
    )

    const budget_alerts = []
    for (const budget of budgets) {
      let periodDateFrom, periodDateTo
      if (budget.period === 'monthly') {
        periodDateFrom = dateFrom
        periodDateTo = dateTo
      } else if (budget.period === 'weekly') {
        const day = now.getDay()
        const start = new Date(now)
        start.setDate(now.getDate() - day)
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        periodDateFrom = start.toISOString().split('T')[0]
        periodDateTo = end.toISOString().split('T')[0]
      } else {
        periodDateFrom = `${year}-01-01`
        periodDateTo = `${year}-12-31`
      }

      const [spentRows] = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
         WHERE account_id IN (${placeholders})
           AND category_id = ? AND type = 'expense' AND status = 'completed'
           AND date BETWEEN ? AND ? AND deleted_at IS NULL`,
        [...accountIds, budget.category_id, periodDateFrom, periodDateTo]
      )

      const spent = parseFloat(spentRows[0].total)
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

      if (percentage >= budget.alert_threshold) {
        budget_alerts.push({
          ...budget,
          spent,
          percentage: parseFloat(percentage.toFixed(1)),
          remaining: parseFloat((budget.amount - spent).toFixed(2)),
          is_over_budget: spent > budget.amount,
        })
      }
    }

    // Monthly cash flow - last 6 months
    const monthly_cash_flow = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      const mFrom = `${y}-${String(m).padStart(2, '0')}-01`
      const mLastDay = new Date(y, m, 0).getDate()
      const mTo = `${y}-${String(m).padStart(2, '0')}-${mLastDay}`

      const [mIncome] = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
         WHERE account_id IN (${placeholders})
           AND type = 'income' AND status = 'completed'
           AND date BETWEEN ? AND ? AND deleted_at IS NULL`,
        [...accountIds, mFrom, mTo]
      )

      const [mExpense] = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
         WHERE account_id IN (${placeholders})
           AND type = 'expense' AND status = 'completed'
           AND date BETWEEN ? AND ? AND deleted_at IS NULL`,
        [...accountIds, mFrom, mTo]
      )

      monthly_cash_flow.push({
        year: y,
        month: m,
        label: d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
        income: parseFloat(mIncome[0].total),
        expenses: parseFloat(mExpense[0].total),
        balance: parseFloat(mIncome[0].total) - parseFloat(mExpense[0].total),
      })
    }

    return res.json({
      data: {
        account_balances: accounts,
        total_balance: parseFloat(total_balance.toFixed(2)),
        current_month: { income, expenses, balance, savings_rate },
        averages: { daily: daily_avg, weekly: weekly_avg, biweekly: biweekly_avg },
        projected_end_of_month,
        top_categories: topCats.map(c => ({
          ...c,
          total: parseFloat(c.total),
          percentage: expenses > 0 ? parseFloat(((parseFloat(c.total) / expenses) * 100).toFixed(1)) : 0,
        })),
        recent_transactions: recentTx,
        budget_alerts,
        monthly_cash_flow,
      },
    })
  } catch (err) {
    console.error('dashboard error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
