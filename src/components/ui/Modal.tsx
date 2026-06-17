import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 modal-backdrop-enter" onClick={onClose} />
      <div className={cn(
        'modal-panel-enter relative flex w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900',
        'max-h-[92dvh] rounded-t-2xl sm:max-h-[90vh] sm:rounded-2xl',
        sizeMap[size]
      )}>
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-800 sm:px-5 sm:py-4">
          <h2 className="min-w-0 pr-3 text-base font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 [scrollbar-width:thin] sm:p-5 sm:pr-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-violet-200 [&::-webkit-scrollbar-track]:bg-transparent">
          {children}
        </div>
        {footer && (
          <div className="safe-bottom flex-shrink-0 border-t border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950 sm:px-5 sm:py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  )
}
