import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { syncService } from '../../services/sync'
import { syncFinancialQueries } from './financialSync'

const POLL_INTERVAL_MS = 10_000

function canPoll() {
  return (
    typeof document !== 'undefined' &&
    document.visibilityState === 'visible' &&
    (typeof navigator === 'undefined' || navigator.onLine !== false)
  )
}

export function useFinancialPollingSync() {
  const queryClient = useQueryClient()
  const user = useAuthStore(state => state.user)
  const lastVersionRef = useRef<number | null>(null)
  const syncingRef = useRef(false)

  useEffect(() => {
    if (!user) {
      lastVersionRef.current = null
      return
    }

    let stopped = false
    let timer: number | undefined

    const schedule = (delay = POLL_INTERVAL_MS) => {
      window.clearTimeout(timer)
      timer = window.setTimeout(checkVersion, delay)
    }

    const checkVersion = async () => {
      if (stopped) return

      if (!canPoll()) {
        schedule()
        return
      }

      try {
        const { version } = await syncService.version()
        const previousVersion = lastVersionRef.current
        lastVersionRef.current = version

        if (previousVersion !== null && version > previousVersion && !syncingRef.current) {
          syncingRef.current = true
          try {
            await syncFinancialQueries(queryClient)
          } finally {
            syncingRef.current = false
          }
        }
      } catch {
        // Keep polling quiet. Auth/API interceptors handle expired sessions.
      } finally {
        schedule()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        schedule(250)
      }
    }

    const handleOnline = () => schedule(250)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    checkVersion()

    return () => {
      stopped = true
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
    }
  }, [queryClient, user])
}
