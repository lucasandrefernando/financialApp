import { ChevronLeft, ChevronRight, Bell, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../../stores/appStore'
import { useAuthStore } from '../../stores/authStore'
import { formatMonth } from '../../utils/formatters'
import { BrandWordmark } from '../brand/Brand'

export function Header() {
  const { selectedMonth, setSelectedMonth, sidebarCollapsed, toggleSidebar } = useAppStore()
  const { user } = useAuthStore()

  const prevMonth = () => {
    const d = new Date(selectedMonth.year, selectedMonth.month - 2, 1)
    setSelectedMonth({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }

  const nextMonth = () => {
    const d = new Date(selectedMonth.year, selectedMonth.month, 1)
    setSelectedMonth({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }

  const monthLabel = formatMonth(selectedMonth.year, selectedMonth.month)

  return (
    <header className="relative h-14 flex items-center justify-between px-3 sm:px-4 bg-white border-b border-gray-100 sticky top-0 z-30 flex-shrink-0">
      <div className="flex min-w-[92px] items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="hidden lg:inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          title={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        <div className="lg:hidden">
          <BrandWordmark size="sm" />
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border border-slate-200/90 bg-slate-50/80 px-1.5 py-1 backdrop-blur-sm shadow-[0_6px_18px_-14px_rgba(15,23,42,0.35)]">
        <button
          onClick={prevMonth}
          className="h-6 w-6 rounded-full flex items-center justify-center text-gray-400 hover:bg-white hover:text-gray-600 transition-colors"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-[13px] sm:text-sm font-medium text-gray-700 capitalize w-32 sm:w-40 text-center">
          {monthLabel}
        </span>
        <button
          onClick={nextMonth}
          className="h-6 w-6 rounded-full flex items-center justify-center text-gray-400 hover:bg-white hover:text-gray-600 transition-colors"
          aria-label="Próximo mês"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="flex min-w-[92px] items-center justify-end gap-2">
        <button className="h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors relative">
          <Bell size={18} />
        </button>
        <Link
          to="/profile"
          className="h-8 w-8 rounded-full flex items-center justify-center bg-violet-100 text-violet-600 text-sm font-bold flex-shrink-0"
        >
          {user?.name?.charAt(0).toUpperCase() ?? 'U'}
        </Link>
      </div>
    </header>
  )
}
