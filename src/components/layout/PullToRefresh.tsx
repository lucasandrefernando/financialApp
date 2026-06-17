import { type ReactNode, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { syncFinancialQueries } from '../../hooks/api/financialSync'
import { cn } from '../../lib/utils'

interface PullToRefreshProps {
  children: ReactNode
}

const PULL_THRESHOLD = 82
const MAX_PULL = 112
const MIN_REFRESH_VISIBLE_MS = 600

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

export function PullToRefresh({ children }: PullToRefreshProps) {
  const queryClient = useQueryClient()
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const startYRef = useRef(0)
  const pullingRef = useRef(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const resetPull = () => setPullDistance(0)

  const canStartPull = (event: React.TouchEvent<HTMLDivElement>) => {
    if (refreshing || event.touches.length !== 1) return false
    const container = scrollContainerRef.current
    return Boolean(container && container.scrollTop <= 0)
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!canStartPull(event)) return
    startYRef.current = event.touches[0].clientY
    pullingRef.current = true
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!pullingRef.current) return

    const delta = event.touches[0].clientY - startYRef.current
    if (delta <= 0) {
      resetPull()
      return
    }

    const container = scrollContainerRef.current
    if (!container || container.scrollTop > 0) {
      pullingRef.current = false
      resetPull()
      return
    }

    event.preventDefault()
    setPullDistance(Math.min(delta * 0.55, MAX_PULL))
  }

  const handleTouchEnd = async () => {
    if (!pullingRef.current) return

    pullingRef.current = false
    if (pullDistance < PULL_THRESHOLD) {
      resetPull()
      return
    }

    setRefreshing(true)
    setPullDistance(PULL_THRESHOLD)

    try {
      await Promise.all([
        syncFinancialQueries(queryClient),
        wait(MIN_REFRESH_VISIBLE_MS),
      ])
    } finally {
      setRefreshing(false)
      resetPull()
    }
  }

  const readyToRefresh = pullDistance >= PULL_THRESHOLD

  return (
    <main
      ref={scrollContainerRef}
      className="relative min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        pullingRef.current = false
        resetPull()
      }}
    >
      <div
        className="pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-40 -translate-x-1/2 transition-[opacity,transform] duration-200 lg:hidden"
        style={{
          opacity: pullDistance > 8 || refreshing ? 1 : 0,
          transform: `translate(-50%, ${Math.max(0, pullDistance - 34)}px)`,
        }}
      >
        <div className="flex min-w-36 items-center justify-center gap-2 rounded-full border border-white/80 bg-white/92 px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/92 dark:text-slate-200">
          <RefreshCw
            size={15}
            className={cn(
              'text-violet-600 dark:text-violet-300',
              refreshing && 'animate-spin'
            )}
          />
          {refreshing ? 'Atualizando...' : readyToRefresh ? 'Solte para atualizar' : 'Puxe para atualizar'}
        </div>
      </div>

      <div
        className="transition-transform duration-200"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
        }}
      >
        {children}
      </div>
    </main>
  )
}
