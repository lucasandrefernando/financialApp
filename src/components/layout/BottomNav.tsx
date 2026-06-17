import { NavLink } from 'react-router-dom'
import { Home, ArrowLeftRight, CreditCard, PieChart, Target, User } from 'lucide-react'
import { cn } from '../../lib/utils'

const tabs = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/accounts', icon: CreditCard, label: 'Contas' },
  { to: '/budgets', icon: PieChart, label: 'Orçamentos' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/profile', icon: User, label: 'Perfil' },
]

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-950/95 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid h-16 grid-cols-6 items-center">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'flex h-full min-w-0 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
              isActive ? 'text-violet-600 dark:text-violet-200' : 'text-gray-400 dark:text-slate-500'
            )}
          >
            {({ isActive }) => (
              <>
                <Icon size={19} strokeWidth={isActive ? 2.5 : 1.75} />
                <span className="max-w-full truncate px-0.5 text-[9px] leading-tight">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
