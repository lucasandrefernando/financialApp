import { Search, Inbox, Loader } from 'lucide-react'
import { useState } from 'react'
import { useNotifications, useMarkAllAsRead } from '@/hooks/api/useCategoriesAndNotifications'
import { useToast } from '@/components/ui/Toast'
import { NotificationItem } from './NotificationItem'
import { Button } from './Button'
import clsx from 'clsx'

interface NotificationListProps {
  maxItems?: number
  showHeader?: boolean
  showMarkAllRead?: boolean
}

/**
 * Lista de notificações com filtros
 */
export function NotificationList({
  maxItems = 20,
  showHeader = true,
  showMarkAllRead = true,
}: NotificationListProps) {
  const { data: notifications = [], isLoading } = useNotifications()
  const { mutate: markAllAsRead, isPending: markingAll } = useMarkAllAsRead()
  const { success } = useToast()
  const [filterType, setFilterType] = useState<string | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Filtrar notificações
  const filtered = notifications
    .filter((n) => filterType === 'all' || n.type === filterType)
    .filter((n) => n.title.toLowerCase().includes(searchTerm.toLowerCase()) || n.message.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, maxItems)

  const unreadCount = notifications.filter((n) => n.status === 'unread').length
  const notificationTypes = Array.from(new Set(notifications.map((n) => n.type)))

  const handleMarkAllAsRead = () => {
    markAllAsRead(undefined, {
      onSuccess: () => success('✓ Todas marcadas como lidas'),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="animate-spin" size={24} />
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox size={48} className="text-slate-300 dark:text-slate-600 mb-3" />
        <p className="text-slate-600 dark:text-slate-400 font-medium">Nenhuma notificação</p>
        <p className="text-sm text-slate-500 dark:text-slate-500">Você está em dia com tudo!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Notificações
            </h2>
            {unreadCount > 0 && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {showMarkAllRead && unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleMarkAllAsRead}
              loading={markingAll}
            >
              Marcar tudo como lido
            </Button>
          )}
        </div>
      )}

      {/* Busca */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Buscar notificações..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Filtros por tipo */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterType('all')}
          className={clsx(
            'px-3 py-1 rounded-full text-sm font-medium transition-colors',
            filterType === 'all'
              ? 'bg-primary-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          )}
        >
          Todas ({notifications.length})
        </button>
        {notificationTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={clsx(
              'px-3 py-1 rounded-full text-sm font-medium transition-colors',
              filterType === type
                ? 'bg-primary-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            )}
          >
            {type} ({notifications.filter((n) => n.type === type).length})
          </button>
        ))}
      </div>

      {/* Lista de notificações */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((notification) => <NotificationItem key={notification.id} notification={notification} />)
        ) : (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            Nenhuma notificação encontrada
          </div>
        )}
      </div>

      {/* Mostrar mais */}
      {filtered.length < notifications.filter((n) => filterType === 'all' || n.type === filterType).length && (
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Implementar pagination se necessário
            }}
          >
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  )
}

export default NotificationList
