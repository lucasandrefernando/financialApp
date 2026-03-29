import { cn } from '../../lib/utils'

interface BadgeProps {
  children: React.ReactNode
  color?: 'gray' | 'green' | 'red' | 'yellow' | 'blue' | 'indigo' | 'purple'
  className?: string
}

const colorMap: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  blue: 'bg-violet-100 text-violet-700',
  indigo: 'bg-violet-100 text-violet-700',
  purple: 'bg-purple-100 text-purple-700',
}

export function Badge({ children, color = 'gray', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colorMap[color], className)}>
      {children}
    </span>
  )
}
