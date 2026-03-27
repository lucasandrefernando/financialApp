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
const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

function normalizeBasePath(value) {
  if (!value || value === '/') return ''
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.replace(/\/+$/, '')
}

function getAppBasePath() {
  return normalizeBasePath(process.env.APP_BASE_PATH || process.env.VITE_APP_BASE_PATH || '/')
}

function getPublicAppUrl() {
  const appUrl = (process.env.APP_URL || '').replace(/\/+$/, '')
  return appUrl || getAppBasePath()
}

function getGoogleRedirectUri() {
  const explicit = (process.env.GOOGLE_REDIRECT_URI || '').trim()
  if (explicit) return explicit

  const appUrl = getPublicAppUrl()
  if (!appUrl) return ''
  return `${appUrl}/api/auth/google/callback`
}

function buildAuthCallbackRedirect(fragment = '') {
  const appUrl = getPublicAppUrl()
  const callbackPath = '/auth/callback'
  if (!appUrl) return `${callbackPath}${fragment}`
  return `${appUrl}${callbackPath}${fragment}`
}

async function createSessionTokens(userId) {
  const accessToken = generateAccessToken(userId)
  const refreshToken = generateRefreshToken(userId)

  await pool.query('DELETE FROM user_sessions WHERE user_id = ? AND expires_at < NOW()', [userId])
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await pool.query(
    'INSERT INTO user_sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)',
    [userId, refreshToken, expiresAt]
  )

  return { accessToken, refreshToken }
}

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
    const { accessToken, refreshToken } = await createSessionTokens(userId)

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

    const { accessToken, refreshToken } = await createSessionTokens(user.id)

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

// GET /api/auth/google/start
router.get('/google/start', async (req, res) => {
  try {
    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim()
    const redirectUri = getGoogleRedirectUri()

    if (!clientId || !redirectUri) {
      return res.status(500).json({
        error: 'Google OAuth nao configurado. Defina GOOGLE_CLIENT_ID e GOOGLE_REDIRECT_URI/APP_URL.',
      })
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    })

    return res.redirect(`${GOOGLE_OAUTH_URL}?${params.toString()}`)
  } catch (err) {
    console.error('google start error', err)
    return res.status(500).json({ error: 'Erro ao iniciar login com Google' })
  }
})

