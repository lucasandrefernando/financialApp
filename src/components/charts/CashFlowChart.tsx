import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useRecentTransactions } from '@/hooks/api/useTransactions'
import { TrendingUp } from 'lucide-react'

/**
 * Fix #11: Added empty state when there are no transactions
 * Also added visible Y-axis and CartesianGrid for context
 */
export function CashFlowChart() {
  const { data: recent = [], isLoading } = useRecentTransactions(30)

  const grouped = recent.reduce<Record<string, number>>((acc, tx) => {
    const day = tx.transaction_date.split('T')[0]
    acc[day] = (acc[day] ?? 0) + (tx.type === 'income' ? tx.amount : -tx.amount)
    return acc
  }, {})

  const data = Object.keys(grouped)
    .sort()
    .map((k) => ({ date: k.slice(5), value: grouped[k] })) // show MM-DD

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[16px] p-4 border border-slate-100 dark:border-slate-700">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Fluxo de caixa</h3>

      {isLoading ? (
        <div className="h-[200px] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-500 animate-spin" />
        </div>
      ) : data.length === 0 ? (
        /* Fix #11: empty state */
        <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-slate-400">
          <TrendingUp size={32} strokeWidth={1.5} />
          <p className="text-sm">Nenhuma transação neste período</p>
          <p className="text-xs">Adicione transações para ver o fluxo de caixa</p>
        </div>
      ) : (
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `R$${Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                formatter={(v: number) => [`R$ ${v.toFixed(2)}`, 'Saldo']}
                labelFormatter={(l) => `Dia ${l}`}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#colorNet)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
