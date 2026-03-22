import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Formata um valor para moeda com localização
 * @param value - Valor numérico
 * @param locale - Localização (padrão: pt-BR)
 * @param currency - Código da moeda (padrão: BRL)
 */
export function formatCurrency(value: number, locale = 'pt-BR', currency = 'BRL'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Formata um valor como percentual
 * @param value - Valor entre 0-100
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}

/**
 * Formatação de data em formato curto (ex: 12 Mar)
 */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM', { locale: ptBR })
}

/**
 * Formatação de data em formato longo (ex: 12 de março de 2026)
 */
export function formatDateLong(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

/**
 * Formatação de data para input HTML (YYYY-MM-DD)
 */
export function formatDateInput(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'yyyy-MM-dd')
}

/**
 * Formatação relativa de data (ex: "há 2 horas")
 */
export function formatDateRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR })
}

/**
 * Formatação smart de data (hoje, ontem, ou data curta)
 */
export function formatDateSmart(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  
  if (isToday(d)) return 'Hoje'
  if (isYesterday(d)) return 'Ontem'
  
  return formatDateShort(d)
}

/**
 * Formatação de hora (ex: 14:30)
 */
export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'HH:mm', { locale: ptBR })
}

/**
 * Formatação completa de data e hora
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR })
}

/**
 * Retorna uma saudação baseada na hora do dia
 */
export function getGreeting(): string {
  const hour = new Date().getHours()
  
  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

/**
 * Trunca um texto com reticências
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

/**
 * Formata um número com separador de milhar
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Normaliza nomes de meses
 */
export function getMonthName(month: number): string {
  return format(new Date(2020, month - 1), 'MMMM', { locale: ptBR })
}

/**
 * Retorna o nome do mês em maiúscula
 */
export function getMonthNameCapitalized(month: number): string {
  const name = getMonthName(month)
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/**
 * Formata intervalo de datas (ex: "12 - 31 de Mar de 2026")
 */
export function formatDateRange(startDate: string | Date, endDate: string | Date): string {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate
  
  const startStr = format(start, 'dd', { locale: ptBR })
  const endStr = format(end, "dd 'de' MMM 'de' yyyy", { locale: ptBR })
  
  return `${startStr} - ${endStr}`
}
