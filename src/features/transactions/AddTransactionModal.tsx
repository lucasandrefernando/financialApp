import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { useAccounts } from '../../hooks/api/useAccounts'
import { useCategories } from '../../hooks/api/useCategories'
import { useCreateTransaction, useUpdateTransaction } from '../../hooks/api/useTransactions'
import { toast } from '../../components/ui/Toast'
import { cn } from '../../lib/utils'
import type { Transaction } from '../../types'

const today = new Date().toISOString().split('T')[0]

const expenseSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  date: z.string().min(1),
  account_id: z.coerce.number().min(1, 'Selecione a conta'),
  category_id: z.coerce.number().optional(),
  expense_type: z.enum(['essential', 'variable', 'leisure', 'investment']).optional(),
  status: z.enum(['completed', 'pending', 'scheduled']),
  is_installment: z.boolean(),
  installment_total: z.coerce.number().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  competence_date: z.string().optional(),
})

const incomeSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  date: z.string().min(1),
  account_id: z.coerce.number().min(1, 'Selecione a conta'),
  category_id: z.coerce.number().optional(),
  status: z.enum(['completed', 'pending', 'scheduled']),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

const transferSchema = z.object({
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  date: z.string().min(1),
  account_id: z.coerce.number().min(1, 'Selecione a conta origem'),
  transfer_to_account_id: z.coerce.number().min(1, 'Selecione a conta destino'),
  notes: z.string().optional(),
})

export type TabType = 'expense' | 'income' | 'transfer'

interface Props {
  open: boolean
  onClose: () => void
  initialTab?: TabType
  editingTransaction?: Transaction | null
  allowTypeSwitch?: boolean
}

function toDateInput(value?: string | null) {
  if (!value) return today
  return String(value).slice(0, 10)
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(v => String(v))

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map(v => String(v))
    } catch {
      return value
        .split(',')
        .map(v => v.trim())
        .filter(Boolean)
    }
  }

  return []
}

