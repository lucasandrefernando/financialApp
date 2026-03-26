import api from '../lib/api'
import type { User } from '../types'

export async function login(email: string, password: string) {
  const { data } = await api.post('/api/auth/login', { email, password })
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
  return data.user as User
}

export async function register(name: string, email: string, password: string) {
  const { data } = await api.post('/api/auth/register', { name, email, password })
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
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
