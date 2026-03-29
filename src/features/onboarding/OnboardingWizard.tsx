import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { accountsService } from '../../services/accounts'
import { incomeService } from '../../services/income'
import api from '../../lib/api'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { formatCurrency } from '../../utils/formatters'
import { cn } from '../../lib/utils'
import { BrandIcon, BrandWordmark } from '../../components/brand/Brand'

// Step 1: Personal data
const step1Schema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  currency: z.string(),
  timezone: z.string(),
})
type Step1Data = z.infer<typeof step1Schema>

// Step 2: Accounts
interface AccountDraft {
  id: string
  name: string
  type: string
  bank_name: string
  initial_balance: number
  color: string
}

// Step 3: Income
interface IncomeDraft {
  id: string
  name: string
  type: string
  amount: number
  day_of_month: number
  account_idx: number
}

const COLORS = ['#6D28D9', '#7C3AED', '#9333EA', '#A855F7', '#C084FC']
const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Conta Corrente' },
  { value: 'savings', label: 'Poupança' },
  { value: 'investment', label: 'Investimentos' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'digital_wallet', label: 'Carteira Digital' },
]
const INCOME_TYPES = [
  { value: 'salary', label: 'Salário' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'rental', label: 'Aluguel' },
  { value: 'pension', label: 'Aposentadoria' },
  { value: 'dividends', label: 'Dividendos' },
  { value: 'investment', label: 'Investimentos' },
  { value: 'other', label: 'Outro' },
]

