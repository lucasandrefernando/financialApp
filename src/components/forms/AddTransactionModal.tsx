import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useCreateTransaction } from '@/hooks/api/useTransactions'
import { useAccounts } from '@/hooks/api/useAccounts'
import { useCategories } from '@/hooks/api/useCategoriesAndNotifications'
import { useToast } from '@/components/ui/Toast'
import { format } from 'date-fns'
import type { TransactionType } from '@/types/database'

const schema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.coerce.number().positive('Informe o valor'),
  description: z.string().min(1, 'Informe a descrição'),
  transaction_date: z.string().min(1),
  account_id: z.string().min(1, 'Selecione a conta'),
  destination_account_id: z.string().optional(),
  category_id: z.string().optional(),
  status: z.enum(['completed', 'pending', 'scheduled']),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface AddTransactionModalProps {
  open: boolean
  onClose: () => void
  defaultType?: TransactionType
}

const TYPE_CONFIG = {
  expense: { label: 'Despesa',      bg: 'bg-rose-500',    activeBg: 'bg-rose-500',    text: 'text-rose-500',    border: 'border-rose-500',    gradient: 'from-rose-600 to-rose-500' },
  income:  { label: 'Receita',      bg: 'bg-emerald-500', activeBg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-500', gradient: 'from-emerald-600 to-emerald-500' },
  transfer:{ label: 'Transferência',bg: 'bg-blue-500',    activeBg: 'bg-blue-500',    text: 'text-blue-500',    border: 'border-blue-500',    gradient: 'from-blue-600 to-blue-500' },
}

export function AddTransactionModal({ open, onClose, defaultType = 'expense' }: AddTransactionModalProps) {
  const { mutateAsync: createTransaction, isPending } = useCreateTransaction()
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const { success, error } = useToast()
  const amountRef = useRef<HTMLInputElement | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: defaultType,
      status: 'completed',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
      account_id: '',
    },
  })

  const type = watch('type')
  const category_id = watch('category_id')
  const cfg = TYPE_CONFIG[type]

  // Auto-select account if only one
  useEffect(() => {
    if (accounts.length === 1) setValue('account_id', accounts[0].id)
  }, [accounts, setValue])

  // Focus amount when opens
  useEffect(() => {
    if (open) {
      setValue('type', defaultType)
      setTimeout(() => amountRef.current?.focus(), 100)
    } else {
      reset()
      setShowAdvanced(false)
    }
  }, [open, defaultType, setValue, reset])

  const filteredCategories = categories.filter(c =>
    type === 'income' ? c.type !== 'expense' : type === 'expense' ? c.type !== 'income' : true
  )

  const onSubmit = async (data: FormData) => {
    try {
      await createTransaction({
        type: data.type,
        amount: data.amount,
        description: data.description,
        transaction_date: data.transaction_date,
        account_id: data.account_id,
        destination_account_id: data.destination_account_id || null,
        category_id: data.category_id || null,
        status: data.status,
        notes: data.notes ?? null,
        credit_card_id: null,
        recurring_id: null,
        installment_group_id: null,
        installment_number: null,
        installment_total: null,
        competence_date: null,
        tags: [],
        attachments: [],
        metadata: {},
        is_reconciled: false,
        deleted_at: null,
      })
      success(`${cfg.label} salva!`)
      reset({ type: data.type, status: 'completed', transaction_date: format(new Date(), 'yyyy-MM-dd'), account_id: data.account_id })
      onClose()
    } catch {
      error('Não foi possível salvar')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => { reset(); onClose() }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-[24px] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Topo colorido ── */}
        <div className={`bg-gradient-to-br ${cfg.gradient} px-5 pt-5 pb-6`}>
          {/* Fechar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/80 text-sm font-medium">Nova transação</p>
            <button
              onClick={() => { reset(); onClose() }}
              className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tipo */}
          <div className="flex gap-2 mb-5">
            {(['expense', 'income', 'transfer'] as TransactionType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setValue('type', t)}
                className={`flex-1 h-8 rounded-full text-xs font-semibold transition-all ${
                  type === t
                    ? 'bg-white text-slate-900 shadow'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {TYPE_CONFIG[t].label}
              </button>
            ))}
          </div>

          {/* Valor */}
          <div className="text-center">
            <p className="text-white/60 text-xs mb-1 uppercase tracking-widest">Valor</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-white/70 text-2xl font-light">R$</span>
              <input
                {...register('amount')}
                ref={e => { amountRef.current = e }}
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                className="bg-transparent text-white text-4xl font-bold w-48 text-center placeholder-white/30 focus:outline-none tabular-nums"
              />
            </div>
            {errors.amount && <p className="text-white/80 text-xs mt-1">{errors.amount.message}</p>}
          </div>
        </div>

        {/* ── Formulário ── */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-5 pt-4 pb-5 space-y-3">

          {/* Descrição */}
          <div>
            <input
              {...register('description')}
              placeholder="Descrição (ex: Aluguel, Salário...)"
              className="w-full h-11 px-3 rounded-[12px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {errors.description && <p className="text-xs text-rose-500 mt-1">{errors.description.message}</p>}
          </div>

          {/* Categorias como chips */}
          {type !== 'transfer' && filteredCategories.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Categoria</p>
              <div className="flex gap-1.5 flex-wrap">
                {filteredCategories.slice(0, 10).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setValue('category_id', category_id === c.id ? '' : c.id)}
                    className={`h-7 px-3 rounded-full text-xs font-medium transition-all ${
                      category_id === c.id
                        ? `${cfg.activeBg} text-white`
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conta */}
          {accounts.length > 1 && (
            <select
              {...register('account_id')}
              className="w-full h-11 px-3 rounded-[12px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Selecionar conta</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
          {errors.account_id && <p className="text-xs text-rose-500 -mt-2">{errors.account_id.message}</p>}

          {/* Conta destino (transferência) */}
          {type === 'transfer' && (
            <select
              {...register('destination_account_id')}
              className="w-full h-11 px-3 rounded-[12px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Conta de destino</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}

          {/* Avançado (data, status, notas) */}
          <button
            type="button"
            onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showAdvanced ? 'Menos opções' : 'Mais opções (data, status, notas)'}
          </button>

          {showAdvanced && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Data</label>
                  <input
                    type="date"
                    {...register('transaction_date')}
                    className="w-full h-10 px-3 rounded-[10px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Status</label>
                  <select
                    {...register('status')}
                    className="w-full h-10 px-3 rounded-[10px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="completed">Concluído</option>
                    <option value="pending">Pendente</option>
                    <option value="scheduled">Agendado</option>
                  </select>
                </div>
              </div>
              <input
                {...register('notes')}
                placeholder="Observações..."
                className="w-full h-10 px-3 rounded-[10px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          <Button type="submit" fullWidth loading={isPending} className="!h-12 !text-base !rounded-[14px] mt-1">
            Salvar {cfg.label}
          </Button>
        </form>
      </div>
    </div>
  )
}
