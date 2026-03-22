import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/services/supabase'
import { fetchProfile } from '@/services/api/profile'

const AuthContext = createContext<null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setSession, setProfile, setLoading, reset } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      if (data.session?.user) {
        fetchProfile().then(setProfile).catch(() => null)
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (event === 'SIGNED_IN' && session?.user) {
        fetchProfile().then(setProfile).catch(() => null)
      }
      if (event === 'SIGNED_OUT') {
        reset()
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [setUser, setSession, setProfile, setLoading, reset])

  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  return useContext(AuthContext)
}
