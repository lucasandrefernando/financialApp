import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
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

function normalizeMoneyInput(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return trimmed

  // Accept both pt-BR and en-US decimal formats:
  // 1.234,56 | 1234,56 | 1234.56 | 1,234.56
  const raw = trimmed.replace(/[^\d,.-]/g, '')
  if (!raw) return value

  const lastComma = raw.lastIndexOf(',')
  const lastDot = raw.lastIndexOf('.')
  let normalized = raw

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // comma as decimal separator
      normalized = raw.replace(/\./g, '').replace(',', '.')
    } else {
      // dot as decimal separator
      normalized = raw.replace(/,/g, '')
    }
  } else if (lastComma !== -1) {
    // only comma present -> comma as decimal separator
    normalized = raw.replace(/\./g, '').replace(',', '.')
  } else if (lastDot !== -1) {
    // only dot present -> dot as decimal separator
    // if dot looks like thousands grouping only (e.g. 1.234.567), remove dots
    if (/^-?\d{1,3}(?:\.\d{3})+$/.test(raw)) {
      normalized = raw.replace(/\./g, '')
    }
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : value
}

function extractFirstFormError(errors: FieldErrors<any>) {
  const queue: any[] = [errors]
  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || typeof current !== 'object') continue

    for (const value of Object.values(current)) {
      if (!value) continue
      if (typeof value === 'object' && 'message' in value && value.message) {
        return String(value.message)
      }
      if (typeof value === 'object') queue.push(value)
    }
  }
  return 'Verifique os campos obrigatórios.'
}

const expenseSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  amount: z.preprocess(
    normalizeMoneyInput,
    z.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo')
  ),
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
  amount: z.preprocess(
    normalizeMoneyInput,
    z.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo')
  ),
  date: z.string().min(1),
  account_id: z.coerce.number().min(1, 'Selecione a conta'),
  category_id: z.coerce.number().optional(),
  status: z.enum(['completed', 'pending', 'scheduled']),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

const transferSchema = z.object({
  amount: z.preprocess(
    normalizeMoneyInput,
    z.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo')
  ),
  date: z.string().min(1),
  account_id: z.coerce.number().min(1, 'Selecione a conta origem'),
  transfer_to_account_id: z.coerce.number().min(1, 'Selecione a conta destino'),
  notes: z.string().optional(),
})

export type TabType = 'expense' | 'income' | 'transfer'

