import { useState } from 'react'
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
import { useCreateTransaction } from '../../hooks/api/useTransactions'
import { toast } from '../../components/ui/Toast'
import { cn } from '../../lib/utils'

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

type TabType = 'expense' | 'income' | 'transfer'

interface Props {
  open: boolean
  onClose: () => void
}

export default function AddTransactionModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<TabType>('expense')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const createTx = useCreateTransaction()

  const accountOptions = accounts.map((a: any) => ({ value: a.id, label: a.name }))
  const expenseCategories = categories
    .filter((c: any) => c.type === 'expense' || c.type === 'both')
    .map((c: any) => ({ value: c.id, label: c.name }))
  const incomeCategories = categories
    .filter((c: any) => c.type === 'income' || c.type === 'both')
    .map((c: any) => ({ value: c.id, label: c.name }))

  // Expense form
  const expForm = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { date: today, status: 'completed', is_installment: false, expense_type: 'variable' },
  })
  const isInstallment = expForm.watch('is_installment')
  const expenseType = expForm.watch('expense_type')
  const expenseStatus = expForm.watch('status')

  // Income form
  const incForm = useForm<z.infer<typeof incomeSchema>>({
    resolver: zodResolver(incomeSchema),
    defaultValues: { date: today, status: 'completed' },
  })
  const incStatus = incForm.watch('status')

  // Transfer form
  const trfForm = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: { date: today },
  })

  const onSubmitExpense = async (data: z.infer<typeof expenseSchema>) => {
    try {
      await createTx.mutateAsync({
        ...data,
        type: 'expense',
        tags,
        is_recurring: false,
      })
      toast.success('Gasto adicionado!')
      expForm.reset({ date: today, status: 'completed', is_installment: false, expense_type: 'variable' })
      setTags([])
      onClose()
    } catch {
      toast.error('Erro ao salvar transação.')
    }
  }

  const onSubmitIncome = async (data: z.infer<typeof incomeSchema>) => {
    try {
      await createTx.mutateAsync({ ...data, type: 'income', tags, is_recurring: false, is_installment: false })
      toast.success('Receita adicionada!')
      incForm.reset({ date: today, status: 'completed' })
      setTags([])
      onClose()
    } catch {
      toast.error('Erro ao salvar transação.')
    }
  }

  const onSubmitTransfer = async (data: z.infer<typeof transferSchema>) => {
    try {
      await createTx.mutateAsync({ ...data, type: 'transfer', description: 'Transferência', is_recurring: false, is_installment: false, status: 'completed' })
      toast.success('Transferência registrada!')
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
    <Modal open={open} onClose={onClose} title="Nova Transação" size="md">
      {/* Tab selector */}
      <div className="flex rounded-lg bg-gray-100 p-1 mb-5">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 py-1.5 text-sm font-medium rounded-md transition-colors',
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* EXPENSE */}
      {tab === 'expense' && (
        <form onSubmit={expForm.handleSubmit(onSubmitExpense)} className="space-y-4">
          <Input label="Descrição" error={expForm.formState.errors.description?.message} {...expForm.register('description')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor (R$)" type="number" step="0.01" error={expForm.formState.errors.amount?.message} {...expForm.register('amount')} />
            <Input label="Data" type="date" error={expForm.formState.errors.date?.message} {...expForm.register('date')} />
          </div>
          <Select label="Conta" options={accountOptions} placeholder="Selecione..." error={expForm.formState.errors.account_id?.message} {...expForm.register('account_id')} />
          <Select label="Categoria" options={expenseCategories} placeholder="Selecione..." {...expForm.register('category_id')} />

          {/* Expense type pills */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Tipo de gasto</label>
            <div className="flex flex-wrap gap-2">
              {EXPENSE_TYPES.map(et => (
                <button
                  key={et.value}
                  type="button"
                  onClick={() => expForm.setValue('expense_type', et.value as any)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                    expenseType === et.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                  )}
                >
                  {et.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status pills */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Status</label>
            <div className="flex gap-2">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => expForm.setValue('status', s.value as any)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                    expenseStatus === s.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Installment toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <label className="text-sm font-medium text-gray-700">Parcelado?</label>
            <button
              type="button"
              onClick={() => expForm.setValue('is_installment', !isInstallment)}
              className={cn('w-10 h-6 rounded-full transition-colors relative', isInstallment ? 'bg-indigo-600' : 'bg-gray-300')}
            >
              <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', isInstallment ? 'translate-x-4 left-0.5' : 'left-0.5')} />
            </button>
          </div>
          {isInstallment && (
            <Input label="Número de parcelas" type="number" min={2} max={60} {...expForm.register('installment_total')} />
          )}

          {/* Tags */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Tags</label>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Pressione Enter para adicionar"
                className="flex-1 h-9 px-3 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>+</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs">
                    {tag}
                    <button type="button" onClick={() => setTags(t => t.filter(x => x !== tag))}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Observação</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              {...expForm.register('notes')}
            />
          </div>

          <Input label="Data de competência (opcional)" type="date" {...expForm.register('competence_date')} />

          <Button type="submit" fullWidth loading={createTx.isPending}>Salvar gasto</Button>
        </form>
      )}

      {/* INCOME */}
      {tab === 'income' && (
        <form onSubmit={incForm.handleSubmit(onSubmitIncome)} className="space-y-4">
          <Input label="Descrição" error={incForm.formState.errors.description?.message} {...incForm.register('description')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor (R$)" type="number" step="0.01" error={incForm.formState.errors.amount?.message} {...incForm.register('amount')} />
            <Input label="Data" type="date" {...incForm.register('date')} />
          </div>
          <Select label="Conta" options={accountOptions} placeholder="Selecione..." error={incForm.formState.errors.account_id?.message} {...incForm.register('account_id')} />
          <Select label="Categoria" options={incomeCategories} placeholder="Selecione..." {...incForm.register('category_id')} />

          {/* Status pills */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Status</label>
            <div className="flex gap-2">
              {STATUSES.map(s => (
                <button key={s.value} type="button"
                  onClick={() => incForm.setValue('status', s.value as any)}
                  className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                    incStatus === s.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                  )}>{s.label}</button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Tags</label>
            <div className="flex gap-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Pressione Enter para adicionar"
                className="flex-1 h-9 px-3 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>+</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs">
                    {tag}
                    <button type="button" onClick={() => setTags(t => t.filter(x => x !== tag))}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Observação</label>
            <textarea rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" {...incForm.register('notes')} />
          </div>

          <Button type="submit" fullWidth loading={createTx.isPending}>Salvar receita</Button>
        </form>
      )}

      {/* TRANSFER */}
      {tab === 'transfer' && (
        <form onSubmit={trfForm.handleSubmit(onSubmitTransfer)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor (R$)" type="number" step="0.01" error={trfForm.formState.errors.amount?.message} {...trfForm.register('amount')} />
            <Input label="Data" type="date" {...trfForm.register('date')} />
          </div>
          <Select label="Conta origem" options={accountOptions} placeholder="Selecione..." error={trfForm.formState.errors.account_id?.message} {...trfForm.register('account_id')} />
          <Select label="Conta destino" options={accountOptions} placeholder="Selecione..." error={trfForm.formState.errors.transfer_to_account_id?.message} {...trfForm.register('transfer_to_account_id')} />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Observação</label>
            <textarea rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" {...trfForm.register('notes')} />
          </div>
          <Button type="submit" fullWidth loading={createTx.isPending}>Registrar transferência</Button>
        </form>
      )}
    </Modal>
  )
}
