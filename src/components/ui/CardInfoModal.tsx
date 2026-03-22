import { X } from 'lucide-react'
import { type ReactNode } from 'react'

interface CardInfoModalProps {
  open: boolean
  onClose: () => void
  title: string
  icon: ReactNode
  iconColor: string
  value: string
  valueColor: string
  description: string
  details: { label: string; text: string }[]
  tip?: string
}

export function CardInfoModal({
  open,
  onClose,
  title,
  icon,
  iconColor,
  value,
  valueColor,
  description,
  details,
  tip,
}: CardInfoModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[24px] sm:rounded-[20px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">

        {/* Header colorido */}
        <div className={`px-6 pt-6 pb-8 ${iconColor}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                {icon}
              </div>
              <div>
                <p className="text-xs font-medium text-white/70 uppercase tracking-wider">{title}</p>
                <p className={`text-3xl font-bold tabular-nums mt-0.5 ${valueColor}`}>{value}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="px-6 py-5 space-y-5">

          {/* Descrição */}
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {description}
          </p>

          {/* Detalhes */}
          <div className="space-y-3">
            {details.map((d) => (
              <div key={d.label} className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {d.label}
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {d.text}
                </span>
              </div>
            ))}
          </div>

          {/* Dica */}
          {tip && (
            <div className="flex gap-2 bg-primary-50 dark:bg-primary-500/10 rounded-[12px] p-3">
              <span className="text-base">💡</span>
              <p className="text-xs text-primary-700 dark:text-primary-300 leading-relaxed">{tip}</p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full h-11 rounded-[12px] bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
