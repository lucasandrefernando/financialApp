import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  type LucideIcon,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarClock,
  Edit2,
  Filter,
  LayoutGrid,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useTransactions, useDeleteTransaction, useTransactionsSummary } from '../../hooks/api/useTransactions'
import { transactionsService } from '../../services/transactions'
import { useAppStore } from '../../stores/appStore'
import { formatCurrency, formatDate, formatMonth } from '../../utils/formatters'
import { cn } from '../../lib/utils'
import { toast } from '../../components/ui/Toast'
import { Badge } from '../../components/ui/Badge'
import AddTransactionModal, { type TabType } from './AddTransactionModal'
import type { Transaction } from '../../types'

type TypeFilter = 'all' | 'expense' | 'income' | 'transfer'

const PAGE_SIZE = 20

const SUBMENU_ITEMS: { value: TypeFilter; label: string; icon: LucideIcon }[] = [
  { value: 'all', label: 'Geral', icon: LayoutGrid },
  { value: 'expense', label: 'Gastos', icon: ArrowDownLeft },
  { value: 'income', label: 'Receitas', icon: ArrowUpRight },
  { value: 'transfer', label: 'Transferências', icon: ArrowLeftRight },
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

function getPreviousDay(date: string) {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getTodayDateString() {
  return new Date().toISOString().split('T')[0]
}

export default function TransactionListScreen() {
  const { selectedMonth } = useAppStore()
  const monthDateRange = useMemo(
    () => getMonthDateRange(selectedMonth.year, selectedMonth.month),
    [selectedMonth.year, selectedMonth.month]
  )
  const defaultDateForCreate = useMemo(() => {
    const todayDate = getTodayDateString()
    const [y, m] = todayDate.split('-').map(Number)
    const isSelectedCurrentMonth = y === selectedMonth.year && m === selectedMonth.month
    return isSelectedCurrentMonth ? todayDate : monthDateRange.firstDay
  }, [selectedMonth.year, selectedMonth.month, monthDateRange.firstDay])

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

  const { data, isLoading, isFetching, refetch } = useTransactions(queryFilters)
  const { data: summaryData } = useTransactionsSummary(selectedMonth.year, selectedMonth.month)
  const previousDayOfMonth = useMemo(() => getPreviousDay(monthDateRange.firstDay), [monthDateRange.firstDay])
  const { data: openingTransactionsData } = useQuery({
    queryKey: ['transactions', 'opening-balance-fallback', selectedMonth.year, selectedMonth.month],
    queryFn: () =>
      transactionsService.list({
        date_to: previousDayOfMonth,
        status: 'completed',
        page: 1,
        limit: 10000,
      }),
  })
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
    const safeSummary = summaryData as {
      income?: number
      expenses?: number
      balance?: number
      month_balance?: number
      opening_balance?: number
    } | undefined

    const fallbackOpeningTransactions = normalizeTransactions(openingTransactionsData)
    const fallbackOpeningBalance = fallbackOpeningTransactions.reduce((acc, tx) => {
      const amount = toAmount(tx.amount)
      if (tx.type === 'income') return acc + amount
      if (tx.type === 'expense') return acc - amount
      return acc
    }, 0)

    const income = Number(safeSummary?.income ?? 0)
    const expenses = Number(safeSummary?.expenses ?? 0)
    const hasServerAccumulatedFields = safeSummary?.month_balance !== undefined || safeSummary?.opening_balance !== undefined
    const monthBalance = hasServerAccumulatedFields
      ? Number(safeSummary?.month_balance ?? income - expenses)
      : income - expenses
    const openingBalance = hasServerAccumulatedFields
      ? Number(safeSummary?.opening_balance ?? 0)
      : fallbackOpeningBalance
    const balance = hasServerAccumulatedFields
      ? Number(safeSummary?.balance ?? openingBalance + monthBalance)
      : openingBalance + monthBalance

    return {
      income,
      expenses,
      balance,
      monthBalance,
    }
  }, [summaryData, openingTransactionsData])

  const monthLabel = formatMonth(selectedMonth.year, selectedMonth.month)
  const initialLoading = isLoading && page === 1 && visibleTransactions.length === 0
  const usingCustomDateRange = dateFrom !== monthDateRange.firstDay || dateTo !== monthDateRange.endDay

  const handleDelete = async (id: number) => {
    if (!window.confirm('Excluir esta transação?')) return

    try {
      setDeletingId(id)
      await deleteTx.mutateAsync(id)
      setVisibleTransactions(prev => prev.filter(tx => tx.id !== id))
      toast.success('Transação excluída.')
      if (page === 1) {
        await refetch()
      } else {
        setPage(1)
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao excluir transação.'
      toast.error(message)
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

  const refreshTransactionsAfterSave = async () => {
    if (page === 1) {
      await refetch()
      return
    }
    setPage(1)
  }

  const contextAction = useMemo(() => {
    if (typeFilter === 'income') return { label: 'Nova receita', tab: 'income' as TabType, disabled: false }
    if (typeFilter === 'transfer') return { label: 'Nova transferência', tab: 'transfer' as TabType, disabled: false }
    if (typeFilter === 'expense') return { label: 'Novo gasto', tab: 'expense' as TabType, disabled: false }
    return { label: 'Escolha um contexto para lançar', tab: 'expense' as TabType, disabled: true }
  }, [typeFilter])

  const contextLabel = useMemo(() => {
    if (typeFilter === 'income') return 'Contexto: receitas'
    if (typeFilter === 'transfer') return 'Contexto: transferências'
    if (typeFilter === 'expense') return 'Contexto: gastos'
    return 'Contexto: geral'
  }, [typeFilter])

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
              <p className="text-[11px] uppercase tracking-wide text-violet-100">Saldo acumulado</p>
              <p className={cn('mt-1 text-sm font-bold tabular-nums', summary.balance >= 0 ? 'text-emerald-200' : 'text-rose-200')}>
                {formatCurrency(summary.balance)}
              </p>
              <p className="mt-1 text-[10px] text-violet-100/85">
                Mês: {formatCurrency(summary.monthBalance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4 -mx-3 bg-transparent px-3 pb-3 sm:-mx-4 sm:px-4">
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

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SUBMENU_ITEMS.map(item => {
              const Icon = item.icon
              const counter = item.value === 'all' ? loadedCounters.all : loadedCounters[item.value]
              return (
              <button
                key={item.value}
                onClick={() => {
                  setTypeFilter(item.value)
                  setPage(1)
                }}
                className={cn(
                  'flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all',
                  typeFilter === item.value
                    ? 'border-violet-500 bg-violet-50 text-violet-800 shadow-sm'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                )}
              >
                <span className="flex items-center gap-1.5">
                  <Icon size={14} />
                  {item.label}
                </span>
                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', typeFilter === item.value ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500')}>
                  {counter}
                </span>
              </button>
            )})}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{contextLabel}</p>
            <button
              onClick={() => {
                if (contextAction.disabled) return
                openCreateModal(contextAction.tab)
              }}
              disabled={contextAction.disabled}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                contextAction.disabled
                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                  : 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100'
              )}
            >
              <span className="text-sm leading-none">+</span>
              {contextAction.label}
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

      <AddTransactionModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false)
          setEditingTransaction(null)
        }}
        onSaved={refreshTransactionsAfterSave}
        initialTab={modalTab}
        editingTransaction={editingTransaction}
        allowTypeSwitch={false}
        defaultDate={defaultDateForCreate}
      />
    </div>
  )
}
