import { clsx } from 'clsx'
import { formatCurrency } from '@/utils/formatters'

interface AmountDisplayProps {
  amount: number
  currency?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  colorCoded?: boolean
  showSign?: boolean
  className?: string
}

const sizeMap = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl font-bold',
  xl: 'text-3xl font-bold',
}

export function AmountDisplay({ amount, currency = 'BRL', size = 'md', colorCoded = true, showSign = false, className }: AmountDisplayProps) {
  const formatted = formatCurrency(Math.abs(amount), currency)
  const isNegative = amount < 0
  const isZero = amount === 0

  const colorClass = colorCoded
    ? isZero
      ? 'text-slate-400'
      : isNegative
        ? 'text-error-500'
        : 'text-success-500'
    : 'text-slate-900 dark:text-slate-100'

  return (
    <span
      className={clsx('tabular-nums', sizeMap[size], colorClass, className)}
      aria-label={`${isNegative ? 'despesa de' : 'receita de'} ${formatted}`}
    >
      {showSign && !isNegative && amount > 0 && '+ '}
      {isNegative && '- '}
      {formatted}
    </span>
  )
}
