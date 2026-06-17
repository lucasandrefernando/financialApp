import api from '../lib/api'
import type { User } from '../types'
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser'

export function persistAuthTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/api/auth/login', { email, password })
  persistAuthTokens(data.access_token, data.refresh_token)
  return data.user as User
}

export async function isPasskeyAvailable() {
  return browserSupportsWebAuthn()
}

export async function getPasskeyStatus() {
  const { data } = await api.get('/api/auth/passkeys/status')
  return data as { enabled: boolean; count: number }
}

export async function registerPasskey(label = 'Este dispositivo') {
  const { data: startData } = await api.post('/api/auth/passkeys/register/options')
  const response = await startRegistration({ optionsJSON: startData.options })
  const { data } = await api.post('/api/auth/passkeys/register/verify', {
    challenge_id: startData.challenge_id,
    response,
    label,
  })
  return data as { enabled: boolean; message: string }
}

export async function loginWithPasskey(email?: string) {
  const { data: startData } = await api.post('/api/auth/passkeys/login/options', {
    email: email?.trim() || undefined,
  })
  const response = await startAuthentication({ optionsJSON: startData.options })
  const { data } = await api.post('/api/auth/passkeys/login/verify', {
    challenge_id: startData.challenge_id,
    response,
  })
  persistAuthTokens(data.access_token, data.refresh_token)
  return data.user as User
}

export async function register(name: string, cpf: string, email: string) {
  const { data } = await api.post('/api/auth/register', { name, cpf, email })
  return data as { message: string }
}

export async function createPassword(token: string, password: string) {
  const { data } = await api.post('/api/auth/create-password', { token, password })
  return data as { message: string }
}

export async function completeMyProfile(name: string, cpf: string) {
  const { data } = await api.put('/api/auth/me', { name, cpf })
  return data as User
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
