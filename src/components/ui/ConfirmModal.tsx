import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmModalProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="space-y-4">
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="ghost" fullWidth onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            fullWidth
            loading={loading}
            onClick={onConfirm}
            className={
              variant === 'danger'
                ? 'bg-error-500 hover:bg-error-600 text-white'
                : 'bg-warning-500 hover:bg-warning-600 text-white'
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
