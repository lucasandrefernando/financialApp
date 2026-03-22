import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { TransactionItem } from '@/components/ui/TransactionItem'
import { EmptyState, SkeletonList } from '@/components/ui/EmptyState'
import { AddTransactionModal } from '@/components/forms/AddTransactionModal'
import { EditTransactionModal } from '@/components/forms/EditTransactionModal'
import { useTransactions } from '@/hooks/api/useTransactions'
import type { RecentTransaction } from '@/types/database'
import { useAppStore } from '@/stores/appStore'
import { clsx } from 'clsx'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import type { TransactionType } from '@/types/database'

const typeFilters: { label: string; value: TransactionType | undefined }[] = [
  { label: 'Todos', value: undefined },
  { label: 'Despesas', value: 'expense' },
  { label: 'Receitas', value: 'income' },
  { label: 'Transferências', value: 'transfer' },
]

export function TransactionListScreen() {
  const { selectedMonth } = useAppStore()
  const [addOpen, setAddOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<RecentTransaction | null>(null)
  const [activeType, setActiveType] = useState<TransactionType | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const startDate = format(startOfMonth(new Date(selectedMonth.year, selectedMonth.month - 1)), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(new Date(selectedMonth.year, selectedMonth.month - 1)), 'yyyy-MM-dd')

  const { data, isLoading } = useTransactions({
    type: activeType,
    start_date: startDate,
    end_date: endDate,
    search: search || undefined,
    page,
    page_size: 25,
  })

  const transactions = data?.data ?? []
  const totalCount = data?.count ?? 0

  return (
    <AppLayout title="Transações" showMonthNav showSearch onSearch={(t) => { setSearch(t); setPage(1) }}>
      <div className="p-4 lg:p-6 max-w-screen-xl mx-auto space-y-4">

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {typeFilters.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => { setActiveType(value); setPage(1) }}
                className={clsx(
                  'flex-shrink-0 h-8 px-3 rounded-full text-sm font-medium transition-colors',
                  activeType === value
                    ? 'bg-primary-500 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="hidden lg:flex flex-shrink-0 items-center gap-2 h-9 px-4 bg-primary-500 text-white rounded-[10px] text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            <Plus size={15} /> Nova Transação
          </button>
        </div>

        {isLoading ? (
          <SkeletonList count={8} />
        ) : transactions.length === 0 ? (
          <EmptyState
            title="Nenhuma transação"
            description="Use o botão '+ Nova Transação' para registrar uma movimentação"
          />
        ) : (
          <>
            <div className="bg-white dark:bg-slate-800 rounded-[16px] border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
              {transactions.map((tx) => (
                <TransactionItem key={tx.id} transaction={tx} onClick={() => setEditingTx(tx)} />
              ))}
            </div>

            {totalCount > 25 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  ‹
                </button>
                <span className="text-sm text-slate-500">
                  Página {page} de {Math.ceil(totalCount / 25)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(totalCount / 25)}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => setAddOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 h-14 w-14 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-fab hover:bg-primary-600 transition-colors z-30"
        aria-label="Adicionar transação"
      >
        <Plus size={24} />
      </button>

      <AddTransactionModal open={addOpen} onClose={() => setAddOpen(false)} />
      <EditTransactionModal transaction={editingTx} onClose={() => setEditingTx(null)} />
    </AppLayout>
  )
}
