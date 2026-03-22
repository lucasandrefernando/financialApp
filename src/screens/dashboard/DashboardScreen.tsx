import { Link } from 'react-router-dom'
import { ArrowRight, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { AppLayout } from '@/components/layout/AppLayout'
import { TransactionItem } from '@/components/ui/TransactionItem'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SkeletonList } from '@/components/ui/EmptyState'
import { useAccounts } from '@/hooks/api/useAccounts'
import { useRecentTransactions, useMonthlySummary } from '@/hooks/api/useTransactions'
import { useAlertBudgets } from '@/hooks/api/useBudgets'
import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, getGreeting } from '@/utils/formatters'

const CATEGORY_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']

export function DashboardScreen() {
  const { profile } = useAuthStore()
  const { selectedMonth } = useAppStore()

  const { data: accounts = [], isLoading: accountsLoading } = useAccounts()
  const { data: recent = [], isLoading: recentLoading } = useRecentTransactions(30)
  const { data: summary, isLoading: summaryLoading } = useMonthlySummary(selectedMonth.year, selectedMonth.month)
  const { data: alertBudgets = [] } = useAlertBudgets()

  const totalBalance = accounts.filter(a => a.include_in_sum).reduce((s, a) => s + a.balance, 0)
  const isPositiveMonth = (summary?.net_balance ?? 0) >= 0
  const savingsRate = summary?.savings_rate ?? 0

  const monthTransactions = recent.filter(tx => {
    const d = new Date(tx.transaction_date)
    return d.getFullYear() === selectedMonth.year && d.getMonth() + 1 === selectedMonth.month
  })

  const recentFive = monthTransactions.slice(0, 5)

  const categoryMap: Record<string, number> = {}
  monthTransactions.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.category_name ?? 'Outros'
    categoryMap[cat] = (categoryMap[cat] ?? 0) + Number(t.amount)
  })
  const topCategories = Object.entries(categoryMap).sort(([, a], [, b]) => b - a).slice(0, 5)
  const totalExpensesForChart = topCategories.reduce((s, [, v]) => s + v, 0)
  const pieData = topCategories.map(([name, value], i) => ({ name, value, color: CATEGORY_COLORS[i] }))

  return (
    <AppLayout showMonthNav>
      <div className="p-4 lg:p-6 max-w-screen-xl mx-auto space-y-5 pb-8">

        {/* ── Saudação ── */}
        <div className="flex items-end justify-between pt-1">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{getGreeting()},</p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
              {profile?.full_name?.split(' ')[0] ?? 'Usuário'} 👋
            </h1>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 pb-1 capitalize text-right">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
        </div>

        {/* ── Hero Card ── */}
        <div className="relative rounded-[24px] overflow-hidden p-5 text-white" style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
        }}>
          {/* decorative blobs */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)', transform: 'translate(-30%, 30%)' }} />
          </div>

          <div className="relative z-10">
            <p className="text-xs text-white/50 uppercase tracking-widest font-medium">Patrimônio Total</p>
            {accountsLoading ? (
              <div className="h-10 w-44 bg-white/10 rounded-xl animate-pulse mt-2" />
            ) : (
              <p className="text-4xl font-bold tabular-nums mt-1 tracking-tight">
                {formatCurrency(totalBalance)}
              </p>
            )}
            <p className="text-xs text-white/30 mt-1">
              {accounts.filter(a => a.include_in_sum).length} conta(s) somada(s)
            </p>

            {/* 3 métricas */}
            <div className="grid grid-cols-3 gap-2.5 mt-5">
              <div className="bg-white/8 border border-white/10 rounded-[14px] px-3 py-2.5">
                <div className="flex items-center gap-1 mb-1">
                  <ArrowUpRight size={11} className="text-emerald-400" />
                  <span className="text-xs text-white/50">Receitas</span>
                </div>
                <p className="text-sm font-bold tabular-nums text-emerald-400 leading-tight">
                  {summaryLoading ? <span className="opacity-40">—</span> : formatCurrency(summary?.total_income ?? 0)}
                </p>
              </div>
              <div className="bg-white/8 border border-white/10 rounded-[14px] px-3 py-2.5">
                <div className="flex items-center gap-1 mb-1">
                  <ArrowDownRight size={11} className="text-rose-400" />
                  <span className="text-xs text-white/50">Despesas</span>
                </div>
                <p className="text-sm font-bold tabular-nums text-rose-400 leading-tight">
                  {summaryLoading ? <span className="opacity-40">—</span> : formatCurrency(summary?.total_expense ?? 0)}
                </p>
              </div>
              <div className="bg-white/8 border border-white/10 rounded-[14px] px-3 py-2.5">
                <div className="flex items-center gap-1 mb-1">
                  {isPositiveMonth
                    ? <TrendingUp size={11} className="text-sky-400" />
                    : <TrendingDown size={11} className="text-orange-400" />}
                  <span className="text-xs text-white/50">Saldo</span>
                </div>
                <p className={`text-sm font-bold tabular-nums leading-tight ${isPositiveMonth ? 'text-sky-400' : 'text-orange-400'}`}>
                  {summaryLoading ? <span className="opacity-40">—</span> : formatCurrency(summary?.net_balance ?? 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Banner taxa de poupança ── */}
        {!summaryLoading && summary && summary.total_income > 0 && (
          <div className={`rounded-[14px] px-4 py-3 flex items-center gap-2 text-sm ${
            savingsRate > 0
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30'
              : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-800/30'
          }`}>
            {savingsRate > 0 ? (
              <><span>✅</span><span>Você poupou <strong>{savingsRate.toFixed(1)}%</strong> da sua renda este mês</span></>
            ) : (
              <><span>⚠️</span><span>Suas despesas superaram as receitas neste mês</span></>
            )}
          </div>
        )}

        {/* ── Alertas de orçamento ── */}
        {alertBudgets.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-500" /> Alertas de Orçamento
              </h2>
              <Link to="/budgets" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                Ver todos <ArrowRight size={12} />
              </Link>
            </div>
            <div className="space-y-2">
              {alertBudgets.map(b => (
                <Link key={b.id} to="/budgets" className="block bg-white dark:bg-slate-800 rounded-[14px] p-3.5 border border-slate-100 dark:border-slate-700 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{b.name}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      b.alert_level === 'exceeded'
                        ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                        : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {b.alert_level === 'exceeded' ? 'Excedido' : 'Atenção'}
                    </span>
                  </div>
                  <ProgressBar current={b.spent} total={b.amount} alertThreshold={b.alert_threshold} showValues showPercentage={false} size="sm" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Gastos por categoria ── */}
        {topCategories.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Onde seu dinheiro foi</h2>
            <div className="bg-white dark:bg-slate-800 rounded-[20px] border border-slate-100 dark:border-slate-700 p-4">
              <div className="flex items-center gap-4">
                {/* Donut */}
                <div style={{ width: 96, height: 96, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={44}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                        formatter={(v: number) => [formatCurrency(v), '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Lista */}
                <div className="flex-1 space-y-2">
                  {topCategories.map(([cat, value], i) => (
                    <div key={cat} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[i] }} />
                      <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 truncate">{cat}</span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{formatCurrency(value)}</span>
                      <span className="text-xs text-slate-400 tabular-nums w-8 text-right">
                        {((value / totalExpensesForChart) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Transações recentes ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Transações Recentes</h2>
            <Link to="/transactions" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          {recentLoading ? (
            <SkeletonList count={4} />
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-[20px] border border-slate-100 dark:border-slate-700 overflow-hidden divide-y divide-slate-50 dark:divide-slate-700/50">
              {recentFive.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-3xl mb-2">📊</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500">Nenhuma transação neste mês</p>
                  <Link to="/transactions" className="text-xs text-primary-600 hover:underline mt-1.5 inline-block">
                    Registrar primeira transação
                  </Link>
                </div>
              ) : (
                recentFive.map(tx => <TransactionItem key={tx.id} transaction={tx} />)
              )}
            </div>
          )}
        </section>

        {/* ── Contas (preview 2 colunas) ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Minhas Contas</h2>
            <Link to="/profile/accounts" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Gerenciar <ArrowRight size={12} />
            </Link>
          </div>
          {accountsLoading ? (
            <SkeletonList count={2} />
          ) : accounts.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-[20px] border border-slate-100 dark:border-slate-700 py-8 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500 mb-2">Nenhuma conta cadastrada</p>
              <Link to="/profile/accounts" className="text-xs text-primary-600 hover:underline">Adicionar conta</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {accounts.slice(0, 4).map(account => (
                <div
                  key={account.id}
                  className="bg-white dark:bg-slate-800 rounded-[16px] border border-slate-100 dark:border-slate-700 p-3.5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <div
                      className="h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: (account.color as string) || '#6366f1' }}
                    >
                      <span className="text-white text-xs font-bold">
                        {account.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">{account.name}</p>
                      {account.bank_name && (
                        <p className="text-xs text-slate-400 truncate leading-tight">{account.bank_name}</p>
                      )}
                    </div>
                  </div>
                  <p className={`text-base font-bold tabular-nums ${account.balance < 0 ? 'text-rose-500' : 'text-slate-900 dark:text-slate-100'}`}>
                    {formatCurrency(account.balance)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </AppLayout>
  )
}

export default DashboardScreen