// GET /api/auth/google/callback
router.get('/google/callback', async (req, res) => {
  try {
    const code = String(req.query.code || '')
    const oauthError = String(req.query.error || '')
    if (oauthError) {
      return res.redirect(buildAuthCallbackRedirect('#error=google_denied'))
    }
    if (!code) {
      return res.redirect(buildAuthCallbackRedirect('#error=google_missing_code'))
    }

    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim()
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim()
    const redirectUri = getGoogleRedirectUri()

    if (!clientId || !clientSecret || !redirectUri) {
      return res.redirect(buildAuthCallbackRedirect('#error=google_not_configured'))
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('google token exchange error', tokenData)
      return res.redirect(buildAuthCallbackRedirect('#error=google_token_exchange'))
    }

    const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await profileResponse.json()
    if (!profileResponse.ok) {
      console.error('google userinfo error', profile)
      return res.redirect(buildAuthCallbackRedirect('#error=google_profile'))
    }

    const emailVerified = profile.email_verified === true || profile.email_verified === 'true'
    if (!profile.email || !emailVerified) {
      return res.redirect(buildAuthCallbackRedirect('#error=google_email_not_verified'))
    }

    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL',
      [profile.email]
    )

    let userId
    if (existingUsers.length > 0) {
      userId = existingUsers[0].id
      await pool.query('UPDATE users SET name = ?, avatar_url = ? WHERE id = ?', [
        profile.name || existingUsers[0].name || 'Usuario Google',
        profile.picture || existingUsers[0].avatar_url || null,
        userId,
      ])
    } else {
      const generatedPasswordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10)
      const [insertResult] = await pool.query(
        `INSERT INTO users (name, email, password_hash, avatar_url, currency, locale, timezone)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          profile.name || profile.email.split('@')[0] || 'Usuario Google',
          profile.email,
          generatedPasswordHash,
          profile.picture || null,
          'BRL',
          'pt-BR',
          'America/Sao_Paulo',
        ]
      )
      userId = insertResult.insertId
    }

    const { accessToken, refreshToken } = await createSessionTokens(userId)
    const fragment = `#access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`
    return res.redirect(buildAuthCallbackRedirect(fragment))
  } catch (err) {
    console.error('google callback error', err)
    return res.redirect(buildAuthCallbackRedirect('#error=google_unexpected'))
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

// PUT /api/auth/me
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { name, currency, locale, timezone, avatar_url } = req.body || {}

    const fields = []
    const values = []

    if (typeof name === 'string') {
      if (!name.trim()) return res.status(400).json({ error: 'Nome e obrigatorio' })
      fields.push('name = ?')
      values.push(name.trim())
    }
    if (typeof currency === 'string' && currency.trim()) {
      fields.push('currency = ?')
      values.push(currency.trim())
    }
    if (typeof locale === 'string' && locale.trim()) {
      fields.push('locale = ?')
      values.push(locale.trim())
    }
    if (typeof timezone === 'string' && timezone.trim()) {
      fields.push('timezone = ?')
      values.push(timezone.trim())
    }
    if (avatar_url !== undefined) {
      fields.push('avatar_url = ?')
      values.push(typeof avatar_url === 'string' && avatar_url.trim() ? avatar_url.trim() : null)
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    }

    fields.push('updated_at = NOW()')
    values.push(req.userId)

    await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      values
    )

    const [users] = await pool.query(
      `SELECT id, name, email, avatar_url, currency, locale, timezone,
              onboarding_completed, created_at, updated_at
       FROM users WHERE id = ? AND deleted_at IS NULL`,
      [req.userId]
    )

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario nao encontrado' })
    }

    return res.json({ data: users[0] })
  } catch (err) {
    console.error('update me error', err)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// DELETE /api/auth/me
router.delete('/me', requireAuth, async (req, res) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [users] = await conn.query(
      'SELECT id, email FROM users WHERE id = ? AND deleted_at IS NULL',
      [req.userId]
    )
    if (users.length === 0) {
      await conn.rollback()
      conn.release()
      return res.status(404).json({ error: 'Usuario nao encontrado' })
    }

    const currentUser = users[0]
    const deletedEmail = `deleted+${currentUser.id}+${Date.now()}@deleted.local`
    const deletedPassword = await bcrypt.hash(randomBytes(32).toString('hex'), 10)

    await conn.query('DELETE FROM user_sessions WHERE user_id = ?', [req.userId])

    // Soft delete user-owned/business records so they stop appearing in the app.
    await conn.query('UPDATE bank_accounts SET deleted_at = NOW() WHERE owner_id = ? AND deleted_at IS NULL', [req.userId])
    await conn.query('UPDATE categories SET deleted_at = NOW() WHERE user_id = ? AND deleted_at IS NULL', [req.userId])
    await conn.query('UPDATE transactions SET deleted_at = NOW() WHERE user_id = ? AND deleted_at IS NULL', [req.userId])
    await conn.query('UPDATE budgets SET deleted_at = NOW() WHERE user_id = ? AND deleted_at IS NULL', [req.userId])
    await conn.query('UPDATE goals SET deleted_at = NOW() WHERE user_id = ? AND deleted_at IS NULL', [req.userId])
    await conn.query('UPDATE income_sources SET deleted_at = NOW() WHERE user_id = ? AND deleted_at IS NULL', [req.userId])
    await conn.query('DELETE FROM recurring_transactions WHERE user_id = ?', [req.userId])
    await conn.query('DELETE FROM account_members WHERE user_id = ?', [req.userId])
    await conn.query('DELETE FROM account_invitations WHERE invited_by = ? OR email = ?', [req.userId, currentUser.email])
    await conn.query('DELETE FROM notifications WHERE user_id = ?', [req.userId])

    await conn.query(
      `UPDATE users
       SET name = 'Conta removida',
           email = ?,
           avatar_url = NULL,
           password_hash = ?,
           onboarding_completed = FALSE,
           deleted_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [deletedEmail, deletedPassword, req.userId]
    )

    await conn.commit()
    conn.release()

    return res.json({ data: { message: 'Conta excluida com sucesso' } })
  } catch (err) {
    await conn.rollback()
    conn.release()
    console.error('delete me error', err)
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
