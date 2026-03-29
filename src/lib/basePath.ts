const KINGHOST_BASE_PATH = '/financialApp'

export function normalizeBasePath(value: string | undefined) {
  if (!value || value === '/') return '/'
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.replace(/\/+$/, '')
}

function isLocalHost(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1'
  )
}

export function resolveAppBasePath(configValue: string | undefined) {
  const explicit = normalizeBasePath(configValue)
  if (explicit !== '/') return explicit

  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname || ''
    const startsAtKingHostPath =
      pathname === KINGHOST_BASE_PATH ||
      pathname.startsWith(`${KINGHOST_BASE_PATH}/`)

    if (startsAtKingHostPath) return KINGHOST_BASE_PATH
    if (!isLocalHost(window.location.hostname)) return KINGHOST_BASE_PATH
  }

  return '/'
}

export function toBasePrefix(basePath: string) {
  return basePath === '/' ? '' : basePath
}

