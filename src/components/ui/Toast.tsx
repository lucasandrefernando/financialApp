import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'
import { cn } from '../../lib/utils'

type ToastType = 'success' | 'error'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

let _toastId = 0
const _listeners: ((items: ToastItem[]) => void)[] = []
let _toasts: ToastItem[] = []

function _notify(message: string, type: ToastType) {
  const id = ++_toastId
  _toasts = [..._toasts, { id, message, type }]
  _listeners.forEach(fn => fn(_toasts))
  setTimeout(() => {
    _toasts = _toasts.filter(t => t.id !== id)
    _listeners.forEach(fn => fn(_toasts))
  }, 4000)
}

export const toast = {
  success: (msg: string) => _notify(msg, 'success'),
  error: (msg: string) => _notify(msg, 'error'),
}

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    _listeners.push(setItems)
    return () => {
      const i = _listeners.indexOf(setItems)
      if (i > -1) _listeners.splice(i, 1)
    }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none">
      {items.map(t => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-3 p-4 rounded-xl shadow-lg border pointer-events-auto',
            t.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          )}
        >
          {t.type === 'success'
            ? <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
            : <XCircle size={18} className="text-red-500 flex-shrink-0" />
          }
          <p className="text-sm font-medium flex-1">{t.message}</p>
          <button
            onClick={() => {
              _toasts = _toasts.filter(i => i.id !== t.id)
              _listeners.forEach(fn => fn(_toasts))
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
