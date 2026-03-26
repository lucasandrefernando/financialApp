import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { getMe } from '../services/auth'

export function useAuthInit() {
  const { setUser, setLoading } = useAuthStore()
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { setLoading(false); return }
    getMe().then(setUser).catch(() => {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }).finally(() => setLoading(false))
  }, [])
}
