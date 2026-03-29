import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarClock,
  Edit2,
  Filter,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useTransactions, useDeleteTransaction, useTransactionsSummary } from '../../hooks/api/useTransactions'
import { useAppStore } from '../../stores/appStore'
import { formatCurrency, formatDate, formatMonth } from '../../utils/formatters'
import { cn } from '../../lib/utils'
import { toast } from '../../components/ui/Toast'
import { Badge } from '../../components/ui/Badge'
import AddTransactionModal, { type TabType } from './AddTransactionModal'
import type { Transaction } from '../../types'

type TypeFilter = 'all' | 'expense' | 'income' | 'transfer'

const PAGE_SIZE = 20

const TYPES: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Receitas' },
  { value: 'transfer', label: 'Transferências' },
]

function getTypeVisual(type: Transaction['type']) {
  if (type === 'income') {
    return {
      label: 'Receita',
      icon: ArrowUpRight,
      amountClass: 'text-emerald-600',
      badgeColor: 'green' as const,
      iconWrapClass: 'bg-emerald-100 text-emerald-700',
      prefix: '+',
    }
  }

  if (type === 'transfer') {
    return {
      label: 'Transferência',
      icon: ArrowLeftRight,
      amountClass: 'text-sky-600',
      badgeColor: 'blue' as const,
      iconWrapClass: 'bg-sky-100 text-sky-700',
      prefix: '',
    }
  }

  return {
    label: 'Gasto',
    icon: ArrowDownLeft,
    amountClass: 'text-rose-600',
    badgeColor: 'red' as const,
    iconWrapClass: 'bg-rose-100 text-rose-700',
    prefix: '-',
  }
}

function getStatusVisual(status: Transaction['status']) {
  if (status === 'pending') return { label: 'Pendente', color: 'yellow' as const }
  if (status === 'scheduled') return { label: 'Agendada', color: 'blue' as const }
  if (status === 'cancelled') return { label: 'Cancelada', color: 'gray' as const }
  return null
}

function normalizeTransactions(data: unknown): Transaction[] {
  if (Array.isArray(data)) return data as Transaction[]

  if (data && typeof data === 'object') {
    const asObject = data as { transactions?: unknown; data?: unknown }
    if (Array.isArray(asObject.transactions)) return asObject.transactions as Transaction[]
    if (Array.isArray(asObject.data)) return asObject.data as Transaction[]
  }

  return []
}

