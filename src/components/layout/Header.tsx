import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import { format, subMonths, addMonths, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface HeaderProps {
  title?: string
  showMonthNav?: boolean
  showSearch?: boolean
  onSearch?: (term: string) => void
  onNotificationClick?: () => void
}

export function Header({ title, showMonthNav = false, showSearch = false, onSearch, onNotificationClick }: HeaderProps) {
  const { profile } = useAuthStore()
  const { selectedMonth, setSelectedMonth } = useAppStore()
  const [searchOpen, setSearchOpen] = useState(false)

  const currentDate = startOfMonth(new Date(selectedMonth.year, selectedMonth.month - 1, 1))
  const monthLabel = format(currentDate, 'MMMM yyyy', { locale: ptBR })

  const prevMonth = () => {
    const prev = subMonths(currentDate, 1)
    setSelectedMonth(prev.getFullYear(), prev.getMonth() + 1)
  }

  const nextMonth = () => {
    const next = addMonths(currentDate, 1)
    setSelectedMonth(next.getFullYear(), next.getMonth() + 1)
  }

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {title && <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 capitalize">{title}</h1>}
        {showMonthNav && (
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="h-7 w-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize w-32 text-center">{monthLabel}</span>
            <button onClick={nextMonth} className="h-7 w-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showSearch && (
          <>
            {searchOpen ? (
              /* Fix #14: removed onBlur – use Escape key or X button to close */
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  placeholder="Buscar transações..."
                  onChange={(e) => onSearch?.(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); onSearch?.('') } }}
                  className="h-8 w-48 px-3 text-sm rounded-[8px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Buscar transações"
                />
                <button
                  onClick={() => { setSearchOpen(false); onSearch?.('') }}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Fechar busca"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button onClick={() => setSearchOpen(true)} className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" aria-label="Abrir busca">
                <Search size={16} />
              </button>
            )}
          </>
        )}

        <NotificationBell onClick={onNotificationClick} />

        <Link to="/profile" className="h-8 w-8 rounded-full overflow-hidden flex items-center justify-center bg-primary-100 text-primary-600 text-sm font-bold flex-shrink-0">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt={profile.full_name ?? ''} className="h-full w-full object-cover" />
            : <span>{(profile?.full_name ?? 'U').charAt(0).toUpperCase()}</span>
          }
        </Link>
      </div>
    </header>
  )
}
