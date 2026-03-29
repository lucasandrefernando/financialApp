import { ChevronLeft, ChevronRight, Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../../stores/appStore'
import { useAuthStore } from '../../stores/authStore'
import { formatMonth } from '../../utils/formatters'
import { BrandWordmark } from '../brand/Brand'

export function Header() {
  const { selectedMonth, setSelectedMonth } = useAppStore()
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
    <header className="h-14 flex items-center justify-between px-4 bg-white border-b border-gray-100 sticky top-0 z-30 flex-shrink-0">
      <div className="flex items-center gap-2 lg:hidden">
        <BrandWordmark size="sm" />
      </div>

      <div className="flex items-center gap-1 mx-auto lg:mx-0">
        <button
          onClick={prevMonth}
          className="h-7 w-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium text-gray-700 capitalize w-40 text-center">{monthLabel}</span>
        <button
          onClick={nextMonth}
          className="h-7 w-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2">
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