export default function AddTransactionModal({
  open,
  onClose,
  initialTab = 'expense',
  editingTransaction = null,
  allowTypeSwitch = true,
}: Props) {
  const [tab, setTab] = useState<TabType>(initialTab)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const isEditing = Boolean(editingTransaction)

  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const createTx = useCreateTransaction()
  const updateTx = useUpdateTransaction()

  const accountOptions = accounts.map((a: any) => ({ value: a.id, label: a.name }))
  const expenseCategories = categories
    .filter((c: any) => c.type === 'expense' || c.type === 'both')
    .map((c: any) => ({ value: c.id, label: c.name }))
  const incomeCategories = categories
    .filter((c: any) => c.type === 'income' || c.type === 'both')
    .map((c: any) => ({ value: c.id, label: c.name }))

  const expForm = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { date: today, status: 'completed', is_installment: false, expense_type: 'variable' },
  })
  const isInstallment = expForm.watch('is_installment')
  const expenseType = expForm.watch('expense_type')
  const expenseStatus = expForm.watch('status')

  const incForm = useForm<z.infer<typeof incomeSchema>>({
    resolver: zodResolver(incomeSchema),
    defaultValues: { date: today, status: 'completed' },
  })
  const incStatus = incForm.watch('status')

  const trfForm = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: { date: today },
  })

  useEffect(() => {
    if (!open) return

    if (editingTransaction) {
      const nextTab = editingTransaction.type as TabType
      setTab(nextTab)
      setTags(normalizeTags(editingTransaction.tags))
      setTagInput('')

      if (nextTab === 'expense') {
        expForm.reset({
          description: editingTransaction.description || '',
          amount: Number(editingTransaction.amount || 0),
          date: toDateInput(editingTransaction.date),
          account_id: Number(editingTransaction.account_id || 0),
          category_id: editingTransaction.category_id ? Number(editingTransaction.category_id) : undefined,
          expense_type: editingTransaction.expense_type || 'variable',
          status: (editingTransaction.status as any) || 'completed',
          is_installment: Boolean(editingTransaction.is_installment),
          installment_total: editingTransaction.installment_total || undefined,
          notes: editingTransaction.notes || '',
          competence_date: editingTransaction.competence_date ? toDateInput(editingTransaction.competence_date) : undefined,
        })
      }

      if (nextTab === 'income') {
        incForm.reset({
          description: editingTransaction.description || '',
          amount: Number(editingTransaction.amount || 0),
          date: toDateInput(editingTransaction.date),
          account_id: Number(editingTransaction.account_id || 0),
          category_id: editingTransaction.category_id ? Number(editingTransaction.category_id) : undefined,
          status: (editingTransaction.status as any) || 'completed',
          notes: editingTransaction.notes || '',
        })
      }

      if (nextTab === 'transfer') {
        trfForm.reset({
          amount: Number(editingTransaction.amount || 0),
          date: toDateInput(editingTransaction.date),
          account_id: Number(editingTransaction.account_id || 0),
          transfer_to_account_id: Number(editingTransaction.transfer_to_account_id || 0),
          notes: editingTransaction.notes || '',
        })
      }

      return
    }

    setTab(initialTab)
    setTags([])
    setTagInput('')
    expForm.reset({ date: today, status: 'completed', is_installment: false, expense_type: 'variable' })
    incForm.reset({ date: today, status: 'completed' })
    trfForm.reset({ date: today })
  }, [open, initialTab, editingTransaction, expForm, incForm, trfForm])

  const onSubmitExpense = async (data: z.infer<typeof expenseSchema>) => {
    try {
      if (isEditing && editingTransaction) {
        await updateTx.mutateAsync({
          id: editingTransaction.id,
          account_id: data.account_id,
          description: data.description,
          amount: data.amount,
          date: data.date,
          category_id: data.category_id || null,
          status: data.status,
          expense_type: data.expense_type || null,
          tags,
          notes: data.notes || null,
          competence_date: data.competence_date || null,
        })
        toast.success('Movimentação atualizada!')
      } else {
        await createTx.mutateAsync({
          ...data,
          type: 'expense',
          tags,
          is_recurring: false,
        })
        toast.success('Gasto adicionado!')
      }

      expForm.reset({ date: today, status: 'completed', is_installment: false, expense_type: 'variable' })
      setTags([])
      onClose()
    } catch {
      toast.error('Erro ao salvar movimentação.')
    }
  }

  const onSubmitIncome = async (data: z.infer<typeof incomeSchema>) => {
    try {
      if (isEditing && editingTransaction) {
        await updateTx.mutateAsync({
          id: editingTransaction.id,
          account_id: data.account_id,
          description: data.description,
          amount: data.amount,
          date: data.date,
          category_id: data.category_id || null,
          status: data.status,
          tags,
          notes: data.notes || null,
        })
        toast.success('Movimentação atualizada!')
      } else {
        await createTx.mutateAsync({ ...data, type: 'income', tags, is_recurring: false, is_installment: false })
        toast.success('Receita adicionada!')
      }

      incForm.reset({ date: today, status: 'completed' })
      setTags([])
      onClose()
    } catch {
      toast.error('Erro ao salvar movimentação.')
    }
  }

  const onSubmitTransfer = async (data: z.infer<typeof transferSchema>) => {
    try {
      if (isEditing && editingTransaction) {
        await updateTx.mutateAsync({
          id: editingTransaction.id,
          account_id: data.account_id,
          transfer_to_account_id: data.transfer_to_account_id,
          amount: data.amount,
          date: data.date,
          notes: data.notes || null,
        })
        toast.success('Transferência atualizada!')
      } else {
        await createTx.mutateAsync({
          ...data,
          type: 'transfer',
          description: 'Transferência',
          is_recurring: false,
          is_installment: false,
          status: 'completed',
        })
        toast.success('Transferência registrada!')
      }

      trfForm.reset({ date: today })
      onClose()
    } catch {
      toast.error('Erro ao salvar transferência.')
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(t => [...t, tagInput.trim()])
    }
    setTagInput('')
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: 'expense', label: 'Gasto' },
    { key: 'income', label: 'Receita' },
    { key: 'transfer', label: 'Transferência' },
  ]

  const EXPENSE_TYPES = [
    { value: 'essential', label: 'Essencial' },
    { value: 'variable', label: 'Variável' },
    { value: 'leisure', label: 'Lazer' },
    { value: 'investment', label: 'Investimento' },
  ]

  const STATUSES = [
    { value: 'completed', label: 'Realizado' },
    { value: 'pending', label: 'Pendente' },
    { value: 'scheduled', label: 'Agendado' },
  ]

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar movimentação' : 'Nova Transação'} size="md">
      {!isEditing && allowTypeSwitch && (
        <div className="mb-5 flex gap-2">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                tab === t.key
                  ? 'border-violet-600 bg-violet-600 text-white shadow-sm'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-violet-400 hover:text-violet-700'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'expense' && (
        <form onSubmit={expForm.handleSubmit(onSubmitExpense)} className="space-y-4">
          <Input label="Descrição" error={expForm.formState.errors.description?.message} {...expForm.register('description')} />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor (R$)" type="number" step="0.01" error={expForm.formState.errors.amount?.message} {...expForm.register('amount')} />
            <Input label="Data" type="date" error={expForm.formState.errors.date?.message} {...expForm.register('date')} />
          </div>

          <Select
            label="Conta"
            options={accountOptions}
            placeholder="Selecione..."
            error={expForm.formState.errors.account_id?.message}
            {...expForm.register('account_id')}
          />

          <Select label="Categoria" options={expenseCategories} placeholder="Selecione..." {...expForm.register('category_id')} />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Tipo de gasto</label>
            <div className="flex flex-wrap gap-2">
              {EXPENSE_TYPES.map(et => (
                <button
                  key={et.value}
                  type="button"
                  onClick={() => expForm.setValue('expense_type', et.value as any)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    expenseType === et.value
                      ? 'border-violet-600 bg-violet-600 text-white'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-violet-400'
                  )}
                >
                  {et.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
            <div className="flex gap-2">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => expForm.setValue('status', s.value as any)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    expenseStatus === s.value
                      ? 'border-violet-600 bg-violet-600 text-white'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-violet-400'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
            <label className="text-sm font-medium text-gray-700">Parcelado?</label>
            <button
              type="button"
              onClick={() => expForm.setValue('is_installment', !isInstallment)}
              className={cn('relative h-6 w-10 rounded-full transition-colors', isInstallment ? 'bg-violet-600' : 'bg-gray-300')}
            >
              <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', isInstallment ? 'left-0.5 translate-x-4' : 'left-0.5')} />
            </button>
          </div>

          {isInstallment && (
            <Input label="Número de parcelas" type="number" min={2} max={60} {...expForm.register('installment_total')} />
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Tags</label>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="Pressione Enter para adicionar"
                className="h-9 flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>+
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700">
                    {tag}
                    <button type="button" onClick={() => setTags(t => t.filter(x => x !== tag))}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Observação</label>
            <textarea
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              {...expForm.register('notes')}
            />
          </div>

          <Input label="Data de competência (opcional)" type="date" {...expForm.register('competence_date')} />

          <Button type="submit" fullWidth loading={createTx.isPending || updateTx.isPending}>
            {isEditing ? 'Salvar alterações' : 'Salvar gasto'}
          </Button>
        </form>
      )}

      {tab === 'income' && (
        <form onSubmit={incForm.handleSubmit(onSubmitIncome)} className="space-y-4">
          <Input label="Descrição" error={incForm.formState.errors.description?.message} {...incForm.register('description')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor (R$)" type="number" step="0.01" error={incForm.formState.errors.amount?.message} {...incForm.register('amount')} />
            <Input label="Data" type="date" {...incForm.register('date')} />
          </div>

          <Select
            label="Conta"
            options={accountOptions}
            placeholder="Selecione..."
            error={incForm.formState.errors.account_id?.message}
            {...incForm.register('account_id')}
          />
          <Select label="Categoria" options={incomeCategories} placeholder="Selecione..." {...incForm.register('category_id')} />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
            <div className="flex gap-2">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => incForm.setValue('status', s.value as any)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    incStatus === s.value
                      ? 'border-violet-600 bg-violet-600 text-white'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-violet-400'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Tags</label>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="Pressione Enter para adicionar"
                className="h-9 flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>+</Button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700">
                    {tag}
                    <button type="button" onClick={() => setTags(t => t.filter(x => x !== tag))}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Observação</label>
            <textarea
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              {...incForm.register('notes')}
            />
          </div>

          <Button type="submit" fullWidth loading={createTx.isPending || updateTx.isPending}>
            {isEditing ? 'Salvar alterações' : 'Salvar receita'}
          </Button>
        </form>
      )}

      {tab === 'transfer' && (
        <form onSubmit={trfForm.handleSubmit(onSubmitTransfer)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor (R$)" type="number" step="0.01" error={trfForm.formState.errors.amount?.message} {...trfForm.register('amount')} />
            <Input label="Data" type="date" {...trfForm.register('date')} />
          </div>

          <Select
            label="Conta origem"
            options={accountOptions}
            placeholder="Selecione..."
            error={trfForm.formState.errors.account_id?.message}
            {...trfForm.register('account_id')}
          />
          <Select
            label="Conta destino"
            options={accountOptions}
            placeholder="Selecione..."
            error={trfForm.formState.errors.transfer_to_account_id?.message}
            {...trfForm.register('transfer_to_account_id')}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Observação</label>
            <textarea
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              {...trfForm.register('notes')}
            />
          </div>

          <Button type="submit" fullWidth loading={createTx.isPending || updateTx.isPending}>
            {isEditing ? 'Salvar alterações' : 'Registrar transferência'}
          </Button>
        </form>
      )}
    </Modal>
  )
}
