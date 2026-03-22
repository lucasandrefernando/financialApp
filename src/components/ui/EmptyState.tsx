import { type ReactNode } from 'react'
import { clsx } from 'clsx'

interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: ReactNode
}

export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="mb-4 text-slate-300 dark:text-slate-600">
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-slate-700 dark:text-slate-300">{title}</p>
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-2 px-4 h-10 rounded-[10px] bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          + {actionLabel}
        </button>
      )}
    </div>
  )
}

interface SkeletonProps {
  className?: string
  count?: number
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={clsx('animate-pulse bg-slate-200 dark:bg-slate-700 rounded', className)} />
  )
}

export function SkeletonList({ count = 5 }: SkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}