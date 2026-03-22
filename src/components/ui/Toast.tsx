import { useState, createContext, useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, duration?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons = { success: CheckCircle, error: XCircle, warning: AlertTriangle, info: Info }
const colors = {
  success: 'border-l-4 border-success-500 bg-white dark:bg-slate-800',
  error: 'border-l-4 border-error-500 bg-white dark:bg-slate-800',
  warning: 'border-l-4 border-warning-500 bg-white dark:bg-slate-800',
  info: 'border-l-4 border-info-500 bg-white dark:bg-slate-800',
}
const iconColors = { success: 'text-success-500', error: 'text-error-500', warning: 'text-warning-500', info: 'text-info-500' }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = (id: string) => setToasts((t) => t.filter((x) => x.id !== id))

  const toast = (type: ToastType, message: string, duration = type === 'error' ? 5000 : 3000) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t.slice(-2), { id, type, message, duration }])
    setTimeout(() => remove(id), duration)
  }

  const value: ToastContextValue = {
    toast,
    success: (m) => toast('success', m),
    error: (m) => toast('error', m),
    warning: (m) => toast('warning', m),
    info: (m) => toast('info', m),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80" aria-live="polite">
          {toasts.map((t) => {
            const Icon = icons[t.type]
            return (
              <div key={t.id} className={clsx('flex items-start gap-3 p-4 rounded-[10px] shadow-card', colors[t.type])}>
                <Icon size={18} className={clsx('flex-shrink-0 mt-0.5', iconColors[t.type])} />
                <p className="text-sm text-slate-800 dark:text-slate-200 flex-1">{t.message}</p>
                <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-slate-600 flex-shrink-0" aria-label="Fechar">
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider')
  return ctx
}
