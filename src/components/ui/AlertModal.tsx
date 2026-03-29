import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './Button'
import { Modal } from './Modal'

export type AlertTone = 'error' | 'success' | 'warning' | 'info'

interface AlertModalProps {
  open: boolean
  title: string
  message: string
  onClose: () => void
  confirmLabel?: string
  onConfirm?: () => void
  tone?: AlertTone
}

const toneMap: Record<
  AlertTone,
  {
    icon: typeof AlertCircle
    iconWrapClass: string
    textClass: string
    panelClass: string
    buttonClass: string
  }
> = {
  error: {
    icon: AlertCircle,
    iconWrapClass: 'bg-rose-100 text-rose-600',
    textClass: 'text-rose-700',
    panelClass: 'border-rose-200 bg-rose-50/70',
    buttonClass: 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500 text-white',
  },
  success: {
    icon: CheckCircle2,
    iconWrapClass: 'bg-emerald-100 text-emerald-600',
    textClass: 'text-emerald-700',
    panelClass: 'border-emerald-200 bg-emerald-50/70',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500 text-white',
  },
  warning: {
    icon: AlertTriangle,
    iconWrapClass: 'bg-amber-100 text-amber-700',
    textClass: 'text-amber-700',
    panelClass: 'border-amber-200 bg-amber-50/80',
    buttonClass: 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500 text-white',
  },
  info: {
    icon: Info,
    iconWrapClass: 'bg-violet-100 text-violet-700',
    textClass: 'text-violet-700',
    panelClass: 'border-violet-200 bg-violet-50/80',
    buttonClass: 'bg-violet-600 hover:bg-violet-700 focus-visible:ring-violet-500 text-white',
  },
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function inferTone(title: string, message: string): AlertTone {
  const text = normalizeText(`${title} ${message}`)

  if (
    text.includes('erro') ||
    text.includes('falha') ||
    text.includes('invalido') ||
    text.includes('expirado') ||
    text.includes('nao foi possivel')
  ) {
    return 'error'
  }

  if (
    text.includes('sucesso') ||
    text.includes('concluido') ||
    text.includes('concluida') ||
    text.includes('enviado') ||
    text.includes('salva')
  ) {
    return 'success'
  }

  if (
    text.includes('verifique') ||
    text.includes('atencao') ||
    text.includes('obrigatorio') ||
    text.includes('obrigatoria')
  ) {
    return 'warning'
  }

  return 'info'
}

export function AlertModal({
  open,
  title,
  message,
  onClose,
  confirmLabel = 'Entendi',
  onConfirm,
  tone,
}: AlertModalProps) {
  const resolvedTone = tone || inferTone(title, message)
  const config = toneMap[resolvedTone]
  const Icon = config.icon

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-full', config.iconWrapClass)}>
            <Icon size={16} />
          </span>
          <span>{title}</span>
        </span>
      }
      size="sm"
      footer={
        <div className="flex justify-end">
          <Button onClick={onConfirm || onClose} className={cn('min-w-24 rounded-lg', config.buttonClass)}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className={cn('rounded-xl border p-4', config.panelClass)}>
        <p className={cn('whitespace-pre-line text-sm leading-relaxed', config.textClass)}>{message}</p>
      </div>
    </Modal>
  )
}
