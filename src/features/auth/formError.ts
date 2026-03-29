import type { FieldErrors } from 'react-hook-form'

export function getFirstFormErrorMessage(errors: FieldErrors<any>, fallback: string) {
  const queue: any[] = Object.values(errors || {})

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) continue
    if (typeof current.message === 'string' && current.message.trim()) {
      return current.message
    }
    if (typeof current === 'object') {
      queue.push(...Object.values(current))
    }
  }

  return fallback
}

