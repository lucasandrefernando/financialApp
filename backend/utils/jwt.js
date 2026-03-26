import jwt from 'jsonwebtoken'

const ACCESS_SECRET = process.env.JWT_SECRET || 'financialapp-access-secret-2026'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'financialapp-refresh-secret-2026'

export function generateAccessToken(userId) {
  return jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: '15m' })
}

export function generateRefreshToken(userId) {
  return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' })
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET)
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET)
}
