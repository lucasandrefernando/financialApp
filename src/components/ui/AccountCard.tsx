import { clsx } from 'clsx'
import { Building2, PiggyBank, TrendingUp, Wallet, Smartphone, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/utils/formatters'
import type { AccountSummary } from '@/types/database'

interface AccountCardProps {
  account: AccountSummary
  onClick?: () => void
  compact?: boolean
}

const accountTypeLabel: Record<string, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  investment: 'Investimento',
  cash: 'Dinheiro',
  digital_wallet: 'Carteira Digital',
}

const accountTypeIcon: Record<string, React.ReactNode> = {
  checking: <Building2 size={18} />,
  savings: <PiggyBank size={18} />,
  investment: <TrendingUp size={18} />,
  cash: <Wallet size={18} />,
  digital_wallet: <Smartphone size={18} />,
}

export function AccountCard({ account, onClick, compact = false }: AccountCardProps) {
  const { name, type, bank_name, balance, color } = account
  const isNegative = balance < 0

  // Versão lista (usada no dashboard e em listas)
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150',
        'hover:bg-slate-50 dark:hover:bg-slate-700/40',
        compact && 'py-3'
      )}
    >
      {/* Ícone colorido */}
      <div
        className="h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center text-white"
        style={{ backgroundColor: color }}
      >
        {accountTypeIcon[type]}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{name}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
          {bank_name ? `${bank_name} · ` : ''}{accountTypeLabel[type]}
        </p>
      </div>

      {/* Saldo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <p className={clsx(
          'text-sm font-bold tabular-nums',
          isNegative ? 'text-error-500' : 'text-slate-900 dark:text-slate-100'
        )}>
          {formatCurrency(balance)}
        </p>
        {onClick && <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />}
      </div>
    </button>
  )
}
