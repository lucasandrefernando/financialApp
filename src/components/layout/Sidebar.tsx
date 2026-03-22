import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { Home, List, PieChart, Target, User, TrendingUp, ChevronLeft, ChevronRight, Landmark } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/profile/accounts', icon: Landmark, label: 'Contas' },
  { to: '/transactions', icon: List, label: 'Transações' },
  { to: '/budgets', icon: PieChart, label: 'Orçamentos' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/reports', icon: TrendingUp, label: 'Relatórios' },
]

const bottomItems = [
  { to: '/profile', icon: User, label: 'Perfil' },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  return (
    <aside
      className={clsx(
        'hidden lg:flex flex-col h-screen bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700',
        'transition-all duration-300 flex-shrink-0',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className={clsx('flex items-center h-16 px-4 border-b border-slate-100 dark:border-slate-700', sidebarCollapsed ? 'justify-center' : 'justify-between')}>
        {!sidebarCollapsed && (
          <span className="font-bold text-primary-500 text-lg">FinanceApp</span>
        )}
        <button
          onClick={toggleSidebar}
          className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
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
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 px-3 h-10 rounded-[10px] text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700',
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

      <div className="py-4 px-2 border-t border-slate-100 dark:border-slate-700">
        {bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 h-10 rounded-[10px] text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700',
              sidebarCollapsed && 'justify-center px-0'
            )}
            title={sidebarCollapsed ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!sidebarCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </div>
    </aside>
  )
}