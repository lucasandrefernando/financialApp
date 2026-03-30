import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from '../db.js'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js'
import { requireAuth } from '../middleware/auth.js'
import { sendEmailVerificationEmail, sendPasswordResetEmail } from '../utils/mailer.js'

const router = Router()
const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
let authSchemaReady = false
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')
const AUTH_MEDIA = {
  'login-01': 'login-01.jpg',
  'login-02': 'login-02.jpg',
  'login-03': 'login-03.jpg',
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function formatCpf(cpf) {
  const d = onlyDigits(cpf)
  if (d.length !== 11) return ''
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function isValidCpf(cpf) {
  const d = onlyDigits(cpf)
  if (d.length !== 11) return false
  if (/^(\d)\1+$/.test(d)) return false

  let sum = 0
  for (let i = 0; i < 9; i += 1) sum += Number(d[i]) * (10 - i)
  let check = (sum * 10) % 11
  if (check === 10) check = 0
  if (check !== Number(d[9])) return false

  sum = 0
  for (let i = 0; i < 10; i += 1) sum += Number(d[i]) * (11 - i)
  check = (sum * 10) % 11
  if (check === 10) check = 0
  return check === Number(d[10])
}

async function ensureAuthSchema() {
  if (authSchemaReady) return

  const [columns] = await pool.query('SHOW COLUMNS FROM users')
  const fields = new Set(columns.map(c => c.Field))

  if (!fields.has('cpf')) {
    await pool.query('ALTER TABLE users ADD COLUMN cpf VARCHAR(14) NULL AFTER email')
  }
  if (!fields.has('email_verified')) {
    await pool.query('ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash')
  }
  if (!fields.has('email_verification_token')) {
    await pool.query('ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255) NULL')
  }
  if (!fields.has('email_verification_expires')) {
    await pool.query('ALTER TABLE users ADD COLUMN email_verification_expires DATETIME NULL')
  }
  if (!fields.has('password_setup_token')) {
    await pool.query('ALTER TABLE users ADD COLUMN password_setup_token VARCHAR(255) NULL')
  }
  if (!fields.has('password_setup_expires')) {
    await pool.query('ALTER TABLE users ADD COLUMN password_setup_expires DATETIME NULL')
  }
  if (!fields.has('reset_token')) {
    await pool.query('ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) NULL')
  }
  if (!fields.has('reset_token_expires')) {
    await pool.query('ALTER TABLE users ADD COLUMN reset_token_expires DATETIME NULL')
  }

  const passwordHashColumn = columns.find(c => c.Field === 'password_hash')
  if (passwordHashColumn && passwordHashColumn.Null === 'NO') {
    await pool.query('ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL')
  }

  // Preserve access for legacy accounts that already had a password before verification flow existed.
  await pool.query(
    `UPDATE users
     SET email_verified = 1
     WHERE password_hash IS NOT NULL
       AND (email_verified = 0 OR email_verified IS NULL)
       AND deleted_at IS NULL`
  )

  authSchemaReady = true
}

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

function isLocalRuntimeOrigin(origin) {
  if (!origin) return false
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin.trim())
}

function resolveRuntimeAppUrl(req) {
  const origin = String(req?.headers?.origin || '').trim().replace(/\/+$/, '')
  if (origin && !isLocalRuntimeOrigin(origin)) return origin
  return getPublicAppUrl()
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

function buildCreatePasswordRedirect(query = '') {
  const appUrl = getPublicAppUrl()
  const target = `/create-password${query}`
  if (!appUrl) return target
  return `${appUrl}${target}`
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

function resolveAuthMediaPath(filename) {
  const candidates = [
    path.join(projectRoot, 'public', 'img', filename),
    path.join(projectRoot, 'dist', 'img', filename),
  ]
  return candidates.find(file => fs.existsSync(file))
}

router.use(async (req, res, next) => {
  try {
    await ensureAuthSchema()
    next()
  } catch (err) {
    console.error('ensure auth schema error', err)
    res.status(500).json({ error: 'Erro ao preparar autenticação' })
  }
})

// GET /api/auth/media/:assetId
router.get('/media/:assetId', (req, res) => {
  const assetId = String(req.params.assetId || '').toLowerCase()
  const filename = AUTH_MEDIA[assetId]
  if (!filename) {
    return res.status(404).json({ error: 'Arquivo não encontrado' })
  }

  const filePath = resolveAuthMediaPath(filename)
  if (!filePath) {
    return res.status(404).json({ error: 'Arquivo não encontrado' })
  }

  return res.sendFile(filePath)
})

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, cpf, email, currency, locale, timezone } = req.body

    if (!name || !cpf || !email) {
      return res.status(400).json({ error: 'Nome, CPF e e-mail são obrigatórios' })
    }
    if (!isValidCpf(cpf)) {
      return res.status(400).json({ error: 'CPF inválido' })
    }
    const formattedCpf = formatCpf(cpf)

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    )
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Este e-mail já está em uso' })
    }

    const [existingCpf] = await pool.query(
      'SELECT id FROM users WHERE cpf = ? AND deleted_at IS NULL',
      [formattedCpf]
    )
    if (existingCpf.length > 0) {
      return res.status(409).json({ error: 'Este CPF já está em uso' })
    }

    const verificationToken = randomBytes(32).toString('hex')
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await pool.query(
      `INSERT INTO users (
         name, cpf, email, password_hash, email_verified,
         email_verification_token, email_verification_expires, currency, locale, timezone
       )
       VALUES (?, ?, ?, NULL, 0, ?, ?, ?, ?, ?)`,
      [
        name,
        formattedCpf,
        email,
        verificationToken,
        verificationExpires,
        currency || 'BRL',
        locale || 'pt-BR',
        timezone || 'America/Sao_Paulo',
      ]
    )

    const appUrl = resolveRuntimeAppUrl(req)
    await sendEmailVerificationEmail(email, verificationToken, appUrl, getAppBasePath())

    return res.status(201).json({
      data: {
        message: 'Cadastro iniciado. Enviamos um e-mail para você confirmar sua conta.',
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
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' })
    }

    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    )

    if (users.length === 0) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' })
    }

    const user = users[0]
    if (!user.email_verified) {
      return res.status(403).json({
        error: 'Sua conta ainda não foi verificada. Confira seu e-mail para continuar.',
      })
    }
    if (!user.password_hash) {
      return res.status(403).json({
        error: 'Defina sua senha primeiro usando o link de confirmação enviado por e-mail.',
      })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' })
    }

    const { accessToken, refreshToken } = await createSessionTokens(user.id)
    const [safeUserRows] = await pool.query(
      `SELECT id, name, cpf, email, email_verified, avatar_url, currency, locale, timezone,
              onboarding_completed, created_at, updated_at
       FROM users WHERE id = ?`,
      [user.id]
    )
    const safeUser = safeUserRows[0]

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
        error: 'Google OAuth não configurado. Defina GOOGLE_CLIENT_ID e GOOGLE_REDIRECT_URI/APP_URL.',
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
    let needsProfileCompletion = false
    if (existingUsers.length > 0) {
      userId = existingUsers[0].id
      const finalName = profile.name || existingUsers[0].name || 'Usuário Google'
      const finalAvatar = profile.picture || existingUsers[0].avatar_url || null
      await pool.query(
        `UPDATE users
         SET name = ?, avatar_url = ?, email_verified = 1, updated_at = NOW()
         WHERE id = ?`,
        [finalName, finalAvatar, userId]
      )
      if (!existingUsers[0].cpf || !String(existingUsers[0].cpf).trim()) {
        needsProfileCompletion = true
      }
    } else {
      const [insertResult] = await pool.query(
        `INSERT INTO users (name, email, password_hash, cpf, avatar_url, email_verified, currency, locale, timezone)
         VALUES (?, ?, NULL, NULL, ?, 1, ?, ?, ?)`,
        [
          profile.name || profile.email.split('@')[0] || 'Usuário Google',
          profile.email,
          profile.picture || null,
          'BRL',
          'pt-BR',
          'America/Sao_Paulo',
        ]
      )
      userId = insertResult.insertId
      needsProfileCompletion = true
    }

    const { accessToken, refreshToken } = await createSessionTokens(userId)
    const fragment = `#access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&needs_profile=${needsProfileCompletion ? '1' : '0'}`
    return res.redirect(buildAuthCallbackRedirect(fragment))
  } catch (err) {
    console.error('google callback error', err)
    return res.redirect(buildAuthCallbackRedirect('#error=google_unexpected'))
  }
})