interface Props {
  open: boolean
  onClose: () => void
  onSaved?: (savedTransaction?: Transaction) => void | Promise<void>
  initialTab?: TabType
  editingTransaction?: Transaction | null
  allowTypeSwitch?: boolean
  defaultDate?: string
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

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function findCategoryByHints(
  options: Array<{ value: string | number; label: string }>,
  hints: string[]
) {
  if (!hints.length) return undefined

  const normalizedHints = hints.map(normalizeText)
  const match = options.find(option => {
    const label = normalizeText(option.label)
    return normalizedHints.some(hint => label.includes(hint))
  })

  if (!match) return undefined
  return Number(match.value)
}

const EXPENSE_PRESETS: Array<{ label: string; hints: string[] }> = [
  { label: 'Padaria', hints: ['alimentacao', 'mercado'] },
  { label: 'Sacolão', hints: ['alimentacao', 'mercado', 'feira'] },
  { label: 'Farmácia', hints: ['saude', 'farmacia'] },
  { label: 'Supermercado', hints: ['alimentacao', 'mercado'] },
  { label: 'Açougue', hints: ['alimentacao', 'mercado'] },
  { label: 'Restaurante', hints: ['alimentacao', 'lazer'] },
  { label: 'Combustível', hints: ['transporte', 'carro'] },
  { label: 'Transporte', hints: ['transporte', 'mobilidade'] },
]

const INCOME_PRESETS: Array<{ label: string; hints: string[] }> = [
  { label: 'Salário', hints: ['salario', 'trabalho'] },
  { label: 'Freelance', hints: ['freelance', 'servico'] },
  { label: 'Venda', hints: ['venda', 'comercio'] },
  { label: 'Reembolso', hints: ['reembolso'] },
  { label: 'Cashback', hints: ['cashback', 'bonus'] },
  { label: 'Rendimento', hints: ['investimento', 'rendimento'] },
]

export default function AddTransactionModal({
  open,
  onClose,
  onSaved,
  initialTab = 'expense',
  editingTransaction = null,
  allowTypeSwitch = true,
  defaultDate = today,
}: Props) {
  const [tab, setTab] = useState<TabType>(initialTab)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [showAdvancedExpense, setShowAdvancedExpense] = useState(false)
  const [showAdvancedIncome, setShowAdvancedIncome] = useState(false)

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
    defaultValues: { date: defaultDate, status: 'completed', is_installment: false, expense_type: 'variable' },
  })
  const isInstallment = expForm.watch('is_installment')
  const expenseType = expForm.watch('expense_type')
  const expenseStatus = expForm.watch('status')

  const incForm = useForm<z.infer<typeof incomeSchema>>({
    resolver: zodResolver(incomeSchema),
    defaultValues: { date: defaultDate, status: 'completed' },
  })
  const incStatus = incForm.watch('status')

  const trfForm = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: { date: defaultDate },
  })

  useEffect(() => {
    if (!open) return

    if (editingTransaction) {
      const nextTab = editingTransaction.type as TabType
      setTab(nextTab)
      setTags(normalizeTags(editingTransaction.tags))
      setTagInput('')
      setShowAdvancedExpense(nextTab === 'expense')
      setShowAdvancedIncome(nextTab === 'income')

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
    setShowAdvancedExpense(false)
    setShowAdvancedIncome(false)
    expForm.reset({ date: defaultDate, status: 'completed', is_installment: false, expense_type: 'variable' })
    incForm.reset({ date: defaultDate, status: 'completed' })
    trfForm.reset({ date: defaultDate })
  }, [open, initialTab, editingTransaction, defaultDate, expForm, incForm, trfForm])

  const getErrorMessage = (error: unknown, fallback: string) => {
    const maybeError = error as any
    const apiMessage =
      maybeError?.response?.data?.error ||
      maybeError?.response?.data?.message ||
      maybeError?.message

    if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage
    return fallback
  }

  const onSubmitExpense = async (data: z.infer<typeof expenseSchema>) => {
    try {
      let savedTransaction: Transaction | undefined
      if (isEditing && editingTransaction) {
        savedTransaction = await updateTx.mutateAsync({
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
        savedTransaction = await createTx.mutateAsync({
          ...data,
          type: 'expense',
          tags,
          is_recurring: false,
        })
        toast.success('Gasto adicionado!')
      }

      expForm.reset({ date: defaultDate, status: 'completed', is_installment: false, expense_type: 'variable' })
      setTags([])
      await onSaved?.(savedTransaction)
      onClose()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao salvar movimentação.'))
    }
  }

  const onSubmitIncome = async (data: z.infer<typeof incomeSchema>) => {
    try {
      let savedTransaction: Transaction | undefined
      if (isEditing && editingTransaction) {
        savedTransaction = await updateTx.mutateAsync({
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
        savedTransaction = await createTx.mutateAsync({ ...data, type: 'income', tags, is_recurring: false, is_installment: false })
        toast.success('Receita adicionada!')
      }

      incForm.reset({ date: defaultDate, status: 'completed' })
      setTags([])
      await onSaved?.(savedTransaction)
      onClose()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao salvar movimentação.'))
    }
  }

  const onSubmitTransfer = async (data: z.infer<typeof transferSchema>) => {
    try {
      let savedTransaction: Transaction | undefined
      if (isEditing && editingTransaction) {
        savedTransaction = await updateTx.mutateAsync({
          id: editingTransaction.id,
          account_id: data.account_id,
          transfer_to_account_id: data.transfer_to_account_id,
          amount: data.amount,
          date: data.date,
          notes: data.notes || null,
        })
        toast.success('Transferência atualizada!')
      } else {
        savedTransaction = await createTx.mutateAsync({
          ...data,
          type: 'transfer',
          description: 'Transferência',
          is_recurring: false,
          is_installment: false,
          status: 'completed',
        })
        toast.success('Transferência registrada!')
      }

      trfForm.reset({ date: defaultDate })
      await onSaved?.(savedTransaction)
      onClose()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao salvar transferência.'))
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(t => [...t, tagInput.trim()])
    }
    setTagInput('')
  }

  const applyExpensePreset = (label: string, hints: string[]) => {
    expForm.setValue('description', label, { shouldDirty: true, shouldValidate: true })
    const matchedCategory = findCategoryByHints(expenseCategories, hints)
    if (matchedCategory) {
      expForm.setValue('category_id', matchedCategory, { shouldDirty: true })
    }
  }

  const applyIncomePreset = (label: string, hints: string[]) => {
    incForm.setValue('description', label, { shouldDirty: true, shouldValidate: true })
    const matchedCategory = findCategoryByHints(incomeCategories, hints)
    if (matchedCategory) {
      incForm.setValue('category_id', matchedCategory, { shouldDirty: true })
    }
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
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar movimentação' : 'Nova Transação'} size="lg">
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
        <form
          onSubmit={expForm.handleSubmit(
            onSubmitExpense,
            (errors) => toast.error(extractFirstFormError(errors))
          )}
          className="space-y-4"
        >
          <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Lançamentos rápidos do dia a dia</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXPENSE_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyExpensePreset(preset.label, preset.hints)}
                  className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-medium text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <Input label="Descrição" error={expForm.formState.errors.description?.message} {...expForm.register('description')} />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor (R$)" type="text" inputMode="decimal" error={expForm.formState.errors.amount?.message} {...expForm.register('amount')} />
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

          <button
            type="button"
            onClick={() => setShowAdvancedExpense(v => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            <span>Mais opções (status, parcelamento, tags)</span>
            {showAdvancedExpense ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showAdvancedExpense && (
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-3">
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
                <div className="flex flex-wrap gap-2">
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
                  {...expForm.register('notes')}
                />
              </div>

              <Input label="Data de competência (opcional)" type="date" {...expForm.register('competence_date')} />
            </div>
          )}

          <Button type="submit" fullWidth loading={createTx.isPending || updateTx.isPending}>
            {isEditing ? 'Salvar alterações' : 'Salvar gasto'}
          </Button>
        </form>
      )}

      {tab === 'income' && (
        <form
          onSubmit={incForm.handleSubmit(
            onSubmitIncome,
            (errors) => toast.error(extractFirstFormError(errors))
          )}
          className="space-y-4"
        >
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Entradas rápidas</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {INCOME_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyIncomePreset(preset.label, preset.hints)}
                  className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <Input label="Descrição" error={incForm.formState.errors.description?.message} {...incForm.register('description')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor (R$)" type="text" inputMode="decimal" error={incForm.formState.errors.amount?.message} {...incForm.register('amount')} />
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

          <button
            type="button"
            onClick={() => setShowAdvancedIncome(v => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            <span>Mais opções (status, tags e observação)</span>
            {showAdvancedIncome ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showAdvancedIncome && (
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
                <div className="flex flex-wrap gap-2">
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
            </div>
          )}

          <Button type="submit" fullWidth loading={createTx.isPending || updateTx.isPending}>
            {isEditing ? 'Salvar alterações' : 'Salvar receita'}
          </Button>
        </form>
      )}

      {tab === 'transfer' && (
        <form
          onSubmit={trfForm.handleSubmit(
            onSubmitTransfer,
            (errors) => toast.error(extractFirstFormError(errors))
          )}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor (R$)" type="text" inputMode="decimal" error={trfForm.formState.errors.amount?.message} {...trfForm.register('amount')} />
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
