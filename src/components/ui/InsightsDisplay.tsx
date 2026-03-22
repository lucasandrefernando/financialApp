import { useFinancialInsights, useAnomalyDetection, useSavingsSuggestions } from '../../hooks/useInsights'
import type { Transaction } from '../../types/database'

interface InsightsDisplayProps {
  transactions: Transaction[] | undefined
  budgets?: Record<string, number>
  showAnomalies?: boolean
  showSavings?: boolean
}

/**
 * Componente que exibe insights financeiros gerados por IA
 */
export function InsightsDisplay({ transactions, budgets, showAnomalies = true, showSavings = true }: InsightsDisplayProps) {
  const { data: insights, isLoading: insightsLoading } = useFinancialInsights(transactions, budgets)
  const { data: anomalies, isLoading: anomaliesLoading } = useAnomalyDetection(transactions, showAnomalies)

  // Agrupa gastos por categoria
  const categorySpending: Record<string, number> = {}
  transactions?.forEach((t) => {
    const cat = 'outro'
    categorySpending[cat] = (categorySpending[cat] || 0) + Math.abs(Number(t.amount))
  })

  const { data: savings, isLoading: savingsLoading } = useSavingsSuggestions(categorySpending, showSavings)

  if (!transactions || transactions.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-gray-600">
        Adicione transações para ver insights financeiros
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Insights gerais */}
      {insightsLoading ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600">
          Gerando insights...
        </div>
      ) : (
        insights &&
        insights.length > 0 && (
          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="font-semibold text-amber-900">💡 Insights Financeiros</h3>
            <div className="space-y-2">
              {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                insights.map((insight: any, idx: number) => (
                <div key={idx} className="rounded bg-white p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{insight.title}</p>
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        insight.impact === 'high'
                          ? 'bg-red-100 text-red-700'
                          : insight.impact === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {insight.impact === 'high' ? '🔴' : insight.impact === 'medium' ? '🟡' : '🟢'} {insight.impact}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-600">{insight.description}</p>
                  {insight.suggestion && <p className="mt-2 text-xs italic text-gray-500">✨ {insight.suggestion}</p>}
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Anomalias */}
      {showAnomalies &&
        (anomaliesLoading ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600">
            Verificando anomalias...
          </div>
        ) : (
          anomalies &&
          anomalies.length > 0 && (
            <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-4">
              <h3 className="font-semibold text-red-900">⚠️ Anomalias Detectadas</h3>
              <ul className="space-y-1">
                {anomalies.map((anomaly: string, idx: number) => (
                  <li key={idx} className="text-sm text-red-800">
                    • {anomaly}
                  </li>
                ))}
              </ul>
            </div>
          )
        ))}

      {/* Sugestões de economia */}
      {showSavings &&
        (savingsLoading ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600">
            Gerando sugestões...
          </div>
        ) : (
          savings && (
            <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-4">
              <h3 className="font-semibold text-green-900">💰 Oportunidades de Economia</h3>
              <div className="whitespace-pre-line text-sm text-green-800">{savings}</div>
            </div>
          )
        ))}
    </div>
  )
}

export default InsightsDisplay
