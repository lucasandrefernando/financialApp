import { useEffect } from 'react'

function isIOSLike() {
  if (typeof navigator === 'undefined') return false

  const platform = navigator.platform || ''
  const userAgent = navigator.userAgent || ''
  const isTouchMac = platform === 'MacIntel' && navigator.maxTouchPoints > 1

  return /iPad|iPhone|iPod/.test(userAgent) || isTouchMac
}

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select'))
}

function stabilizeViewport() {
  const active = document.activeElement
  if (active instanceof HTMLElement && isEditableElement(active)) return

  const scrollX = window.scrollX
  const scrollY = window.scrollY
  const mainScroller = document.querySelector('main.overflow-y-auto') as HTMLElement | null
  const mainScrollTop = mainScroller?.scrollTop ?? null

  window.scrollTo(scrollX, scrollY)

  if (mainScroller && mainScrollTop !== null) {
    mainScroller.scrollTop = mainScrollTop
  }

  requestAnimationFrame(() => {
    window.scrollTo(scrollX, scrollY)
    if (mainScroller && mainScrollTop !== null) {
      mainScroller.scrollTop = mainScrollTop
    }
  })
}

export function useIOSViewportReset() {
  useEffect(() => {
    if (!isIOSLike()) return

    let timers: number[] = []

    const clearTimers = () => {
      timers.forEach(timer => window.clearTimeout(timer))
      timers = []
    }

    const scheduleReset = (event: FocusEvent) => {
      if (!isEditableElement(event.target)) return

      clearTimers()
      timers = [
        window.setTimeout(stabilizeViewport, 120),
        window.setTimeout(stabilizeViewport, 280),
        window.setTimeout(stabilizeViewport, 520),
      ]
    }

    document.addEventListener('focusout', scheduleReset, true)

    return () => {
      clearTimers()
      document.removeEventListener('focusout', scheduleReset, true)
    }
  }, [])
}
