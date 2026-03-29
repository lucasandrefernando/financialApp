import { NavLink } from 'react-router-dom'
import { Home, ArrowLeftRight, CreditCard, Target, User } from 'lucide-react'
import { cn } from '../../lib/utils'

const tabs = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/accounts', icon: CreditCard, label: 'Contas' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/profile', icon: User, label: 'Perfil' },
]

export function BottomNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs font-medium transition-colors',
              isActive ? 'text-violet-600' : 'text-gray-400'
            )}
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                <span className="text-[10px]">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
