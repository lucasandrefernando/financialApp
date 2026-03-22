import { useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { signIn, signUp, signOut, resetPassword, getSession, onAuthStateChange } from '@/services/auth'
import { fetchProfile } from '@/services/api/profile'

export function useAuth() {
  const { user, session, profile, isLoading, setUser, setSession, setProfile, setLoading } = useAuthStore()

  const login = async (email: string, password: string) => {
    await signIn(email, password)
  }

  const register = async (email: string, password: string, fullName: string) => {
    await signUp(email, password, fullName)
  }

  const logout = async () => {
    await signOut()
  }

  const forgotPassword = async (email: string) => {
    await resetPassword(email)
  }

  const initAuth = useCallback(async () => {
    setLoading(true)
    try {
      const sessionObj = await Promise.race([
        getSession().catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ])
      setSession(sessionObj ?? null)
      setUser(sessionObj?.user ?? null)

      if (sessionObj?.user) {
        try {
          const profileData = await fetchProfile()
          setProfile(profileData)
        } catch (e) {
          // perfil pode não existir ainda; ignore erros aqui
          setProfile(null)
        }
      } else {
        setProfile(null)
      }

      // Inscrever em mudanças de autenticação
      const { data: { subscription } } = onAuthStateChange(async (_event, sessionEvent) => {
        setSession(sessionEvent ?? null)
        setUser(sessionEvent?.user ?? null)
        if (!sessionEvent) {
          setProfile(null)
        }
        return Promise.resolve()
      })

      // cleanup não é necessário aqui; o caller pode ignorar
      return () => subscription.unsubscribe()
    } finally {
      setLoading(false)
    }
  }, [setLoading, setProfile, setSession, setUser])

  return {
    user,
    session,
    profile,
    isLoading,
    isAuthenticated: !!session,
    login,
    register,
    logout,
    forgotPassword,
    initAuth,
  }
}
