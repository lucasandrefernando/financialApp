/**
 * Índice de utilitários
 * Exporta todos os utilitários da aplicação
 */

export * from './formatters'
export * from './validators'
export * from './constants'

/**
 * Utilitário para combinar classes CSS
 */
export { clsx } from 'clsx'
export { twMerge } from 'tailwind-merge'

/**
 * Função helper para mergear classes tailwind
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
