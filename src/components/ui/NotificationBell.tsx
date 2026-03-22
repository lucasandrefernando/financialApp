import { Bell, Loader } from 'lucide-react'
import { useUnreadCount } from '@/hooks/api/useCategoriesAndNotifications'
import clsx from 'clsx'

interface NotificationBellProps {
  onClick?: () => void
  className?: string
  showLabel?: boolean
}

/**
 * Ícone de notificações com badge de contador
 */
export function NotificationBell({ onClick, className, showLabel = false }: NotificationBellProps) {
  const { data: unreadCount = 0, isLoading } = useUnreadCount()

  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative h-10 w-10 rounded-full flex items-center justify-center',
        'text-slate-600 dark:text-slate-400',
        'hover:bg-slate-100 dark:hover:bg-slate-700',
        'transition-colors',
        className
      )}
      aria-label="Notificações"
    >
      {isLoading ? (
        <Loader size={20} className="animate-spin" />
      ) : (
        <>
          <Bell size={20} />
          {unreadCount > 0 && (
            <span
              className={clsx(
                'absolute top-0 right-0 h-5 w-5 rounded-full',
                'bg-error-500 text-white text-xs font-bold',
                'flex items-center justify-center',
                unreadCount > 99 ? 'text-[10px]' : ''
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </>
      )}
      {showLabel && (
        <span className="ml-2 text-sm font-medium">
          {unreadCount > 0 && `${unreadCount}`}
        </span>
      )}
    </button>
  )
}

export default NotificationBell
