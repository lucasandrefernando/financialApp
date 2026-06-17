const APP_LOCK_ENABLED_KEY = 'selfmoney_app_lock_enabled'
const APP_LOCK_DELAY_KEY = 'selfmoney_app_lock_delay_seconds'
const APP_LOCK_LOCKED_KEY = 'selfmoney_app_lock_locked'
const APP_LOCK_BACKGROUND_AT_KEY = 'selfmoney_app_lock_background_at'
const APP_LOCK_LAST_UNLOCK_AT_KEY = 'selfmoney_app_lock_last_unlock_at'

export type AppLockDelaySeconds = 0 | 60 | 300

export interface AppLockSettings {
  enabled: boolean
  delaySeconds: AppLockDelaySeconds
}

export const APP_LOCK_DELAY_OPTIONS: Array<{ value: AppLockDelaySeconds; label: string }> = [
  { value: 0, label: 'Imediatamente' },
  { value: 60, label: 'Após 1 minuto' },
  { value: 300, label: 'Após 5 minutos' },
]

function readDelay(value: string | null): AppLockDelaySeconds {
  if (value === '60') return 60
  if (value === '300') return 300
  return 0
}

export function getAppLockSettings(): AppLockSettings {
  return {
    enabled: localStorage.getItem(APP_LOCK_ENABLED_KEY) === '1',
    delaySeconds: readDelay(localStorage.getItem(APP_LOCK_DELAY_KEY)),
  }
}

export function saveAppLockSettings(settings: AppLockSettings) {
  localStorage.setItem(APP_LOCK_ENABLED_KEY, settings.enabled ? '1' : '0')
  localStorage.setItem(APP_LOCK_DELAY_KEY, String(settings.delaySeconds))
  if (!settings.enabled) clearAppLockState()
}

export function markAppBackgrounded() {
  localStorage.setItem(APP_LOCK_BACKGROUND_AT_KEY, String(Date.now()))
}

export function markAppLocked() {
  localStorage.setItem(APP_LOCK_LOCKED_KEY, '1')
}

export function clearAppLockState() {
  localStorage.removeItem(APP_LOCK_LOCKED_KEY)
  localStorage.removeItem(APP_LOCK_BACKGROUND_AT_KEY)
}

export function markAppUnlocked() {
  clearAppLockState()
  localStorage.setItem(APP_LOCK_LAST_UNLOCK_AT_KEY, String(Date.now()))
}

export function shouldLockApp(settings = getAppLockSettings()) {
  if (!settings.enabled) return false
  if (localStorage.getItem(APP_LOCK_LOCKED_KEY) === '1') return true

  const backgroundAt = Number(localStorage.getItem(APP_LOCK_BACKGROUND_AT_KEY) || 0)
  if (!backgroundAt) return false

  const elapsedMs = Date.now() - backgroundAt
  return elapsedMs >= settings.delaySeconds * 1000
}

export function wasRecentlyUnlocked(thresholdMs = 2500) {
  const lastUnlockAt = Number(localStorage.getItem(APP_LOCK_LAST_UNLOCK_AT_KEY) || 0)
  return lastUnlockAt > 0 && Date.now() - lastUnlockAt < thresholdMs
}
