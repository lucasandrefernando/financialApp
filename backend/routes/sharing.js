import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import pool from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// Helper: check if user is owner of an account
async function isOwner(userId, accountId) {
  const [rows] = await pool.query(
    `SELECT id FROM bank_accounts
     WHERE id = ? AND owner_id = ? AND deleted_at IS NULL`,
    [accountId, userId]
  )
  return rows.length > 0
}

// POST /api/sharing/:accountId/invite
router.post('/:accountId/invite', async (req, res) => {
  try {
    const accountId = parseInt(req.params.accountId)
    const { email, role = 'viewer' } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' })
    }

    if (!['editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Role deve ser editor ou viewer' })
    }

    const ownerCheck = await isOwner(req.userId, accountId)
    if (!ownerCheck) {
      return res.status(403).json({ error: 'Apenas o dono pode convidar membros' })
    }

    // Check if user is already a member
    const [existing] = await pool.query(
      `SELECT am.id FROM account_members am
       JOIN users u ON u.id = am.user_id
       WHERE am.account_id = ? AND u.email = ?`,
      [accountId, email]
    )
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Este usuário já é membro desta conta' })
    }

    // Check for pending invitation
    const [pendingInvite] = await pool.query(
      `SELECT id FROM account_invitations
       WHERE account_id = ? AND email = ? AND accepted_at IS NULL AND expires_at > NOW()`,
      [accountId, email]
    )
    if (pendingInvite.length > 0) {
      return res.status(409).json({ error: 'Já existe um convite pendente para este email' })
    }

    const token = uuidv4()
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours

    await pool.query(
      `INSERT INTO account_invitations (account_id, invited_by, email, role, token, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [accountId, req.userId, email, role, token, expiresAt]
    )

    const [accounts] = await pool.query(
      'SELECT name FROM bank_accounts WHERE id = ?',
      [accountId]
    )

    return res.status(201).json({
      data: {
        token,
        email,
        role,
        account_name: accounts[0]?.name,
        expires_at: expiresAt,
        invite_link: `/invite/${token}`,
      },
    })
  } catch (err) {
    console.error('sharing invite error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/sharing/invitations
router.get('/invitations', async (req, res) => {
  try {
    // Get current user's email
    const [users] = await pool.query(
      'SELECT email FROM users WHERE id = ?',
      [req.userId]
    )
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    const email = users[0].email

    const [rows] = await pool.query(
      `SELECT ai.*, ba.name AS account_name, u.name AS invited_by_name
       FROM account_invitations ai
       JOIN bank_accounts ba ON ba.id = ai.account_id
       JOIN users u ON u.id = ai.invited_by
       WHERE ai.email = ? AND ai.accepted_at IS NULL AND ai.expires_at > NOW()
       ORDER BY ai.created_at DESC`,
      [email]
    )

    return res.json({ data: rows })
  } catch (err) {
    console.error('sharing invitations GET error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /api/sharing/invitations/:token/accept
router.post('/invitations/:token/accept', async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [invitations] = await conn.query(
      `SELECT * FROM account_invitations
       WHERE token = ? AND accepted_at IS NULL AND expires_at > NOW()`,
      [req.params.token]
    )

    if (invitations.length === 0) {
      await conn.rollback()
      conn.release()
      return res.status(404).json({ error: 'Convite não encontrado ou expirado' })
    }

    const invite = invitations[0]

    // Verify the user's email matches the invitation
    const [users] = await conn.query(
      'SELECT email FROM users WHERE id = ?',
      [req.userId]
    )
    if (users[0].email !== invite.email) {
      await conn.rollback()
      conn.release()
      return res.status(403).json({ error: 'Este convite não é para o seu email' })
    }

    // Check if already a member
    const [existingMember] = await conn.query(
      'SELECT id FROM account_members WHERE account_id = ? AND user_id = ?',
      [invite.account_id, req.userId]
    )
    if (existingMember.length > 0) {
      await conn.rollback()
      conn.release()
      return res.status(409).json({ error: 'Você já é membro desta conta' })
    }

    // Create member record
    await conn.query(
      `INSERT INTO account_members (account_id, user_id, role, invited_by, accepted_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [invite.account_id, req.userId, invite.role, invite.invited_by]
    )

    // Mark invitation as accepted
    await conn.query(
      'UPDATE account_invitations SET accepted_at = NOW() WHERE id = ?',
      [invite.id]
    )

    await conn.commit()
    conn.release()

    const [accounts] = await pool.query(
      'SELECT * FROM bank_accounts WHERE id = ?',
      [invite.account_id]
    )

    return res.json({
      data: {
        message: 'Convite aceito com sucesso',
        account: accounts[0],
      },
    })
  } catch (err) {
    await conn.rollback()
    conn.release()
    console.error('sharing accept error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// DELETE /api/sharing/:accountId/members/:userId
router.delete('/:accountId/members/:memberId', async (req, res) => {
  try {
    const accountId = parseInt(req.params.accountId)
    const memberId = parseInt(req.params.memberId)

    const ownerCheck = await isOwner(req.userId, accountId)
    if (!ownerCheck) {
      return res.status(403).json({ error: 'Apenas o dono pode remover membros' })
    }

    // Cannot remove the owner
    const [memberRows] = await pool.query(
      'SELECT role FROM account_members WHERE account_id = ? AND user_id = ?',
      [accountId, memberId]
    )
    if (memberRows.length === 0) {
      return res.status(404).json({ error: 'Membro não encontrado' })
    }
    if (memberRows[0].role === 'owner') {
      return res.status(400).json({ error: 'Não é possível remover o dono da conta' })
    }

    await pool.query(
      'DELETE FROM account_members WHERE account_id = ? AND user_id = ?',
      [accountId, memberId]
    )

    return res.json({ data: { message: 'Membro removido com sucesso' } })
  } catch (err) {
    console.error('sharing remove member error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/sharing/:accountId/members
router.get('/:accountId/members', async (req, res) => {
  try {
    const accountId = parseInt(req.params.accountId)

    // Verify user has access to this account
    const [accessRows] = await pool.query(
      'SELECT role FROM account_members WHERE account_id = ? AND user_id = ?',
      [accountId, req.userId]
    )
    if (accessRows.length === 0) {
      return res.status(403).json({ error: 'Sem acesso a esta conta' })
    }

    const [members] = await pool.query(
      `SELECT am.id, am.role, am.accepted_at, am.created_at,
              u.id AS user_id, u.name, u.email, u.avatar_url
       FROM account_members am
       JOIN users u ON u.id = am.user_id
       WHERE am.account_id = ?
       ORDER BY am.role ASC, u.name ASC`,
      [accountId]
    )

    return res.json({ data: members })
  } catch (err) {
    console.error('sharing members GET error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
