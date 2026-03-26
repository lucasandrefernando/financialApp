import { NavLink } from 'react-router-dom'
import { Home, ArrowLeftRight, CreditCard, Target, User, PieChart, ChevronLeft, ChevronRight, Wallet } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/accounts', icon: CreditCard, label: 'Contas' },
  { to: '/budgets', icon: PieChart, label: 'Orçamentos' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/profile', icon: User, label: 'Perfil' },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  return (
    <aside className={cn(
      'hidden lg:flex flex-col h-screen bg-white border-r border-gray-100 transition-all duration-300 flex-shrink-0',
      sidebarCollapsed ? 'w-16' : 'w-60'
    )}>
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-gray-100',
        sidebarCollapsed ? 'justify-center' : 'justify-between'
      )}>
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <Wallet size={20} className="text-indigo-600" />
            <span className="font-bold text-indigo-600 text-lg">FinanceApp</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
          aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
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
                    ? 'bg-indigo-50 text-indigo-600'
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
    </aside>
  )
}
