import { resolveAppBasePath, toBasePrefix } from './basePath'

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '')
}

export function resolveApiBaseUrl() {
  const explicit = trimTrailingSlashes((import.meta.env.VITE_API_URL || '').trim())
  if (explicit) return explicit

  const appBasePath = resolveAppBasePath(import.meta.env.VITE_APP_BASE_PATH)
  return trimTrailingSlashes(toBasePrefix(appBasePath))
}

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const baseUrl = resolveApiBaseUrl()
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath
}
