export const ENTITY_COLORS = [
  { value: '#6D28D9', label: 'Roxo' },
  { value: '#2563EB', label: 'Azul' },
  { value: '#0891B2', label: 'Ciano' },
  { value: '#059669', label: 'Verde' },
  { value: '#D97706', label: 'Laranja' },
  { value: '#DC2626', label: 'Vermelho' },
  { value: '#DB2777', label: 'Rosa' },
  { value: '#475569', label: 'Cinza' },
]

export const DEFAULT_ENTITY_COLOR = ENTITY_COLORS[0].value

export function getEntityColorLabel(value: string) {
  return ENTITY_COLORS.find(color => color.value === value)?.label || value
}
