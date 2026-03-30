import axios from 'axios'
import { resolveAppBasePath, toBasePrefix } from './basePath'
import { resolveApiBaseUrl } from './apiBase'

const APP_BASE_PATH = resolveAppBasePath(import.meta.env.VITE_APP_BASE_PATH)
const APP_BASE_PREFIX = toBasePrefix(APP_BASE_PATH)
const API_BASE_URL = resolveApiBaseUrl()
const LOGIN_PATH = `${APP_BASE_PREFIX}/login`

const api = axios.create({ baseURL: API_BASE_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      response.data = response.data.data
    }
    return response
  },
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        const { data } = await api.post('/api/auth/refresh', { refresh_token: refresh })
        const newToken = data.data?.access_token ?? data.access_token
        localStorage.setItem('access_token', newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = LOGIN_PATH
      }
    }
    return Promise.reject(error)
  }
)

export default api
