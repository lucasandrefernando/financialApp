import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useUpdateTransaction, useDeleteTransaction } from '@/hooks/api/useTransactions'
import { useAccounts } from '@/hooks/api/useAccounts'
import { useCategories } from '@/hooks/api/useCategoriesAndNotifications'
import { useToast } from '@/components/ui/Toast'
import { clsx } from 'clsx'
import type { RecentTransaction, TransactionType } from '@/types/database'

const schema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.coerce.number().positive('Valor deve ser maior que zero'),
  description: z.string().min(1, 'Descrição obrigatória'),
  transaction_date: z.string().min(1, 'Data obrigatória'),
  account_id: z.string().min(1, 'Conta obrigatória'),
  destination_account_id: z.string().optional(),
  category_id: z.string().optional(),
  status: z.enum(['completed', 'pending', 'scheduled', 'cancelled']),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const typeLabels: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Despesa' },
  { value: 'income', label: 'Receita' },
  { value: 'transfer', label: 'Transferência' },
]

interface EditTransactionModalProps {
  transaction: RecentTransaction | null
  onClose: () => void
}

export function EditTransactionModal({ transaction, onClose }: EditTransactionModalProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { mutateAsync: updateTransaction, isPending: isUpdating } = useUpdateTransaction()
  const { mutateAsync: deleteTransaction, isPending: isDeleting } = useDeleteTransaction()
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const { success, error } = useToast()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: transaction ? {
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      transaction_date: transaction.transaction_date,
      account_id: transaction.account_id ?? '',
      destination_account_id: transaction.destination_account_id ?? '',
      category_id: transaction.category_id ?? '',
      status: (transaction.status as FormData['status']) ?? 'completed',
      notes: transaction.notes ?? '',
    } : undefined,
  })

  const type = watch('type')

  const filteredCategories = categories.filter((c) =>
    type === 'income' ? c.type !== 'expense' : type === 'expense' ? c.type !== 'income' : true
  )

  const onSubmit = async (data: FormData) => {
    if (!transaction) return
    try {
      await updateTransaction({
        id: transaction.id,
        payload: {
          type: data.type,
          amount: data.amount,
          description: data.description,
          transaction_date: data.transaction_date,
          account_id: data.account_id || null,
          destination_account_id: data.destination_account_id || null,
          category_id: data.category_id || null,
          status: data.status,
          notes: data.notes || null,
        },
      })
      success('Transação atualizada!')
      onClose()
    } catch {
      error('Não foi possível atualizar a transação')
    }
  }

  const handleDelete = async () => {
    if (!transaction) return
    try {
      await deleteTransaction(transaction.id)
      success('Transação excluída!')
      setConfirmOpen(false)
      onClose()
    } catch {
      error('Não foi possível excluir a transação')
    }
  }

  return (
    <>
      <Modal open={!!transaction} onClose={onClose} title="Editar Transação">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-[10px]">
            {typeLabels.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setValue('type', value)}
                className={clsx(
                  'flex-1 h-8 rounded-[8px] text-sm font-medium transition-colors',
                  type === value
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <Input
            label="Valor *"
            type="number"
            step="0.01"
            error={errors.amount?.message}
            {...register('amount')}
          />

          <Input
            label="Descrição *"
            error={errors.description?.message}
            {...register('description')}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Data *" type="date" error={errors.transaction_date?.message} {...register('transaction_date')} />
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
              <select className="mt-1.5 w-full h-10 px-3 rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500" {...register('status')}>
                <option value="completed">Concluído</option>
                <option value="pending">Pendente</option>
                <option value="scheduled">Agendado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{type === 'transfer' ? 'Conta de Origem *' : 'Conta *'}</label>
            <select className="mt-1.5 w-full h-10 px-3 rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500" {...register('account_id')}>
              <option value="">Selecionar conta</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {errors.account_id && <p className="text-xs text-error-500 mt-1">{errors.account_id.message}</p>}
          </div>

          {type === 'transfer' && (
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Conta de Destino</label>
              <select className="mt-1.5 w-full h-10 px-3 rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500" {...register('destination_account_id')}>
                <option value="">Selecionar conta</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          {type !== 'transfer' && (
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Categoria</label>
              <select className="mt-1.5 w-full h-10 px-3 rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500" {...register('category_id')}>
                <option value="">Sem categoria</option>
                {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <Input label="Notas" placeholder="Observações opcionais..." {...register('notes')} />

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(true)}
              className="text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10"
            >
              <Trash2 size={16} />
            </Button>
            <Button type="button" variant="ghost" fullWidth onClick={onClose}>Cancelar</Button>
            <Button type="submit" fullWidth loading={isUpdating}>Salvar</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={confirmOpen}
        title="Excluir transação"
        description={`Tem certeza que deseja excluir "${transaction?.description}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
