import { useCategorization } from '../../hooks/useCategorization'
import { categoryLabels } from '../../utils/categoryPatterns'

interface CategorySuggestionProps {
  description: string
  amount?: number
  selectedCategory: string
  onSelectCategory: (category: string) => void
  onAcceptSuggestion?: (category: string) => void
}

/**
 * Componente que exibe sugestões de categoria com base em IA
 */
export function CategorySuggestion({
  description,
  amount,
  selectedCategory,
  onSelectCategory,
  onAcceptSuggestion,
}: CategorySuggestionProps) {
  const { data: categorization, isLoading } = useCategorization(description, amount, !!description)

  if (!description || !categorization) {
    return null
  }

  const isSuggesting = categorization.category !== selectedCategory
  const confidence = Math.round(categorization.confidence)

  return (
    <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm">
            <p className="font-semibold text-blue-900">
              💡 Sugestão de IA: {categoryLabels[categorization.category] || categorization.category}
            </p>
            <p className="text-xs text-blue-700">{categorization.reasoning}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{confidence}%</div>
          <div className="text-xs text-blue-600">confiança</div>
        </div>
      </div>

      {isLoading && <div className="text-xs text-blue-600">Analisando descrição...</div>}

      {isSuggesting && (
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => {
              onSelectCategory(categorization.category)
              onAcceptSuggestion?.(categorization.category)
            }}
            className="flex-1 rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
          >
            ✓ Aceitar
          </button>
          <button
            onClick={() => {}}
            className="flex-1 rounded border border-blue-600 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-100"
          >
            ✗ Rejeitar
          </button>
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        <span className="text-blue-600">Fonte: {categorization.source}</span>
        <div className="flex gap-1">
          {(categorization.source === 'gemini' || categorization.source === 'groq') && <span className="rounded bg-blue-200 px-2 py-0.5 text-blue-700">🤖 AI</span>}
          {categorization.source === 'pattern' && <span className="rounded bg-green-200 px-2 py-0.5 text-green-700">📊 Padrão</span>}
          {categorization.source === 'merchant' && <span className="rounded bg-purple-200 px-2 py-0.5 text-purple-700">🏪 Conhecida</span>}
        </div>
      </div>
    </div>
  )
}

export default CategorySuggestion