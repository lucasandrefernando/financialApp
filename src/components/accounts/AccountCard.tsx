import { useState } from 'react'
import type { Account } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { formatCurrency } from '@/utils/formatters'
import { Banknote, CreditCard, Landmark, PiggyBank, Wallet, Trash2 } from 'lucide-react'

interface AccountCardProps {
  account: Account
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
  isDeleting?: boolean
}

const accountIcons = {
  checking: Landmark,
  savings: PiggyBank,
  investment: Banknote,
  credit: CreditCard,
  cash: Wallet,
  digital_wallet: Wallet,
}

const accountTypeLabel: Record<string, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  investment: 'Investimento',
  credit: 'Cartão de Crédito',
  cash: 'Dinheiro',
  digital_wallet: 'Carteira Digital',
}

export function AccountCard({ account, onEdit, onDelete, isDeleting }: AccountCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const IconComponent = accountIcons[account.type] ?? Landmark

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-[16px] border border-slate-100 dark:border-slate-700 overflow-hidden">
        {/* Header colorido */}
        <div
          className="px-4 pt-4 pb-6"
          style={{ backgroundColor: account.color || '#6366F1' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                <IconComponent className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-medium text-white/70">{accountTypeLabel[account.type]}</p>
                <p className="text-sm font-semibold text-white truncate max-w-[140px]">{account.name}</p>
              </div>
            </div>
            {account.bank_name && (
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full truncate max-w-[80px]">
                {account.bank_name}
              </span>
            )}
          </div>
        </div>

        {/* Saldo */}
        <div className="px-4 -mt-3">
          <div className="bg-white dark:bg-slate-900 rounded-[12px] shadow-sm border border-slate-100 dark:border-slate-700 px-4 py-3">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Saldo atual</p>
            <p className={`text-xl font-bold tabular-nums ${account.balance < 0 ? 'text-red-500' : 'text-slate-900 dark:text-slate-100'}`}>
              {formatCurrency(account.balance)}
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-slate-600 dark:text-slate-400"
            onClick={() => onEdit(account)}
          >
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Excluir conta"
        description={`Tem certeza que deseja excluir a conta "${account.name}"? Todas as transações vinculadas permanecerão, mas a conta será removida.`}
        confirmLabel="Excluir conta"
        loading={isDeleting}
        onConfirm={() => { onDelete(account); setConfirmOpen(false) }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
