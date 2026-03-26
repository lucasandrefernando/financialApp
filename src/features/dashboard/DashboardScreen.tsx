import { useState } from 'react'
import {
  TrendingUp, TrendingDown, Scale, Lightbulb,
  AlertTriangle, Plus, Calendar, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { useDashboard, useInsights } from '../../hooks/api/useDashboard'
import { useAuthStore } from '../../stores/authStore'
import { formatCurrency, getGreeting } from '../../utils/formatters'
import { cn } from '../../lib/utils'
import type { DashboardData } from '../../types'
import AddTransactionModal from '../transactions/AddTransactionModal'

export default function DashboardScreen() {
  const { user } = useAuthStore()
  const { data: rawData, isLoading, error } = useDashboard()
  const data = rawData as DashboardData | undefined
  const { data: insights } = useInsights()
  const [addOpen, setAddOpen] = useState(false)

  if (isLoading) return <DashboardSkeleton />
  if (error) return (
    <div className="flex items-center justify-center p-8">
      <p className="text-red-500 text-sm">Erro ao carregar dashboard. Tente novamente.</p>
    </div>
  )

  const cm = data?.current_month ?? { income: 0, expenses: 0, balance: 0, savings_rate: 0 }
  const avg = data?.averages ?? { daily: 0, weekly: 0, biweekly: 0 }
  const balancePositive = cm.balance >= 0

  const chartData = (data?.monthly_cash_flow ?? []).map(m => ({
    ...m,
    name: new Date(m.year, m.month - 1).toLocaleString('pt-BR', { month: 'short' }).replace('.', ''),
  }))

  return (
    <div className="p-4 pb-24 lg:pb-6 space-y-5 max-w-5xl mx-auto">

      {/* Greeting */}
      <div className="pt-1">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{getGreeting()}</p>
        <h2 className="text-xl font-bold text-gray-900">{user?.name?.split(' ')[0]} 👋</h2>
      </div>

      {/* Hero balance card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -right-2 -bottom-10 w-28 h-28 rounded-full bg-white/5" />
        <div className="relative">
          <p className="text-indigo-200 text-xs font-medium uppercase tracking-wide mb-1">Total em Contas</p>
          <p className="text-3xl font-bold tracking-tight">{formatCurrency(data?.total_balance ?? 0)}</p>
          <div className="mt-4 flex items-center gap-1">
            <div className={cn('flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
              balancePositive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
            )}>
              {balancePositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {formatCurrency(Math.abs(cm.balance))} esse mês
            </div>
          </div>
        </div>
      </div>

      {/* Month cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 font-medium">Receitas</p>
          <p className="text-base font-bold text-gray-900 mt-0.5 tabular-nums">{formatCurrency(cm.income)}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <TrendingDown size={16} className="text-red-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 font-medium">Gastos</p>
          <p className="text-base font-bold text-gray-900 mt-0.5 tabular-nums">{formatCurrency(cm.expenses)}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Scale size={16} className="text-indigo-600" />
            </div>
          </div>
          <p className="text-xs text-gray-400 font-medium">Saldo</p>
          <p className={cn('text-base font-bold mt-0.5 tabular-nums', balancePositive ? 'text-green-600' : 'text-red-600')}>
            {formatCurrency(cm.balance)}
          </p>
        </div>
      </div>

      {/* Averages + Projection */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Médias de Gasto</p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          {[
            { label: 'Diária', value: avg.daily },
            { label: 'Semanal', value: avg.weekly },
            { label: 'Quinzenal', value: avg.biweekly },
          ].map(item => (
            <div key={item.label} className="p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">{item.label}</p>
              <p className="text-sm font-bold text-gray-900 tabular-nums">{formatCurrency(item.value)}</p>
            </div>
          ))}
        </div>
        {data?.projected_end_of_month !== undefined && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              <span className="text-xs text-gray-500">Projeção até fim do mês</span>
            </div>
            <span className={cn('text-sm font-bold tabular-nums', data.projected_end_of_month <= (data?.total_balance ?? 0) ? 'text-green-600' : 'text-orange-500')}>
              {formatCurrency(data.projected_end_of_month)}
            </span>
          </div>
        )}
      </div>

      {/* Cash flow chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-900 mb-4">Fluxo de Caixa</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barCategoryGap="30%" margin={{ top: 0, right: 0, bottom: 0, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip
                formatter={(v: number, name: string) => [formatCurrency(v), name === 'income' ? 'Receitas' : 'Gastos']}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
              />
              <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" name="Gastos" fill="#f87171" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /><span className="text-xs text-gray-500">Receitas</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-400" /><span className="text-xs text-gray-500">Gastos</span></div>
          </div>
        </div>
      )}

      {/* Top categories */}
      {data?.top_categories && data.top_categories.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-900 mb-4">Top Categorias</p>
          <div className="space-y-3">
            {data.top_categories.slice(0, 5).map((cat, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: (cat.color || '#6366f1') + '20' }}>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color || '#6366f1' }} />
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{cat.category_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(cat.total)}</span>
                    <span className="text-xs text-gray-400 ml-1.5">{cat.percentage?.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(cat.percentage || 0, 100)}%`, backgroundColor: cat.color || '#6366f1' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget alerts */}
      {data?.budget_alerts && data.budget_alerts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-500" />
            <p className="text-sm font-semibold text-gray-900">Alertas de Orçamento</p>
          </div>
          <div className="space-y-2">
            {data.budget_alerts.map(budget => (
              <div key={budget.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900">{budget.category_name}</p>
                    <span className={cn('text-xs font-bold', (budget.percentage ?? 0) > 100 ? 'text-red-600' : 'text-amber-600')}>
                      {budget.percentage?.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', (budget.percentage ?? 0) > 100 ? 'bg-red-500' : 'bg-amber-500')}
                      style={{ width: `${Math.min(budget.percentage ?? 0, 100)}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(budget.spent ?? 0)} de {formatCurrency(budget.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      {data?.recent_transactions && data.recent_transactions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <p className="text-sm font-semibold text-gray-900">Transações Recentes</p>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recent_transactions.slice(0, 8).map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: tx.category_color || '#6366f1' }}>
                  {(tx.category_name || tx.description).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {tx.category_name && <span>{tx.category_name} · </span>}
                    {new Date(String(tx.date).split('T')[0] + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn('text-sm font-bold tabular-nums', tx.type === 'income' ? 'text-green-600' : 'text-red-500')}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Insights */}
      {Array.isArray(insights) && insights.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-yellow-400 flex items-center justify-center">
              <Lightbulb size={14} className="text-white" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Insights Financeiros</p>
            <span className="ml-auto text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-medium">IA</span>
          </div>
          <div className="space-y-3">
            {insights.slice(0, 3).map((tip: any, i: number) => (
              <div key={tip.id ?? i} className="bg-white rounded-xl p-3.5 shadow-sm">
                <p className="text-sm font-semibold text-gray-900 mb-1">{tip.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{tip.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setAddOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-xl flex items-center justify-center z-30 hover:bg-indigo-700 active:scale-95 transition-all"
        aria-label="Adicionar transação"
      >
        <Plus size={24} />
      </button>

      <AddTransactionModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="p-4 space-y-5 max-w-5xl mx-auto animate-pulse">
      <div className="h-5 w-32 bg-gray-200 rounded" />
      <div className="h-32 bg-gray-200 rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
      </div>
      <div className="h-28 bg-gray-200 rounded-2xl" />
      <div className="h-52 bg-gray-200 rounded-2xl" />
    </div>
  )
}
