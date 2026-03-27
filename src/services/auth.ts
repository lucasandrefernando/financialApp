import api from '../lib/api'
import type { User } from '../types'

export function persistAuthTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/api/auth/login', { email, password })
  persistAuthTokens(data.access_token, data.refresh_token)
  return data.user as User
}

export async function register(name: string, email: string, password: string) {
  const { data } = await api.post('/api/auth/register', { name, email, password })
  persistAuthTokens(data.access_token, data.refresh_token)
  return data.user as User
}

export async function getMe(): Promise<User> {
  const { data } = await api.get('/api/auth/me')
  return data as User
}

export async function logout() {
  const refresh_token = localStorage.getItem('refresh_token')
  await api.post('/api/auth/logout', { refresh_token }).catch(() => {})
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export async function deleteMyAccount() {
  await api.delete('/api/auth/me')
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}
