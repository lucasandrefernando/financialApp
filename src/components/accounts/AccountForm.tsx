import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { Search, ChevronDown, X } from 'lucide-react'
import type { Account } from '@/types/database'
import { useEffect } from 'react'

// ─── Bancos brasileiros ───────────────────────────────────────────────────────
const BANKS = [
  { name: 'Nubank', color: '#820AD1' },
  { name: 'Itaú', color: '#EC7000' },
  { name: 'Bradesco', color: '#CC0000' },
  { name: 'Banco do Brasil', color: '#FFCC00' },
  { name: 'Caixa Econômica', color: '#005CA9' },
  { name: 'Santander', color: '#EC0000' },
  { name: 'Inter', color: '#FF7A00' },
  { name: 'C6 Bank', color: '#222222' },
  { name: 'BTG Pactual', color: '#003E82' },
  { name: 'XP Investimentos', color: '#000000' },
  { name: 'PicPay', color: '#11C76F' },
  { name: 'Mercado Pago', color: '#00BCFF' },
  { name: 'Sicoob', color: '#00855F' },
  { name: 'Sicredi', color: '#7AB51D' },
  { name: 'Banco Safra', color: '#1A3668' },
  { name: 'Banco Original', color: '#00A652' },
  { name: 'Next', color: '#00FF99' },
  { name: 'Neon', color: '#00E5C3' },
  { name: 'Will Bank', color: '#FFDD00' },
  { name: 'Outro', color: '#6366F1' },
]

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Conta Corrente' },
  { value: 'savings', label: 'Poupança' },
  { value: 'investment', label: 'Investimento' },
  { value: 'cash', label: 'Dinheiro Físico' },
  { value: 'digital_wallet', label: 'Carteira Digital' },
]

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  type: z.enum(['checking', 'savings', 'investment', 'cash', 'digital_wallet']),
  bank_name: z.string().min(1, 'Selecione um banco'),
  account_number: z.string().optional(),
  initial_amount: z.coerce.number().min(0).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  notes: z.string().optional(),
  include_in_sum: z.boolean(),
})

type FormData = z.infer<typeof schema>

interface AccountFormProps {
  account?: Account | null
  onClose: () => void
}


