import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// POST /api/onboarding/complete
router.post('/complete', async (req, res) => {
  try {
    const { name, currency, timezone, locale } = req.body || {}

    const updates = ['onboarding_completed = TRUE', 'updated_at = NOW()']
    const values = []

    if (typeof name === 'string' && name.trim()) {
      updates.push('name = ?')
      values.push(name.trim())
    }
    if (typeof currency === 'string' && currency.trim()) {
      updates.push('currency = ?')
      values.push(currency.trim())
    }
    if (typeof timezone === 'string' && timezone.trim()) {
      updates.push('timezone = ?')
      values.push(timezone.trim())
    }
    if (typeof locale === 'string' && locale.trim()) {
      updates.push('locale = ?')
      values.push(locale.trim())
    }

    values.push(req.userId)
    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      values
    )

    const [users] = await pool.query(
      `SELECT id, name, email, avatar_url, currency, locale, timezone,
              onboarding_completed, created_at, updated_at
       FROM users WHERE id = ? AND deleted_at IS NULL`,
      [req.userId]
    )

    return res.json({
      data: {
        message: 'Onboarding concluído com sucesso',
        user: users[0],
      },
    })
  } catch (err) {
    console.error('onboarding complete error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
