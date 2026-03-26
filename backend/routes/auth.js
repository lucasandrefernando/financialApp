import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import pool from '../db.js'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js'
import { requireAuth } from '../middleware/auth.js'
import { sendPasswordResetEmail } from '../utils/mailer.js'

const router = Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, currency, locale, timezone } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' })
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    )
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Este email já está em uso' })
    }

    const password_hash = await bcrypt.hash(password, 10)

    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, currency, locale, timezone)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        password_hash,
        currency || 'BRL',
        locale || 'pt-BR',
        timezone || 'America/Sao_Paulo',
      ]
    )

    const userId = result.insertId
    const accessToken = generateAccessToken(userId)
    const refreshToken = generateRefreshToken(userId)

    // Store refresh token (expires in 7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await pool.query(
      'INSERT INTO user_sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)',
      [userId, refreshToken, expiresAt]
    )

    const [users] = await pool.query(
      'SELECT id, name, email, avatar_url, currency, locale, timezone, onboarding_completed, created_at FROM users WHERE id = ?',
      [userId]
    )

    return res.status(201).json({
      data: {
        user: users[0],
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    })
  } catch (err) {
    console.error('register error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' })
    }

    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    )

    if (users.length === 0) {
      return res.status(401).json({ error: 'Email ou senha incorretos' })
    }

    const user = users[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Email ou senha incorretos' })
    }

    const accessToken = generateAccessToken(user.id)
    const refreshToken = generateRefreshToken(user.id)

    // Clean up expired sessions and save new one
    await pool.query(
      'DELETE FROM user_sessions WHERE user_id = ? AND expires_at < NOW()',
      [user.id]
    )
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await pool.query(
      'INSERT INTO user_sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshToken, expiresAt]
    )

    const { password_hash, ...safeUser } = user

    return res.json({
      data: {
        user: safeUser,
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    })
  } catch (err) {
    console.error('login error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body
    if (!refresh_token) {
      return res.status(400).json({ error: 'refresh_token é obrigatório' })
    }

    let payload
    try {
      payload = verifyRefreshToken(refresh_token)
    } catch {
      return res.status(401).json({ error: 'Refresh token inválido ou expirado' })
    }

    const [sessions] = await pool.query(
      'SELECT * FROM user_sessions WHERE refresh_token = ? AND expires_at > NOW()',
      [refresh_token]
    )
    if (sessions.length === 0) {
      return res.status(401).json({ error: 'Sessão não encontrada ou expirada' })
    }

    const newAccessToken = generateAccessToken(payload.userId)

    return res.json({ data: { access_token: newAccessToken } })
  } catch (err) {
    console.error('refresh error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const { refresh_token } = req.body
    if (refresh_token) {
      await pool.query('DELETE FROM user_sessions WHERE refresh_token = ?', [refresh_token])
    }
    return res.json({ data: { message: 'Logout realizado com sucesso' } })
  } catch (err) {
    console.error('logout error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, name, email, avatar_url, currency, locale, timezone,
              onboarding_completed, created_at, updated_at
       FROM users WHERE id = ? AND deleted_at IS NULL`,
      [req.userId]
    )
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }
    return res.json({ data: users[0] })
  } catch (err) {
    console.error('me error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email é obrigatório' })

    const [users] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    )

    // Always return success to not leak whether email exists
    if (users.length === 0) {
      return res.json({ data: { message: 'Se o email existir, você receberá um link em breve.' } })
    }

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await pool.query(
      `UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?`,
      [token, expiresAt, users[0].id]
    )

    const appUrl = req.headers.origin || process.env.APP_URL || 'http://localhost:5173'
    await sendPasswordResetEmail(email, token, appUrl)

    return res.json({ data: { message: 'Se o email existir, você receberá um link em breve.' } })
  } catch (err) {
    console.error('forgot-password error', err)
    return res.status(500).json({ error: 'Erro ao enviar email' })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) {
      return res.status(400).json({ error: 'Token e nova senha são obrigatórios' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' })
    }

    const [users] = await pool.query(
      `SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW() AND deleted_at IS NULL`,
      [token]
    )

    if (users.length === 0) {
      return res.status(400).json({ error: 'Link inválido ou expirado' })
    }

    const password_hash = await bcrypt.hash(password, 10)
    await pool.query(
      `UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?`,
      [password_hash, users[0].id]
    )

    // Invalidate all sessions
    await pool.query('DELETE FROM user_sessions WHERE user_id = ?', [users[0].id])

    return res.json({ data: { message: 'Senha redefinida com sucesso' } })
  } catch (err) {
    console.error('reset-password error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

export default router
