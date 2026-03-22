import { type ReactNode } from 'react'
import { clsx } from 'clsx'

interface CardProps {
  children: ReactNode
  className?: string
  elevated?: boolean
  onClick?: () => void
}

export function Card({ children, className, elevated = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-[16px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700',
        elevated ? 'shadow-card' : 'shadow-sm',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow duration-150',
        className
      )}
    >
      {children}
    </div>
  )
}

interface FinanceCardProps {
  label: string
  value: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  trendPlaceholder?: string
  icon?: ReactNode
  color?: 'primary' | 'success' | 'error' | 'warning'
  loading?: boolean
  onClick?: () => void
}

const colorMap = {
  primary: 'text-primary-500',
  success: 'text-success-500',
  error: 'text-error-500',
  warning: 'text-warning-500',
}

export function FinanceCard({ label, value, trend, trendValue, trendPlaceholder, icon, color = 'primary', loading = false, onClick }: FinanceCardProps) {
  const trendColor = trend === 'up' ? 'text-success-500' : trend === 'down' ? 'text-error-500' : 'text-slate-500'

  if (loading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-7 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4" onClick={onClick}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</span>
        {icon && <span className={colorMap[color]}>{icon}</span>}
      </div>
      <p className={clsx('text-2xl font-bold tabular-nums', colorMap[color])}>{value}</p>
      <p className={clsx('text-xs mt-1 font-medium', trendValue ? trendColor : 'text-transparent select-none')}>
        {trendValue
          ? `${trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''} ${trendValue}`
          : trendPlaceholder ?? '·'}
      </p>
    </Card>
  )
}
