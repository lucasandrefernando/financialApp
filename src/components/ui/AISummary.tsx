import { useTransactions } from '../../hooks/api/useTransactions'
import { useBudgets } from '../../hooks/api/useBudgets'
import { useFinancialInsights, useAnomalyDetection, useTrendAnalysis } from '../../hooks/useInsights'

/**
 * Resumo de IA e Insights para exibir no Dashboard
 * Fix #12: replaced raw Tailwind colors with design-system tokens
 * Fix #17: emoji icons wrapped with aria-hidden so screen readers skip them
 */
export function AISummary() {
  const { data: transactionsData } = useTransactions()
  const transactions = transactionsData?.data
  const { data: budgetsData } = useBudgets()
  const budgets = budgetsData
    ? Object.fromEntries(budgetsData.map((b) => [b.name, b.amount]))
    : undefined

  const { data: insights, isLoading: insightsLoading } = useFinancialInsights(transactions, budgets, true)
  const { data: anomalies, isLoading: anomaliesLoading } = useAnomalyDetection(transactions, true)
  const { data: trends } = useTrendAnalysis(transactions, 6, true)

  if (!transactions || transactions.length === 0) return null

  const trendIcon =
    trends?.trend === 'increasing' ? '📈' :
    trends?.trend === 'decreasing' ? '📉' : '➡️'

  const trendLabel =
    trends?.trend === 'increasing' ? 'CRESCENDO' :
    trends?.trend === 'decreasing' ? 'REDUZINDO' : 'ESTÁVEL'

  const impactStyles: Record<string, { card: string; title: string; desc: string }> = {
    high:    { card: 'border-error-200 bg-error-50 dark:bg-error-500/10 dark:border-error-800',      title: 'text-error-900 dark:text-error-100',   desc: 'text-error-700 dark:text-error-300' },
    medium:  { card: 'border-warning-200 bg-warning-50 dark:bg-warning-500/10 dark:border-warning-800', title: 'text-warning-900 dark:text-warning-100', desc: 'text-warning-700 dark:text-warning-300' },
    low:     { card: 'border-success-200 bg-success-50 dark:bg-success-500/10 dark:border-success-800', title: 'text-success-900 dark:text-success-100', desc: 'text-success-700 dark:text-success-300' },
  }

  return (
    <div className="space-y-4 pt-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {/* Fix #17: aria-hidden on decorative emoji */}
        <span aria-hidden="true">🤖 </span>Insights de IA
      </h3>

      {/* Tendência */}
      {trends && (
        <div className="rounded-lg border border-info-200 bg-info-50 dark:bg-info-500/10 dark:border-info-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-info-900 dark:text-info-100">Despesa Média Mensal</p>
              <p className="mt-1 text-2xl font-bold text-info-600 dark:text-info-400 tabular-nums">
                R$ {trends.monthlyAverage.toFixed(2)}
              </p>
            </div>
            <div className="text-4xl" aria-hidden="true">{trendIcon}</div>
          </div>
          <p className="mt-2 text-xs text-info-700 dark:text-info-300">
            Tendência: {trendLabel}
          </p>
        </div>
      )}

      {/* Insights principais */}
      {insightsLoading ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">Analisando dados…</div>
      ) : (
        insights && insights.length > 0 && (
          <div className="space-y-2">
            {insights.slice(0, 2).map((insight, idx) => {
              const style = impactStyles[insight.impact] ?? impactStyles.low
              return (
                <div key={idx} className={`rounded-lg border p-3 ${style.card}`}>
                  <p className={`text-sm font-medium ${style.title}`}>{insight.title}</p>
                  <p className={`mt-1 text-xs ${style.desc}`}>{insight.description}</p>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Anomalias detectadas */}
      {!anomaliesLoading && anomalies && anomalies.length > 0 && (
        <div className="rounded-lg border border-warning-200 bg-warning-50 dark:bg-warning-500/10 dark:border-warning-800 p-3">
          <p className="text-sm font-medium text-warning-900 dark:text-warning-100">
            <span aria-hidden="true">⚠️ </span>Anomalias Detectadas
          </p>
          <ul className="mt-2 space-y-1">
            {anomalies.slice(0, 2).map((anomaly, idx) => (
              <li key={idx} className="text-xs text-warning-700 dark:text-warning-300">
                • {anomaly}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default AISummary