export default function OnboardingWizard() {
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()
  const [step, setStep] = useState(1)
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
  const [accounts, setAccounts] = useState<AccountDraft[]>([])
  const [incomes, setIncomes] = useState<IncomeDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Account form state
  const [accForm, setAccForm] = useState({ name: '', type: 'checking', bank_name: '', initial_balance: '', color: COLORS[0] })
  const [incForm, setIncForm] = useState({ name: '', type: 'salary', amount: '', day_of_month: '5', account_idx: '0' })

  const { register: r1, handleSubmit: h1, formState: { errors: e1 } } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { name: user?.name || '', currency: 'BRL', timezone: 'America/Sao_Paulo' },
  })

  const onStep1 = (data: Step1Data) => {
    setStep1Data(data)
    setStep(2)
  }

  const addAccount = () => {
    if (!accForm.name.trim()) return
    setAccounts(a => [...a, {
      id: Math.random().toString(36).slice(2),
      name: accForm.name,
      type: accForm.type,
      bank_name: accForm.bank_name,
      initial_balance: parseFloat(accForm.initial_balance) || 0,
      color: accForm.color,
    }])
    setAccForm({ name: '', type: 'checking', bank_name: '', initial_balance: '', color: COLORS[0] })
  }

  const addIncome = () => {
    if (!incForm.name.trim()) return
    setIncomes(i => [...i, {
      id: Math.random().toString(36).slice(2),
      name: incForm.name,
      type: incForm.type,
      amount: parseFloat(incForm.amount) || 0,
      day_of_month: parseInt(incForm.day_of_month) || 1,
      account_idx: parseInt(incForm.account_idx) || 0,
    }])
    setIncForm({ name: '', type: 'salary', amount: '', day_of_month: '5', account_idx: '0' })
  }

  const finish = async () => {
    if (accounts.length === 0) { setError('Adicione pelo menos uma conta'); return }
    setSaving(true)
    setError('')
    try {
      const createdAccounts = await Promise.all(
        accounts.map(a => accountsService.create({
          name: a.name,
          type: a.type,
          bank_name: a.bank_name || undefined,
          initial_balance: a.initial_balance,
          color: a.color,
          icon: 'wallet',
          include_in_total: true,
        }))
      )
      if (incomes.length > 0) {
        await Promise.all(
          incomes.map(inc => {
            const acc = createdAccounts[inc.account_idx]
            return incomeService.create({
              name: inc.name,
              type: inc.type,
              amount: inc.amount,
              day_of_month: inc.day_of_month,
              account_id: acc?.id,
              active: true,
            })
          })
        )
      }
      const { data } = await api.post('/api/onboarding/complete', step1Data)
      setUser(data.user || { ...user!, onboarding_completed: true })
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <BrandIcon size="md" className="mb-3" />
          <BrandWordmark size="md" className="justify-center" />
          <h1 className="text-xl font-bold text-gray-900">Configurar conta</h1>
          <p className="text-gray-500 text-sm mt-1">Passo {step} de 3</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className={cn('flex-1 h-1.5 rounded-full', s <= step ? 'bg-violet-600' : 'bg-gray-200')} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
          )}

          {/* Step 1: Personal data */}
          {step === 1 && (
            <form onSubmit={h1(onStep1)} className="space-y-4">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Dados pessoais</h2>
              <Input label="Nome" error={e1.name?.message} {...r1('name')} />
              <Select
                label="Moeda"
                options={[{ value: 'BRL', label: 'R$ - Real Brasileiro' }, { value: 'USD', label: '$ - Dólar' }, { value: 'EUR', label: '€ - Euro' }]}
                {...r1('currency')}
              />
              <Select
                label="Fuso horário"
                options={[
                  { value: 'America/Sao_Paulo', label: 'América/São Paulo' },
                  { value: 'America/Manaus', label: 'América/Manaus' },
                  { value: 'America/Belem', label: 'América/Belém' },
                  { value: 'America/Fortaleza', label: 'América/Fortaleza' },
                  { value: 'America/Recife', label: 'América/Recife' },
                ]}
                {...r1('timezone')}
              />
              <Button type="submit" fullWidth>Próximo</Button>
            </form>
          )}

          {/* Step 2: Accounts */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-900">Contas bancárias</h2>
              <p className="text-sm text-gray-500">Adicione pelo menos uma conta para continuar.</p>

              {accounts.length > 0 && (
                <ul className="space-y-2 mb-2">
                  {accounts.map((a, i) => (
                    <li key={a.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(a.initial_balance)}</p>
                      </div>
                      <button onClick={() => setAccounts(acc => acc.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
                <Input
                  label="Nome da conta"
                  placeholder="Ex: Nubank, Bradesco..."
                  value={accForm.name}
                  onChange={e => setAccForm(f => ({ ...f, name: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Tipo"
                    options={ACCOUNT_TYPES}
                    value={accForm.type}
                    onChange={e => setAccForm(f => ({ ...f, type: e.target.value }))}
                  />
                  <Input
                    label="Banco (opcional)"
                    placeholder="Ex: Nubank"
                    value={accForm.bank_name}
                    onChange={e => setAccForm(f => ({ ...f, bank_name: e.target.value }))}
                  />
                </div>
                <Input
                  label="Saldo inicial"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={accForm.initial_balance}
                  onChange={e => setAccForm(f => ({ ...f, initial_balance: e.target.value }))}
                />
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Cor</label>
                  <div className="flex gap-2">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAccForm(f => ({ ...f, color: c }))}
                        className={cn('w-7 h-7 rounded-full border-2 transition-transform', accForm.color === c ? 'border-gray-800 scale-110' : 'border-transparent')}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <Button variant="outline" onClick={addAccount} leftIcon={<Plus size={14} />} size="sm">
                  Adicionar conta
                </Button>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} fullWidth>Voltar</Button>
                <Button onClick={() => { if (accounts.length === 0) setError('Adicione pelo menos uma conta'); else { setError(''); setStep(3) } }} fullWidth>
                  Próximo
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Income */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-900">Fontes de renda</h2>
              <p className="text-sm text-gray-500">Opcional. Adicione suas fontes de renda recorrentes.</p>

              {incomes.length > 0 && (
                <ul className="space-y-2 mb-2">
                  {incomes.map((inc, i) => (
                    <li key={inc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{inc.name}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(inc.amount)} • Dia {inc.day_of_month}</p>
                      </div>
                      <button onClick={() => setIncomes(arr => arr.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
                <Input
                  label="Nome"
                  placeholder="Ex: Salário, Freela..."
                  value={incForm.name}
                  onChange={e => setIncForm(f => ({ ...f, name: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Tipo"
                    options={INCOME_TYPES}
                    value={incForm.type}
                    onChange={e => setIncForm(f => ({ ...f, type: e.target.value }))}
                  />
                  <Input
                    label="Dia do mês"
                    type="number"
                    min={1}
                    max={31}
                    value={incForm.day_of_month}
                    onChange={e => setIncForm(f => ({ ...f, day_of_month: e.target.value }))}
                  />
                </div>
                <Input
                  label="Valor"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={incForm.amount}
                  onChange={e => setIncForm(f => ({ ...f, amount: e.target.value }))}
                />
                {accounts.length > 0 && (
                  <Select
                    label="Conta"
                    options={accounts.map((a, i) => ({ value: i, label: a.name }))}
                    value={incForm.account_idx}
                    onChange={e => setIncForm(f => ({ ...f, account_idx: e.target.value }))}
                  />
                )}
                <Button variant="outline" onClick={addIncome} leftIcon={<Plus size={14} />} size="sm">
                  Adicionar renda
                </Button>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(2)} fullWidth>Voltar</Button>
                <Button
                  onClick={finish}
                  loading={saving}
                  fullWidth
                  leftIcon={<CheckCircle size={16} />}
                >
                  Concluir
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