export function AccountForm({ account, onClose }: AccountFormProps) {
  const user = useAuthStore((state) => state.user)
  const { success, error: showError } = useToast()
  const isEditing = !!account
  const [bankSearch, setBankSearch] = useState('')
  const [bankPickerOpen, setBankPickerOpen] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: account?.name ?? '',
      type: (account?.type as FormData['type']) ?? 'checking',
      bank_name: account?.bank_name ?? '',
      account_number: account?.account_number ?? '',
      initial_amount: 0,
      color: (account?.color as string) ?? '#6366F1',
      notes: account?.notes ?? '',
      include_in_sum: account?.include_in_sum ?? true,
    },
  })

  const selectedBank = watch('bank_name')
  const selectedColor = watch('color')
  const selectedType = watch('type')
  const includeInSum = watch('include_in_sum')

  useEffect(() => {
    if (account) {
      setValue('name', account.name)
      setValue('type', account.type as FormData['type'])
      setValue('bank_name', account.bank_name ?? '')
      setValue('account_number', account.account_number ?? '')
      setValue('color', (account.color as string) ?? '#6366F1')
      setValue('notes', account.notes ?? '')
      setValue('include_in_sum', account.include_in_sum)
    }
  }, [account, setValue])

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!user) throw new Error('Não autenticado')
      const payload = {
        name: data.name,
        type: data.type,
        bank_name: data.bank_name,
        account_number: data.account_number,
        color: data.color,
        notes: data.notes,
        include_in_sum: data.include_in_sum,
        user_id: user.id,
        icon: 'wallet',
        is_active: true,
        initial_balance: 0,
        balance: 0,
      }

      if (isEditing) {
        const { error } = await (supabase.from('accounts') as any).update(payload).eq('id', account!.id)
        if (error) throw error
      } else {
        // Cria conta com saldo zero
        const { data: created, error } = await (supabase.from('accounts') as any)
          .insert(payload).select().single()
        if (error) throw error

        // Se informou saldo inicial, cria transação de receita automática
        if (data.initial_amount && data.initial_amount > 0) {
          await (supabase.from('transactions') as any).insert({
            user_id: user.id,
            account_id: created.id,
            type: 'income',
            amount: data.initial_amount,
            description: 'Saldo inicial',
            transaction_date: new Date().toISOString().split('T')[0],
            status: 'completed',
            is_reconciled: false,
            tags: [],
            attachments: [],
            metadata: {},
          })
        }
      }
    },
    onSuccess: () => {
      success(`Conta ${isEditing ? 'atualizada' : 'criada'} com sucesso!`)
      onClose()
    },
    onError: (err: any) => showError(`Erro: ${err.message}`),
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate(data)
  }

  const filteredBanks = BANKS.filter(b =>
    b.name.toLowerCase().includes(bankSearch.toLowerCase())
  )

  const selectBank = (bank: typeof BANKS[0]) => {
    setValue('bank_name', bank.name)
    setValue('color', bank.color)
    setBankPickerOpen(false)
    setBankSearch('')
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 w-full sm:max-w-lg rounded-t-[24px] sm:rounded-[20px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {isEditing ? 'Editar Conta' : 'Nova Conta'}
          </h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-5">

            {/* Banco */}
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                Banco / Instituição *
              </label>
              <button
                type="button"
                onClick={() => setBankPickerOpen(true)}
                className="w-full h-11 px-3 rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <div className="flex items-center gap-2">
                  {selectedColor && selectedBank && (
                    <div className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: selectedColor }} />
                  )}
                  <span className={selectedBank ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}>
                    {selectedBank || 'Selecionar banco...'}
                  </span>
                </div>
                <ChevronDown size={16} className="text-slate-400" />
              </button>
              {errors.bank_name && <p className="text-xs text-error-500 mt-1">{errors.bank_name.message}</p>}
            </div>

            {/* Nome da conta */}
            <Input
              label="Nome da Conta *"
              placeholder="Ex: Conta Principal, Reserva..."
              error={errors.name?.message}
              {...register('name')}
            />

            {/* Tipo + Número */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Tipo *</label>
                <select
                  className="w-full h-11 px-3 rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={selectedType}
                  onChange={e => setValue('type', e.target.value as FormData['type'])}
                >
                  {ACCOUNT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Número da Conta"
                placeholder="0000-0"
                {...register('account_number')}
              />
            </div>

            {/* Saldo inicial — só na criação */}
            {!isEditing && (
              <div>
                <Input
                  label="Quanto você tem nessa conta agora? (opcional)"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  {...register('initial_amount')}
                />
                <p className="text-xs text-slate-400 mt-1">
                  Será registrado automaticamente como uma transação de receita "Saldo inicial".
                </p>
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Observações</label>
              <textarea
                rows={2}
                placeholder="Informações adicionais..."
                className="w-full px-3 py-2.5 rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                {...register('notes')}
              />
            </div>

            {/* Incluir no saldo total */}
            <button
              type="button"
              onClick={() => setValue('include_in_sum', !includeInSum)}
              className="w-full flex items-center justify-between p-3 rounded-[12px] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Incluir no Saldo Total</p>
                <p className="text-xs text-slate-400 mt-0.5">Conta aparece no saldo consolidado do dashboard</p>
              </div>
              <div className={`h-6 w-11 rounded-full transition-colors ${includeInSum ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'} flex items-center px-0.5`}>
                <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${includeInSum ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </button>

          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 pb-6 pt-2">
            <Button type="button" variant="ghost" fullWidth onClick={onClose}>Cancelar</Button>
            <Button type="submit" fullWidth loading={mutation.isPending}>
              {isEditing ? 'Salvar' : 'Criar Conta'}
            </Button>
          </div>
        </form>
      </div>

      {/* Bank Picker Modal */}
      {bankPickerOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setBankPickerOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white dark:bg-slate-900 w-full sm:max-w-sm rounded-t-[24px] sm:rounded-[20px] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 pt-5 pb-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Selecionar Banco</p>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={bankSearch}
                  onChange={e => setBankSearch(e.target.value)}
                  placeholder="Buscar banco..."
                  className="w-full h-10 pl-9 pr-3 rounded-[10px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800 px-2 pb-4">
              {filteredBanks.map(bank => (
                <button
                  key={bank.name}
                  type="button"
                  onClick={() => selectBank(bank)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-[10px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <div className="h-8 w-8 rounded-full flex-shrink-0" style={{ backgroundColor: bank.color }} />
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{bank.name}</span>
                  {selectedBank === bank.name && (
                    <span className="ml-auto text-primary-500 text-xs font-semibold">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
