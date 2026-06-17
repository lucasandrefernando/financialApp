import { type ReactNode, useEffect, useState } from 'react'
import { Fingerprint, LockKeyhole, LogOut, ShieldCheck } from 'lucide-react'
import { Button } from '../ui/Button'
import { AlertModal, type AlertTone } from '../ui/AlertModal'
import { useAuthStore } from '../../stores/authStore'
import { loginWithPasskey, logout as logoutRequest } from '../../services/auth'
import {
  clearAppLockState,
  getAppLockSettings,
  markAppBackgrounded,
  markAppLocked,
  markAppUnlocked,
  shouldLockApp,
  wasRecentlyUnlocked,
} from '../../lib/appLock'
import { resolveAppBasePath, toBasePrefix } from '../../lib/basePath'

type AlertState = { title: string; message: string; tone?: AlertTone } | null
const LOGIN_PATH = `${toBasePrefix(resolveAppBasePath(import.meta.env.VITE_APP_BASE_PATH))}/login`

interface AppLockGuardProps {
  children: ReactNode
}

export function AppLockGuard({ children }: AppLockGuardProps) {
  const { user, setUser, logout } = useAuthStore()
  const [locked, setLocked] = useState(() => shouldLockApp() && !wasRecentlyUnlocked())
  const [unlocking, setUnlocking] = useState(false)
  const [alert, setAlert] = useState<AlertState>(null)

  useEffect(() => {
    if (!user) {
      setLocked(false)
      clearAppLockState()
      return
    }

    const refreshLockState = () => {
      if (shouldLockApp() && !wasRecentlyUnlocked()) setLocked(true)
    }

    const handleHidden = () => {
      const settings = getAppLockSettings()
      if (!settings.enabled) return

      markAppBackgrounded()
      if (settings.delaySeconds === 0) {
        markAppLocked()
        setLocked(true)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleHidden()
        return
      }
      refreshLockState()
    }

    refreshLockState()

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handleHidden)
    window.addEventListener('pageshow', refreshLockState)
    window.addEventListener('focus', refreshLockState)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handleHidden)
      window.removeEventListener('pageshow', refreshLockState)
      window.removeEventListener('focus', refreshLockState)
    }
  }, [user])

  const handleUnlock = async () => {
    setUnlocking(true)
    try {
      const unlockedUser = await loginWithPasskey(user?.email)
      setUser(unlockedUser)
      markAppUnlocked()
      setLocked(false)
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase()
      const isAbort = error?.name === 'AbortError' || message.includes('cancel')
      setAlert({
        title: isAbort ? 'Desbloqueio cancelado' : 'Não foi possível desbloquear',
        message:
          error?.response?.data?.error ||
          'Valide com Face ID / Passkey ou saia para entrar com e-mail e senha.',
        tone: isAbort ? 'warning' : 'error',
      })
    } finally {
      setUnlocking(false)
    }
  }

  const handleLogout = async () => {
    await logoutRequest()
    logout()
    markAppLocked()
    window.location.href = LOGIN_PATH
  }

  return (
    <>
      {children}

      {user && locked && (
        <div className="fixed inset-0 z-[9999] flex min-h-[100dvh] items-center justify-center bg-slate-950 px-4 py-6 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.38),_transparent_42%),linear-gradient(160deg,_rgba(15,23,42,1),_rgba(49,46,129,0.95))]" />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/15 bg-white/10 p-5 text-center shadow-2xl backdrop-blur-md">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-violet-700">
              <LockKeyhole size={26} />
            </div>
            <div className="mb-1 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-100">
              <ShieldCheck size={14} />
              SelfMoney protegido
            </div>
            <h2 className="text-2xl font-semibold">App bloqueado</h2>
            <p className="mt-2 text-sm leading-relaxed text-violet-100">
              Confirme sua identidade para voltar às suas informações financeiras.
            </p>

            <Button
              fullWidth
              size="lg"
              loading={unlocking}
              onClick={handleUnlock}
              leftIcon={!unlocking ? <Fingerprint size={18} /> : undefined}
              className="mt-6 h-12 rounded-xl bg-white text-violet-800 hover:bg-violet-50"
            >
              Desbloquear com Face ID
            </Button>
            <Button
              fullWidth
              variant="ghost"
              onClick={handleLogout}
              leftIcon={<LogOut size={16} />}
              className="mt-2 h-11 rounded-xl text-violet-100 hover:bg-white/10 hover:text-white"
            >
              Sair e usar senha
            </Button>
          </div>
        </div>
      )}

      <AlertModal
        open={Boolean(alert)}
        title={alert?.title || ''}
        message={alert?.message || ''}
        tone={alert?.tone}
        onClose={() => setAlert(null)}
      />
    </>
  )
}
