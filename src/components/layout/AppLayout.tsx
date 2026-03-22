import { type ReactNode, useState } from 'react'
import { Sidebar } from './Sidebar'
import { BottomTab } from './BottomTab'
import { Header } from './Header'
import { NotificationsPanel } from '@/components/ui/NotificationsPanel'

interface AppLayoutProps {
  children: ReactNode
  title?: string
  showMonthNav?: boolean
  showSearch?: boolean
  onSearch?: (term: string) => void
}

export function AppLayout({ children, title, showMonthNav, showSearch, onSearch }: AppLayoutProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          title={title} 
          showMonthNav={showMonthNav} 
          showSearch={showSearch} 
          onSearch={onSearch}
          onNotificationClick={() => setNotificationsOpen(true)}
        />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
      <BottomTab />
      <NotificationsPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </div>
  )
}