import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { Home, List, PieChart, Target, User } from 'lucide-react'

const tabs = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/transactions', icon: List, label: 'Transações' },
  { to: '/budgets', icon: PieChart, label: 'Orçamentos' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/profile', icon: User, label: 'Perfil' },
]

export function BottomTab() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => clsx(
              'flex flex-col items-center justify-center gap-1 flex-1 h-full text-xs font-medium transition-colors',
              isActive
                ? 'text-primary-500'
                : 'text-slate-400 dark:text-slate-500'
            )}
            aria-label={label}
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
