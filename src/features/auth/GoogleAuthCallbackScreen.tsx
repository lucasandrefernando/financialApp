import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import { getMe, persistAuthTokens } from '../../services/auth'
import { useAuthStore } from '../../stores/authStore'

function parseAuthHash(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  return {
    accessToken: params.get('access_token') || '',
    refreshToken: params.get('refresh_token') || '',
    error: params.get('error') || '',
  }
}

export default function GoogleAuthCallbackScreen() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    const run = async () => {
      const { accessToken, refreshToken, error: oauthError } = parseAuthHash(window.location.hash)

      if (oauthError) {
        if (!mounted) return
        setError('Falha ao autenticar com Google. Tente novamente.')
        return
      }

      if (!accessToken || !refreshToken) {
        if (!mounted) return
        setError('Token de autenticacao nao recebido do Google.')
        return
      }

      try {
        persistAuthTokens(accessToken, refreshToken)
        const user = await getMe()
        if (!mounted) return
        setUser(user)
        navigate(user.onboarding_completed ? '/' : '/onboarding', { replace: true })
      } catch (err) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        if (!mounted) return
        setError('Nao foi possivel finalizar o login Google.')
      }
    }

    run()
    return () => {
      mounted = false
    }
  }, [navigate, setUser])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4">
          <Wallet size={32} className="text-white" />
        </div>
        {error ? (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Falha no login Google</h1>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="inline-flex justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Voltar ao login
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Finalizando login...</h1>
            <p className="text-sm text-gray-600">Estamos validando sua conta Google.</p>
          </>
        )}
      </div>
    </div>
  )
}
