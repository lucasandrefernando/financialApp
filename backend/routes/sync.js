import { Router } from 'express'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

function toVersion(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

router.get('/version', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COALESCE(MAX(version), 0) AS version
       FROM (
         SELECT UNIX_TIMESTAMP(COALESCE(MAX(GREATEST(ba.created_at, ba.updated_at, COALESCE(ba.deleted_at, ba.created_at))), '1970-01-01')) AS version
         FROM bank_accounts ba
         JOIN account_members am ON am.account_id = ba.id
         WHERE am.user_id = ?

         UNION ALL

         SELECT UNIX_TIMESTAMP(COALESCE(MAX(t.updated_at), '1970-01-01')) AS version
         FROM transactions t
         LEFT JOIN account_members am1 ON am1.account_id = t.account_id AND am1.user_id = ?
         LEFT JOIN account_members am2 ON am2.account_id = t.transfer_to_account_id AND am2.user_id = ?
         WHERE t.user_id = ? OR am1.user_id IS NOT NULL OR am2.user_id IS NOT NULL

         UNION ALL

         SELECT UNIX_TIMESTAMP(COALESCE(MAX(GREATEST(b.created_at, b.updated_at, COALESCE(b.deleted_at, b.created_at))), '1970-01-01')) AS version
         FROM budgets b
         WHERE b.user_id = ?

         UNION ALL

         SELECT UNIX_TIMESTAMP(COALESCE(MAX(GREATEST(g.created_at, g.updated_at, COALESCE(g.deleted_at, g.created_at))), '1970-01-01')) AS version
         FROM goals g
         WHERE g.user_id = ?

         UNION ALL

         SELECT UNIX_TIMESTAMP(COALESCE(MAX(GREATEST(c.created_at, COALESCE(c.deleted_at, c.created_at))), '1970-01-01')) AS version
         FROM categories c
         WHERE c.user_id = ?

         UNION ALL

         SELECT UNIX_TIMESTAMP(COALESCE(MAX(GREATEST(i.created_at, i.updated_at, COALESCE(i.deleted_at, i.created_at))), '1970-01-01')) AS version
         FROM income_sources i
         WHERE i.user_id = ?
       ) versions`,
      [
        req.userId,
        req.userId,
        req.userId,
        req.userId,
        req.userId,
        req.userId,
        req.userId,
        req.userId,
      ]
    )

    return res.json({
      data: {
        version: toVersion(rows[0]?.version),
        checked_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('sync version error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
