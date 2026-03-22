import { useState } from 'react'
import { Settings } from 'lucide-react'
import { Modal } from './Modal'
import { NotificationList } from './NotificationList'
import { NotificationSettings } from './NotificationSettings'
import clsx from 'clsx'

interface NotificationsPanelProps {
  open: boolean
  onClose: () => void
}

/**
 * Painel completo de notificações com abas
 */
export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const [tab, setTab] = useState<'notifications' | 'settings'>('notifications')

  return (
    <Modal open={open} onClose={onClose} title="Notificações" size="lg">
      <div className="space-y-4">
        {/* Abas */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setTab('notifications')}
            className={clsx(
              'px-4 py-2 font-medium border-b-2 transition-colors',
              tab === 'notifications'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            )}
          >
            📬 Notificações
          </button>
          <button
            onClick={() => setTab('settings')}
            className={clsx(
              'px-4 py-2 font-medium border-b-2 transition-colors',
              tab === 'settings'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            )}
          >
            <Settings className="inline mr-2" size={16} />
            Configurações
          </button>
        </div>

        {/* Conteúdo */}
        <div className="max-h-[70vh] overflow-y-auto">
          {tab === 'notifications' && (
            <NotificationList maxItems={50} showHeader={false} showMarkAllRead={true} />
          )}
          {tab === 'settings' && <NotificationSettings />}
        </div>
      </div>
    </Modal>
  )
}

export default NotificationsPanel
