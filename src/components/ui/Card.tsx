import { type ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface CardProps {
  children: ReactNode
  title?: string
  className?: string
  onClick?: () => void
}

export function Card({ children, title, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border border-gray-100 shadow-sm',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow duration-150',
        className
      )}
    >
      {title && (
        <div className="px-4 pt-4 pb-2 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        </div>
      )}
      {children}
    </div>
  )
}
