import { cn } from '../../lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  showPercentage?: boolean
  className?: string
}

export function ProgressBar({ value, max = 100, showPercentage = false, className }: ProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const barColor = pct >= 80 ? 'bg-red-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className={cn('w-full', className)}>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showPercentage && (
        <p className={cn('text-xs font-medium mt-1', pct >= 80 ? 'text-red-500' : pct >= 60 ? 'text-yellow-500' : 'text-green-500')}>
          {Math.round(pct)}%
        </p>
      )}
    </div>
  )
}