function toAmount(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    let normalized = value.trim().replace(/\s/g, '')

    if (normalized.includes(',') && normalized.includes('.')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.')
    } else if (normalized.includes(',')) {
      normalized = normalized.replace(',', '.')
    }

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function getMonthDateRange(year: number, month: number) {
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDay = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { firstDay, endDay }
}

export default function TransactionListScreen() {
  const { selectedMonth } = useAppStore()
  const monthDateRange = useMemo(
    () => getMonthDateRange(selectedMonth.year, selectedMonth.month),
    [selectedMonth.year, selectedMonth.month]
  )

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [dateFrom, setDateFrom] = useState(monthDateRange.firstDay)
  const [dateTo, setDateTo] = useState(monthDateRange.endDay)
  const [page, setPage] = useState(1)
  const [visibleTransactions, setVisibleTransactions] = useState<Transaction[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [modalTab, setModalTab] = useState<TabType>('expense')
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim())
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    setDateFrom(monthDateRange.firstDay)
    setDateTo(monthDateRange.endDay)
  }, [monthDateRange.firstDay, monthDateRange.endDay])

  useEffect(() => {
    setPage(1)
    setVisibleTransactions([])
    setHasMore(true)
  }, [selectedMonth.year, selectedMonth.month, typeFilter, search, dateFrom, dateTo])

  const queryFilters = useMemo(
    () => ({
      year: selectedMonth.year,
      month: selectedMonth.month,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      search: search || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [selectedMonth.year, selectedMonth.month, typeFilter, search, dateFrom, dateTo, page]
  )

  const { data, isLoading, isFetching } = useTransactions(queryFilters)
  const { data: summaryData } = useTransactionsSummary(selectedMonth.year, selectedMonth.month)
  const deleteTx = useDeleteTransaction()

  const pageTransactions = useMemo(() => normalizeTransactions(data), [data])

  useEffect(() => {
    if (isFetching) return

    setHasMore(pageTransactions.length >= PAGE_SIZE)

    if (page === 1) {
      setVisibleTransactions(pageTransactions)
      return
    }

    if (pageTransactions.length === 0) return

    setVisibleTransactions(prev => {
      const ids = new Set(prev.map(tx => tx.id))
      const nextItems = pageTransactions.filter(tx => !ids.has(tx.id))
      return [...prev, ...nextItems]
    })
  }, [isFetching, page, pageTransactions])

  const groupedByDate = useMemo(() => {
    return visibleTransactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
      const key = tx.date.split('T')[0]
      if (!acc[key]) acc[key] = []
      acc[key].push(tx)
      return acc
    }, {})
  }, [visibleTransactions])

  const sortedDates = useMemo(() => {
    return Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))
  }, [groupedByDate])

  const loadedCounters = useMemo(() => {
    return visibleTransactions.reduce(
      (acc, tx) => {
        acc.all += 1
        if (tx.type === 'income') acc.income += 1
        if (tx.type === 'expense') acc.expense += 1
        if (tx.type === 'transfer') acc.transfer += 1
        if (tx.status !== 'completed') acc.open += 1
        return acc
      },
      { all: 0, income: 0, expense: 0, transfer: 0, open: 0 }
    )
  }, [visibleTransactions])

  const summary = useMemo(() => {
    const safeSummary = summaryData as { income?: number; expenses?: number; balance?: number } | undefined
    return {
      income: Number(safeSummary?.income ?? 0),
      expenses: Number(safeSummary?.expenses ?? 0),
      balance: Number(safeSummary?.balance ?? 0),
    }
  }, [summaryData])

  const monthLabel = formatMonth(selectedMonth.year, selectedMonth.month)
  const initialLoading = isLoading && page === 1 && visibleTransactions.length === 0
  const usingCustomDateRange = dateFrom !== monthDateRange.firstDay || dateTo !== monthDateRange.endDay

  const handleDelete = async (id: number) => {
    if (!window.confirm('Excluir esta transação?')) return

    try {
      setDeletingId(id)
      await deleteTx.mutateAsync(id)
      toast.success('Transação excluída.')
    } catch {
      toast.error('Erro ao excluir transação.')
    } finally {
      setDeletingId(null)
    }
  }

  const openCreateModal = (tab: TabType) => {
    setEditingTransaction(null)
    setModalTab(tab)
    setAddOpen(true)
  }

  const openEditModal = (tx: Transaction) => {
    setEditingTransaction(tx)
    setModalTab(tx.type as TabType)
    setAddOpen(true)
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 pb-24 lg:pb-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-violet-900 to-purple-800 px-5 py-5 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-violet-300/20 blur-md" />
        <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-purple-300/20 blur-md" />

        <div className="relative space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-violet-100/90">Transações</p>
            <h2 className="text-xl font-bold capitalize">{monthLabel}</h2>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-violet-100">Receitas</p>
              <p className="mt-1 text-sm font-bold tabular-nums">{formatCurrency(summary.income)}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-violet-100">Gastos</p>
              <p className="mt-1 text-sm font-bold tabular-nums">{formatCurrency(summary.expenses)}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-violet-100">Saldo</p>
              <p className={cn('mt-1 text-sm font-bold tabular-nums', summary.balance >= 0 ? 'text-emerald-200' : 'text-rose-200')}>
                {formatCurrency(summary.balance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-14 z-20 mt-4 -mx-3 bg-transparent px-3 pb-3 sm:-mx-4 sm:px-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-3 shadow-sm backdrop-blur">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar por descrição, categoria ou conta..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-sm text-slate-700 outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('')
                  setPage(1)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                aria-label="Limpar busca"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => {
                  setTypeFilter(t.value)
                  setPage(1)
                }}
                className={cn(
                  'flex flex-shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                  typeFilter === t.value
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px]',
                    typeFilter === t.value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {t.value === 'all' ? loadedCounters.all : loadedCounters[t.value]}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => openCreateModal('expense')}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
            >
              <ArrowDownLeft size={14} />
              Novo gasto
            </button>
            <button
              onClick={() => openCreateModal('income')}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <ArrowUpRight size={14} />
              Nova receita
            </button>
            <button
              onClick={() => openCreateModal('transfer')}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100"
            >
              <ArrowLeftRight size={14} />
              Nova transferência
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <label className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Data inicial</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  const nextFrom = e.target.value
                  setDateFrom(nextFrom)
                  if (dateTo && nextFrom && nextFrom > dateTo) setDateTo(nextFrom)
                  setPage(1)
                }}
                className="mt-1 w-full border-none bg-transparent p-0 text-sm font-medium text-slate-700 outline-none"
              />
            </label>

            <label className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Data final</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  const nextTo = e.target.value
                  setDateTo(nextTo)
                  if (dateFrom && nextTo && nextTo < dateFrom) setDateFrom(nextTo)
                  setPage(1)
                }}
                className="mt-1 w-full border-none bg-transparent p-0 text-sm font-medium text-slate-700 outline-none"
              />
            </label>

            <button
              onClick={() => {
                setDateFrom(monthDateRange.firstDay)
                setDateTo(monthDateRange.endDay)
                setPage(1)
              }}
              className={cn(
                'rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
                usingCustomDateRange
                  ? 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              )}
            >
              {usingCustomDateRange ? 'Limpar período' : 'Período do mês'}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {loadedCounters.all} transações carregadas
            </p>
            {loadedCounters.open > 0 && (
              <Badge color="yellow">{loadedCounters.open} em aberto</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-1 space-y-4">
        {initialLoading && (
          <div className="space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-4 h-3 w-32 rounded-full bg-slate-200" />
                <div className="space-y-3">
                  {[...Array(3)].map((_, line) => (
                    <div key={line} className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-40 rounded-full bg-slate-200" />
                        <div className="h-2.5 w-24 rounded-full bg-slate-200" />
                      </div>
                      <div className="h-3 w-20 rounded-full bg-slate-200" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!initialLoading && visibleTransactions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <Filter size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-600">Nenhuma transação encontrada</p>
            <p className="mt-1 text-sm text-slate-500">
              Ajuste os filtros ou adicione uma nova transação.
            </p>
          </div>
        )}

        {!initialLoading && sortedDates.map(date => {
          const dayTransactions = groupedByDate[date]
          const daySummary = dayTransactions.reduce(
            (acc, tx) => {
              const amount = toAmount(tx.amount)

              if (tx.type === 'income') {
                acc.income += amount
                acc.balance += amount
              } else if (tx.type === 'expense') {
                acc.expenses += amount
                acc.balance -= amount
              }
              acc.count += 1
              return acc
            },
            { income: 0, expenses: 0, balance: 0, count: 0 }
          )

          return (
            <section key={date} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{formatDate(date)}</p>
                  <p className="text-xs text-slate-500">{daySummary.count} lançamentos</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Saldo do dia</p>
                  <p
                    className={cn(
                      'text-sm font-bold tabular-nums',
                      daySummary.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    )}
                  >
                    {formatCurrency(daySummary.balance)}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {dayTransactions.map(tx => {
                  const typeVisual = getTypeVisual(tx.type)
                  const statusVisual = getStatusVisual(tx.status)
                  const Icon = typeVisual.icon
                  const amountValue = toAmount(tx.amount)

                  return (
                    <div
                      key={tx.id}
                      onClick={() => openEditModal(tx)}
                      className="group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/80"
                    >
                      <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl', typeVisual.iconWrapClass)}>
                        <Icon size={17} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{tx.description}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <Badge color={typeVisual.badgeColor}>{typeVisual.label}</Badge>
                          {tx.category_name && <span className="text-xs text-slate-500">{tx.category_name}</span>}
                          {tx.account_name && (
                            <span className="truncate text-xs text-slate-500">· {tx.account_name}</span>
                          )}
                          {statusVisual && (
                            <Badge color={statusVisual.color}>{statusVisual.label}</Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditModal(tx)
                          }}
                          className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-violet-50 hover:text-violet-600"
                          aria-label={`Editar transação ${tx.description}`}
                        >
                          <Edit2 size={14} />
                        </button>
                        <p className={cn('text-sm font-bold tabular-nums', typeVisual.amountClass)}>
                          {typeVisual.prefix}{formatCurrency(amountValue)}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(tx.id)
                          }}
                          disabled={deletingId === tx.id}
                          className={cn(
                            'rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500',
                            'opacity-100 md:opacity-0 md:group-hover:opacity-100',
                            deletingId === tx.id && 'cursor-not-allowed opacity-50'
                          )}
                          aria-label={`Excluir transação ${tx.description}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}

        {!initialLoading && hasMore && (
          <div className="pt-1 text-center">
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={isFetching}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition-all',
                'hover:border-slate-400 hover:bg-slate-100',
                isFetching && 'cursor-not-allowed opacity-60'
              )}
            >
              <CalendarClock size={16} />
              {isFetching ? 'Carregando...' : 'Carregar mais transações'}
            </button>
          </div>
        )}

        {!initialLoading && !hasMore && loadedCounters.all > 0 && (
          <p className="py-1 text-center text-xs text-slate-400">
            Fim da lista para os filtros atuais.
          </p>
        )}
      </div>

      <button
        onClick={() => openCreateModal('expense')}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg transition-all hover:scale-[1.03] hover:from-violet-700 hover:to-purple-700 lg:bottom-6"
        aria-label="Adicionar transação"
      >
        <Plus size={24} />
      </button>

      <AddTransactionModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false)
          setEditingTransaction(null)
        }}
        initialTab={modalTab}
        editingTransaction={editingTransaction}
      />
    </div>
  )
}

