import { Trash2, CheckCircle2, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMarkAsRead, useDismissNotification } from '@/hooks/api/useCategoriesAndNotifications'
import { useToast } from '@/components/ui/Toast'
import type { Notification } from '@/types/database'
import clsx from 'clsx'

interface NotificationItemProps {
  notification: Notification
  onClick?: () => void
}

const notificationIcons: Record<string, string> = {
  budget_alert: '💰',
  goal_reached: '🎉',
  bill_due: '📅',
  large_expense: '⚠️',
  low_balance: '📉',
  recurring_created: '🔄',
  installment_due: '💳',
  general: 'ℹ️',
}

const notificationColors: Record<string, string> = {
  budget_alert: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  goal_reached: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  bill_due: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  large_expense: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  low_balance: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  recurring_created: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  installment_due: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
  general: 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800',
}

/**
 * Item individual de notificação
 */
export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const { mutate: markAsRead, isPending: readPending } = useMarkAsRead()
  const { mutate: dismiss, isPending: dismissPending } = useDismissNotification()
  const { success } = useToast()

  const isUnread = notification.status === 'unread'
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ptBR,
  })

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isUnread) {
      markAsRead(notification.id, {
        onSuccess: () => success('✓ Marcado como lido'),
      })
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    dismiss(notification.id, {
      onSuccess: () => success('✓ Notificação removida'),
    })
  }

  const icon = notificationIcons[notification.type] || '📢'
  const colorClass = notificationColors[notification.type] || notificationColors.general

  return (
    <div
      onClick={onClick}
      className={clsx(
        'flex items-start gap-3 p-4 border rounded-lg',
        'cursor-pointer transition-all',
        'hover:shadow-md',
        colorClass,
        isUnread && 'ring-2 ring-offset-1'
      )}
    >
      <div className="text-2xl mt-1">{icon}</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              {notification.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
              {notification.message}
            </p>
          </div>
          {isUnread && (
            <div className="h-2 w-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-current border-opacity-10">
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Clock size={12} />
            {timeAgo}
          </div>

          <div className="flex items-center gap-2">
            {isUnread && (
              <button
                onClick={handleMarkAsRead}
                disabled={readPending}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors disabled:opacity-50"
                aria-label="Marcar como lido"
              >
                <CheckCircle2 size={16} className="text-slate-600 dark:text-slate-400" />
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={dismissPending}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors disabled:opacity-50"
              aria-label="Remover"
            >
              <Trash2 size={16} className="text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationItem
