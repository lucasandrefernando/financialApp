import { type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { Header } from './Header'
import { PullToRefresh } from './PullToRefresh'

interface AppLayoutProps {
  children: ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-[100dvh] min-w-0 overflow-hidden bg-gray-50 transition-colors dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <PullToRefresh>
          {children}
        </PullToRefresh>
      </div>
      <BottomNav />
    </div>
  )
}
