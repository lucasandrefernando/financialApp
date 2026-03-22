import { clsx } from 'clsx'

interface ProgressBarProps {
  current: number
  total: number
  alertThreshold?: number
  label?: string
  showPercentage?: boolean
  showValues?: boolean
  size?: 'sm' | 'md'
  currency?: string
}

export function ProgressBar({ current, total, alertThreshold = 80, label, showPercentage = true, showValues = true, size = 'md', currency = 'BRL' }: ProgressBarProps) {
  const percent = total > 0 ? Math.min((current / total) * 100, 100) : 0
  const isAlert = percent >= alertThreshold && percent < 100
  const isExceeded = current > total

  const barColor = isExceeded
    ? 'bg-error-500'
    : isAlert
      ? 'bg-warning-500'
      : 'bg-success-500'

  const trackColor = 'bg-slate-100 dark:bg-slate-700'

  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency })

  return (
    <div className="w-full space-y-1.5">
      {(label || showValues) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>}
          {showValues && (
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {formatter.format(current)} / {formatter.format(total)}
            </span>
          )}
        </div>
      )}
      <div className={clsx('w-full rounded-full overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2.5', trackColor)}>
        <div
          className={clsx('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${Math.min(percent, 100)}%` }}
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showPercentage && (
        <p className={clsx('text-xs font-medium tabular-nums', isExceeded ? 'text-error-500' : isAlert ? 'text-warning-500' : 'text-success-500')}>
          {Math.round(percent)}%{isExceeded ? ' (excedido)' : ''}
        </p>
      )}
    </div>
  )
}
