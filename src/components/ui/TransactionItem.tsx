import { clsx } from 'clsx'
import { AmountDisplay } from './AmountDisplay'
import { CategoryIcon } from './CategoryIcon'
import { formatDateShort, formatDateSmart } from '@/utils/formatters'
import type { RecentTransaction } from '@/types/database'

interface TransactionItemProps {
  transaction: RecentTransaction
  onClick?: () => void
}

const typeColors = {
  income: 'bg-success-100 text-success-500',
  expense: 'bg-error-100 text-error-500',
  transfer: 'bg-info-100 text-info-500',
}

export function TransactionItem({ transaction, onClick }: TransactionItemProps) {
  const { description, amount, type, transaction_date, account_name, category_name, category_icon, category_color } = transaction

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-[10px] hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-150 text-left"
      aria-label={`${type === 'income' ? 'Receita' : 'Despesa'}: ${description}, ${formatDateSmart(transaction_date)}`}
    >
      <div
        className={clsx('h-10 w-10 rounded-full flex items-center justify-center text-base flex-shrink-0', typeColors[type])}
        style={category_color ? { backgroundColor: category_color + '20', color: category_color } : undefined}
      >
        <CategoryIcon name={category_icon} size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{description}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {account_name && <span>{account_name}</span>}
          {account_name && category_name && <span className="mx-1">·</span>}
          {category_name && <span>{category_name}</span>}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <AmountDisplay
          amount={type === 'income' ? amount : -amount}
          size="sm"
          colorCoded
        />
        <p className="text-xs text-slate-400 mt-0.5">{formatDateShort(transaction_date)}</p>
      </div>
    </button>
  )
}
