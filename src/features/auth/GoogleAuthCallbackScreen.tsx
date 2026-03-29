import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import { getMe, persistAuthTokens } from '../../services/auth'
import { useAuthStore } from '../../stores/authStore'
import { AlertModal, type AlertTone } from '../../components/ui/AlertModal'

function parseAuthHash(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  return {
    accessToken: params.get('access_token') || '',
    refreshToken: params.get('refresh_token') || '',
    needsProfile: params.get('needs_profile') === '1',
    error: params.get('error') || '',
  }
}

type AlertState = {
  title: string
  message: string
  tone?: AlertTone
} | null

export default function GoogleAuthCallbackScreen() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [alert, setAlert] = useState<AlertState>(null)

  useEffect(() => {
    let mounted = true

    const run = async () => {
      const { accessToken, refreshToken, needsProfile, error: oauthError } = parseAuthHash(window.location.hash)

      if (oauthError) {
        if (!mounted) return
        setAlert({
          title: 'Falha no login com Google',
          message: 'Não foi possível autenticar com o Google. Tente novamente.',
          tone: 'error',
        })
        return
      }

      if (!accessToken || !refreshToken) {
        if (!mounted) return
        setAlert({
          title: 'Token inválido',
          message: 'Não recebemos os tokens de autenticação do Google.',
          tone: 'error',
        })
        return
      }

      try {
        persistAuthTokens(accessToken, refreshToken)
        const user = await getMe()
        if (!mounted) return
        setUser(user)
        if (needsProfile || !user.cpf || !String(user.cpf).trim()) {
          navigate('/complete-profile', { replace: true })
          return
        }
        navigate(user.onboarding_completed ? '/' : '/onboarding', { replace: true })
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        if (!mounted) return
        setAlert({
          title: 'Falha ao finalizar login',
          message: 'Não foi possível concluir o login com Google.',
          tone: 'error',
        })
      }
    }

    run()
    return () => {
      mounted = false
    }
  }, [navigate, setUser])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600">
          <Wallet size={32} className="text-white" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-gray-900">Finalizando login...</h1>
        <p className="text-sm text-gray-600">Estamos validando sua conta Google.</p>
      </div>

      <AlertModal
        open={Boolean(alert)}
        title={alert?.title || ''}
        message={alert?.message || ''}
        tone={alert?.tone}
        confirmLabel="Voltar ao login"
        onConfirm={() => {
          setAlert(null)
          navigate('/login', { replace: true })
        }}
        onClose={() => setAlert(null)}
      />
    </div>
  )
}
