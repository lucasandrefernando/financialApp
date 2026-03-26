import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// POST /api/onboarding/complete
router.post('/complete', async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET onboarding_completed = TRUE, updated_at = NOW() WHERE id = ?',
      [req.userId]
    )

    const [users] = await pool.query(
      `SELECT id, name, email, avatar_url, currency, locale, timezone,
              onboarding_completed, created_at, updated_at
       FROM users WHERE id = ?`,
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