// GET /api/auth/verify-email
router.get('/verify-email', async (req, res) => {
  try {
    const token = String(req.query.token || '')
    if (!token) {
      return res.redirect(buildCreatePasswordRedirect('?status=token_missing'))
    }

    const [users] = await pool.query(
      `SELECT id
       FROM users
       WHERE email_verification_token = ?
         AND email_verification_expires > NOW()
         AND deleted_at IS NULL`,
      [token]
    )

    if (users.length === 0) {
      return res.redirect(buildCreatePasswordRedirect('?status=token_invalid'))
    }

    const passwordSetupToken = randomBytes(32).toString('hex')
    const passwordSetupExpires = new Date(Date.now() + 2 * 60 * 60 * 1000)

    await pool.query(
      `UPDATE users
       SET email_verified = 1,
           email_verification_token = NULL,
           email_verification_expires = NULL,
           password_setup_token = ?,
           password_setup_expires = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [passwordSetupToken, passwordSetupExpires, users[0].id]
    )

    return res.redirect(
      buildCreatePasswordRedirect(`?token=${encodeURIComponent(passwordSetupToken)}&status=verified`)
    )
  } catch (err) {
    console.error('verify-email error', err)
    return res.redirect(buildCreatePasswordRedirect('?status=unexpected_error'))
  }
})

// POST /api/auth/create-password
router.post('/create-password', async (req, res) => {
  try {
    const { token, password } = req.body || {}

    if (!token || !password) {
      return res.status(400).json({ error: 'Token e senha são obrigatórios' })
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' })
    }

    const [users] = await pool.query(
      `SELECT id
       FROM users
       WHERE password_setup_token = ?
         AND password_setup_expires > NOW()
         AND deleted_at IS NULL`,
      [token]
    )

    if (users.length === 0) {
      return res.status(400).json({ error: 'Link inválido ou expirado' })
    }

    const passwordHash = await bcrypt.hash(String(password), 10)
    await pool.query(
      `UPDATE users
       SET password_hash = ?,
           password_setup_token = NULL,
           password_setup_expires = NULL,
           updated_at = NOW()
       WHERE id = ?`,
      [passwordHash, users[0].id]
    )

    return res.json({ data: { message: 'Senha criada com sucesso. Faça login para continuar.' } })
  } catch (err) {
    console.error('create-password error', err)
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
      `SELECT id, name, cpf, email, email_verified, avatar_url, currency, locale, timezone,
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
    const { name, cpf, currency, locale, timezone, avatar_url } = req.body || {}

    const fields = []
    const values = []

    if (typeof name === 'string') {
      if (!name.trim()) return res.status(400).json({ error: 'Nome é obrigatório' })
      fields.push('name = ?')
      values.push(name.trim())
    }
    if (typeof cpf === 'string') {
      const normalized = cpf.trim()
      if (!normalized) {
        return res.status(400).json({ error: 'CPF é obrigatório' })
      }
      if (!isValidCpf(normalized)) {
        return res.status(400).json({ error: 'CPF inválido' })
      }
      const formatted = formatCpf(normalized)
      const [duplicatedCpf] = await pool.query(
        'SELECT id FROM users WHERE cpf = ? AND id <> ? AND deleted_at IS NULL',
        [formatted, req.userId]
      )
      if (duplicatedCpf.length > 0) {
        return res.status(409).json({ error: 'Este CPF já está em uso' })
      }
      fields.push('cpf = ?')
      values.push(formatted)
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
      `SELECT id, name, cpf, email, email_verified, avatar_url, currency, locale, timezone,
              onboarding_completed, created_at, updated_at
       FROM users WHERE id = ? AND deleted_at IS NULL`,
      [req.userId]
    )

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
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
      return res.status(404).json({ error: 'Usuário não encontrado' })
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

    return res.json({ data: { message: 'Conta excluída com sucesso' } })
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
    if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' })

    const [users] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND email_verified = 1 AND password_hash IS NOT NULL AND deleted_at IS NULL',
      [email]
    )

    // Always return success to not leak whether email exists
    if (users.length === 0) {
      return res.json({ data: { message: 'Se o e-mail existir, você receberá um link em breve.' } })
    }

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await pool.query(
      `UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?`,
      [token, expiresAt, users[0].id]
    )

    const appUrl = resolveRuntimeAppUrl(req) || 'http://localhost:5173'
    await sendPasswordResetEmail(email, token, appUrl)

    return res.json({ data: { message: 'Se o e-mail existir, você receberá um link em breve.' } })
  } catch (err) {
    console.error('forgot-password error', err)
    return res.status(500).json({ error: 'Erro ao enviar e-mail' })
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

