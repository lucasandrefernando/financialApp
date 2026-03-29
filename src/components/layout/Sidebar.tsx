import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, ArrowLeftRight, CreditCard, Target, User, PieChart, LogOut } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { cn } from '../../lib/utils'
import { BrandIcon, BrandWordmark } from '../brand/Brand'
import { logout as logoutRequest } from '../../services/auth'
import { useAuthStore } from '../../stores/authStore'

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/accounts', icon: CreditCard, label: 'Contas' },
  { to: '/budgets', icon: PieChart, label: 'Orçamentos' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/profile', icon: User, label: 'Perfil' },
]

export function Sidebar() {
  const { sidebarCollapsed } = useAppStore()
  const storeLogout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await logoutRequest()
    } catch {
      // Ignore network errors and force local logout for a consistent UX.
    } finally {
      storeLogout()
      navigate('/login', { replace: true })
      setIsLoggingOut(false)
    }
  }

  return (
    <aside className={cn(
      'hidden lg:flex flex-col h-screen bg-white border-r border-gray-100 transition-all duration-300 flex-shrink-0',
      sidebarCollapsed ? 'w-16' : 'w-60'
    )}>
      <div className="flex h-16 items-center justify-center border-b border-gray-100 px-3">
        {sidebarCollapsed ? (
          <BrandIcon size="sm" />
        ) : (
          <BrandWordmark size="sm" className="justify-center" />
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-violet-50 text-violet-600'
                    : 'text-gray-600 hover:bg-gray-100',
                  sidebarCollapsed && 'justify-center px-0'
                )}
                title={sidebarCollapsed ? label : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!sidebarCollapsed && <span>{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-gray-100 p-2">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={cn(
            'flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
            'text-rose-600 hover:bg-rose-50 disabled:opacity-60',
            sidebarCollapsed && 'justify-center px-0'
          )}
          title={sidebarCollapsed ? 'Sair' : undefined}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!sidebarCollapsed && <span>{isLoggingOut ? 'Saindo...' : 'Sair'}</span>}
        </button>
      </div>
    </aside>
  )
}
