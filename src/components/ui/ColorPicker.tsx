import { cn } from '../../lib/utils'
import { ENTITY_COLORS, getEntityColorLabel } from '../../constants/entityColors'

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  colors?: typeof ENTITY_COLORS
}

export function ColorPicker({
  value,
  onChange,
  label = 'Cor',
  colors = ENTITY_COLORS,
}: ColorPickerProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-2">
        {colors.map(color => {
          const selected = value === color.value
          const colorLabel = getEntityColorLabel(color.value)

          return (
            <button
              key={color.value}
              type="button"
              onClick={() => onChange(color.value)}
              className={cn(
                'h-8 w-8 rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
                selected
                  ? 'scale-110 border-white ring-2 ring-violet-600 ring-offset-2 ring-offset-white dark:ring-violet-300 dark:ring-offset-slate-900'
                  : 'border-transparent hover:scale-105'
              )}
              style={{ backgroundColor: color.value }}
              aria-label={`Selecionar cor ${colorLabel}`}
              aria-pressed={selected}
              title={colorLabel}
            />
          )
        })}
      </div>
    </div>
  )
}
