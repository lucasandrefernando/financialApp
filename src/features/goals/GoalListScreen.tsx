import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Edit2,
  Plus,
  PlusCircle,
  Search,
  Target,
  Trash2,
  Wallet,
} from 'lucide-react'
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '../../hooks/api/useGoals'
import { useAccounts } from '../../hooks/api/useAccounts'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { AlertModal, type AlertTone } from '../../components/ui/AlertModal'
import { toast } from '../../components/ui/Toast'
import { cn } from '../../lib/utils'
import type { Goal } from '../../types'

const COLORS = ['#6D28D9', '#7C3AED', '#9333EA', '#A855F7', '#C084FC', '#D946EF', '#F0ABFC']

const STATUS_OPTIONS = [
  { value: 'active', label: 'Ativa' },
  { value: 'paused', label: 'Pausada' },
  { value: 'completed', label: 'Concluída' },
  { value: 'cancelled', label: 'Cancelada' },
]

const STATUS_COLORS: Record<string, 'green' | 'yellow' | 'purple' | 'red'> = {
  active: 'green',
  paused: 'yellow',
  completed: 'purple',
  cancelled: 'red',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  paused: 'Pausada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
}

type StatusFilter = 'all' | 'active' | 'paused' | 'completed' | 'cancelled'

type AlertState = { title: string; message: string; tone?: AlertTone } | null

interface GoalFormData {
  account_id: string
  name: string
  description: string
  target_amount: string
  current_amount: string
  monthly_contribution: string
  deadline: string
  icon: string
  color: string
  status: Goal['status']
}

type GoalView = Goal & {
  account_name?: string
  percentage: number
  remaining: number
  months_to_goal: number | null
  progress?: number
}

const defaultForm: GoalFormData = {
  account_id: '',
  name: '',
  description: '',
  target_amount: '',
  current_amount: '0',
  monthly_contribution: '',
  deadline: '',
  icon: '🎯',
  color: COLORS[0],
  status: 'active',
}

function parseMoneyInput(value: string | number | null | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  if (typeof value !== 'string') return NaN
  const trimmed = value.trim()
  if (!trimmed) return NaN

  const raw = trimmed.replace(/[^\d,.-]/g, '')
  if (!raw) return NaN

  const lastComma = raw.lastIndexOf(',')
  const lastDot = raw.lastIndexOf('.')
  let normalized = raw

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      normalized = raw.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = raw.replace(/,/g, '')
    }
  } else if (lastComma !== -1) {
    normalized = raw.replace(/\./g, '').replace(',', '.')
  } else if (lastDot !== -1 && /^-?\d{1,3}(?:\.\d{3})+$/.test(raw)) {
    normalized = raw.replace(/\./g, '')
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : NaN
}

function toGoalNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeGoal(goal: any): GoalView {
  const target = toGoalNumber(goal.target_amount, 0)
  const current = toGoalNumber(goal.current_amount, 0)
  const monthly = goal.monthly_contribution == null ? undefined : toGoalNumber(goal.monthly_contribution, 0)
  const percentageFromApi = toGoalNumber(goal.percentage ?? goal.progress, NaN)
  const percentage = Number.isFinite(percentageFromApi)
    ? percentageFromApi
    : target > 0
      ? Math.min((current / target) * 100, 999)
      : 0
  const remaining = Math.max(target - current, 0)
  const monthsToGoal =
    goal.months_to_goal != null
      ? Number(goal.months_to_goal)
      : monthly && monthly > 0 && remaining > 0
        ? Math.ceil(remaining / monthly)
        : null

  return {
    ...goal,
    target_amount: target,
    current_amount: current,
    monthly_contribution: monthly,
    percentage,
    remaining,
    months_to_goal: Number.isFinite(monthsToGoal as number) ? (monthsToGoal as number) : null,
  }
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export default function GoalListScreen() {
  const { data, isLoading } = useGoals()
  const { data: accounts = [] } = useAccounts()
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()

  const goals: GoalView[] = useMemo(
    () => (Array.isArray(data) ? data.map(normalizeGoal) : []),
    [data]
  )

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [form, setForm] = useState<GoalFormData>(defaultForm)
  const [contribModal, setContribModal] = useState<Goal | null>(null)
  const [contribAmount, setContribAmount] = useState('')
  const [deleteModalGoal, setDeleteModalGoal] = useState<Goal | null>(null)
  const [alert, setAlert] = useState<AlertState>(null)

  const accountOptions = useMemo(
    () => [
      { value: '', label: 'Sem conta vinculada' },
      ...accounts.map((acc: any) => ({ value: String(acc.id), label: acc.name })),
    ],
    [accounts]
  )

  const filteredGoals = useMemo(() => {
    const normalizedSearch = normalizeText(search.trim())
    return goals.filter(goal => {
      if (statusFilter !== 'all' && goal.status !== statusFilter) return false
      if (!normalizedSearch) return true
      const haystack = normalizeText(
        [goal.name, goal.description, goal.account_name, STATUS_LABELS[goal.status] || goal.status]
          .filter(Boolean)
          .join(' ')
      )
      return haystack.includes(normalizedSearch)
    })
  }, [goals, search, statusFilter])

  const summary = useMemo(() => {
    return filteredGoals.reduce(
      (acc, goal) => {
        acc.target += goal.target_amount
        acc.current += goal.current_amount
        acc.remaining += goal.remaining
        return acc
      },
      { target: 0, current: 0, remaining: 0 }
    )
  }, [filteredGoals])

  const openCreate = () => {
    setEditing(null)
    setForm(defaultForm)
    setModalOpen(true)
  }

  const openEdit = (goal: Goal) => {
    const normalized = normalizeGoal(goal)
    setEditing(goal)
    setForm({
      account_id: normalized.account_id ? String(normalized.account_id) : '',
      name: normalized.name,
      description: normalized.description || '',
      target_amount: String(normalized.target_amount),
      current_amount: String(normalized.current_amount),
      monthly_contribution:
        normalized.monthly_contribution == null ? '' : String(normalized.monthly_contribution),
      deadline: normalized.deadline ? String(normalized.deadline).split('T')[0] : '',
      icon: normalized.icon || '🎯',
      color: normalized.color || COLORS[0],
      status: normalized.status,
    })
    setModalOpen(true)
  }

  const resetModal = () => {
    setModalOpen(false)
    setEditing(null)
    setForm(defaultForm)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setAlert({
        title: 'Nome obrigatório',
        message: 'Informe um nome para a meta.',
        tone: 'warning',
      })
      return
    }

    const targetAmount = parseMoneyInput(form.target_amount)
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      setAlert({
        title: 'Valor alvo inválido',
        message: 'Informe um valor alvo maior que zero.',
        tone: 'warning',
      })
      return
    }

    const currentAmount = form.current_amount.trim() ? parseMoneyInput(form.current_amount) : 0
    if (!Number.isFinite(currentAmount) || currentAmount < 0) {
      setAlert({
        title: 'Valor atual inválido',
        message: 'Informe um valor atual válido (zero ou positivo).',
        tone: 'warning',
      })
      return
    }

    const monthlyContribution = form.monthly_contribution.trim()
      ? parseMoneyInput(form.monthly_contribution)
      : null
    if (
      monthlyContribution != null &&
      (!Number.isFinite(monthlyContribution) || monthlyContribution < 0)
    ) {
      setAlert({
        title: 'Contribuição mensal inválida',
        message: 'Informe um valor mensal válido ou deixe em branco.',
        tone: 'warning',
      })
      return
    }

    const payload = {
      account_id: form.account_id ? Number(form.account_id) : null,
      name: form.name.trim(),
      description: form.description.trim() || null,
      target_amount: targetAmount,
      current_amount: currentAmount,
      monthly_contribution: monthlyContribution,
      deadline: form.deadline || null,
      icon: form.icon || '🎯',
      color: form.color || COLORS[0],
      status: form.status,
      priority: 1,
    }

    try {
      if (editing) {
        await updateGoal.mutateAsync({ id: editing.id, ...payload })
        toast.success('Meta atualizada com sucesso!')
      } else {
        await createGoal.mutateAsync(payload)
        toast.success('Meta criada com sucesso!')
      }
      resetModal()
    } catch (error: any) {
      setAlert({
        title: 'Erro ao salvar meta',
        message: error?.response?.data?.error || 'Não foi possível salvar a meta.',
        tone: 'error',
      })
    }
  }

  const handleContrib = async () => {
    if (!contribModal) return

    const normalizedGoal = normalizeGoal(contribModal)
    const amount = parseMoneyInput(contribAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setAlert({
        title: 'Valor inválido',
        message: 'Informe um valor de contribuição válido.',
        tone: 'warning',
      })
      return
    }

    const nextAmount = normalizedGoal.current_amount + amount

    try {
      await updateGoal.mutateAsync({
        id: normalizedGoal.id,
        current_amount: nextAmount,
      })
      toast.success('Contribuição registrada com sucesso!')
      setContribModal(null)
      setContribAmount('')
    } catch (error: any) {
      setAlert({
        title: 'Erro ao adicionar valor',
        message: error?.response?.data?.error || 'Não foi possível adicionar valor à meta.',
        tone: 'error',
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteModalGoal) return
    try {
      await deleteGoal.mutateAsync(deleteModalGoal.id)
      toast.success('Meta excluída com sucesso.')
      setDeleteModalGoal(null)
    } catch (error: any) {
      setAlert({
        title: 'Erro ao excluir meta',
        message: error?.response?.data?.error || 'Não foi possível excluir a meta.',
        tone: 'error',
      })
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-3 py-4 pb-24 sm:px-4 lg:pb-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-violet-900 to-purple-800 px-5 py-5 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-violet-300/20 blur-md" />
        <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-purple-300/20 blur-md" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-violet-100/90">Planejamento</p>
              <h2 className="text-2xl font-bold">Metas financeiras</h2>
              <p className="mt-1 text-sm text-violet-100/90">
                Organize objetivos e acompanhe sua evolução mês a mês.
              </p>
            </div>
            <Button onClick={openCreate} leftIcon={<Plus size={16} />} className="h-10 rounded-xl bg-white text-violet-700 hover:bg-violet-50">
              Nova meta
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-violet-100">Valor planejado</p>
              <p className="mt-1 text-base font-bold tabular-nums">{formatCurrency(summary.target)}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-violet-100">Valor acumulado</p>
              <p className="mt-1 text-base font-bold tabular-nums">{formatCurrency(summary.current)}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
              <p className="text-[11px] uppercase tracking-wide text-violet-100">Valor restante</p>
              <p className="mt-1 text-base font-bold tabular-nums">{formatCurrency(summary.remaining)}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-slate-200">
        <div className="space-y-3 px-3 py-3 sm:px-4">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, descrição ou conta..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'active', 'paused', 'completed', 'cancelled'] as StatusFilter[]).map(status => {
              const label =
                status === 'all'
                  ? 'Todas'
                  : STATUS_LABELS[status]
              const count =
                status === 'all' ? goals.length : goals.filter(goal => goal.status === status).length
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    statusFilter === status
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                  )}
                >
                  {label}
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px]">{count}</span>
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 h-4 w-36 rounded-full bg-slate-200" />
              <div className="space-y-2">
                <div className="h-3 w-full rounded-full bg-slate-200" />
                <div className="h-3 w-2/3 rounded-full bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredGoals.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Target size={42} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-700">Nenhuma meta encontrada</p>
          <p className="mt-1 text-sm text-slate-500">
            Ajuste os filtros ou crie uma nova meta para começar.
          </p>
        </div>
      )}

      {!isLoading && filteredGoals.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredGoals.map(goal => {
            const pct = Math.max(0, goal.percentage || 0)
            const isCompleted = pct >= 100 || goal.status === 'completed'
            return (
              <Card key={goal.id} className="overflow-hidden border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 px-4 py-3" style={{ background: `linear-gradient(90deg, ${goal.color || COLORS[0]}, #6d28d9)` }}>
                  <span className="text-xl">{goal.icon || '🎯'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{goal.name}</p>
                    <p className="text-xs text-white/85">{goal.account_name || 'Sem conta vinculada'}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(goal)}
                      className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                      aria-label={`Editar meta ${goal.name}`}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteModalGoal(goal)}
                      className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                      aria-label={`Excluir meta ${goal.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color={STATUS_COLORS[goal.status] || 'gray'}>
                      {STATUS_LABELS[goal.status] || goal.status}
                    </Badge>
                    {goal.deadline && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <CalendarDays size={12} />
                        Prazo: {formatDate(String(goal.deadline).split('T')[0])}
                      </span>
                    )}
                  </div>

                  {goal.description && (
                    <p className="line-clamp-2 text-sm text-slate-600">{goal.description}</p>
                  )}

                  <ProgressBar value={pct} max={100} showPercentage />

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Atual</p>
                      <p className="font-semibold tabular-nums text-slate-800">{formatCurrency(goal.current_amount)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Alvo</p>
                      <p className="font-semibold tabular-nums text-slate-800">{formatCurrency(goal.target_amount)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Restante</p>
                      <p className={cn('font-semibold tabular-nums', goal.remaining > 0 ? 'text-slate-800' : 'text-emerald-600')}>
                        {formatCurrency(goal.remaining)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">Previsão</p>
                      <p className="font-semibold text-slate-800">
                        {isCompleted ? 'Concluída' : goal.months_to_goal ? `${goal.months_to_goal} meses` : 'Sem previsão'}
                      </p>
                    </div>
                  </div>

                  {goal.monthly_contribution != null && goal.monthly_contribution > 0 && (
                    <p className="text-xs text-slate-500">
                      Contribuição mensal planejada: {formatCurrency(goal.monthly_contribution)}
                    </p>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setContribModal(goal)
                      setContribAmount('')
                    }}
                    leftIcon={<PlusCircle size={14} />}
                    className="w-full rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50"
                  >
                    Adicionar valor
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={resetModal}
        title={editing ? 'Editar meta' : 'Nova meta'}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={resetModal}>
              Cancelar
            </Button>
            <Button fullWidth loading={createGoal.isPending || updateGoal.isPending} onClick={handleSave}>
              {editing ? 'Salvar alterações' : 'Criar meta'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome da meta"
            placeholder="Ex: Reserva de emergência"
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Descrição</label>
            <textarea
              rows={2}
              className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <Select
            label="Conta vinculada (opcional)"
            options={accountOptions}
            value={form.account_id}
            onChange={e => setForm(prev => ({ ...prev, account_id: e.target.value }))}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Valor alvo (R$)"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={form.target_amount}
              onChange={e => setForm(prev => ({ ...prev, target_amount: e.target.value }))}
            />
            <Input
              label="Valor atual (R$)"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={form.current_amount}
              onChange={e => setForm(prev => ({ ...prev, current_amount: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Contribuição mensal (R$)"
              type="text"
              inputMode="decimal"
              placeholder="Opcional"
              value={form.monthly_contribution}
              onChange={e => setForm(prev => ({ ...prev, monthly_contribution: e.target.value }))}
            />
            <Input
              label="Prazo"
              type="date"
              value={form.deadline}
              onChange={e => setForm(prev => ({ ...prev, deadline: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Ícone (emoji)"
              value={form.icon}
              onChange={e => setForm(prev => ({ ...prev, icon: e.target.value }))}
            />
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={e => setForm(prev => ({ ...prev, status: e.target.value as Goal['status'] }))}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Cor da meta</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, color }))}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 transition-transform',
                    form.color === color ? 'scale-110 border-slate-800' : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Selecionar cor ${color}`}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(contribModal)}
        onClose={() => setContribModal(null)}
        title="Adicionar contribuição"
        size="sm"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setContribModal(null)}>
              Cancelar
            </Button>
            <Button fullWidth loading={updateGoal.isPending} onClick={handleContrib}>
              Adicionar
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Meta: <strong>{contribModal?.name}</strong>
          </p>
          <Input
            label="Valor (R$)"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={contribAmount}
            onChange={e => setContribAmount(e.target.value)}
            leftIcon={<Wallet size={16} />}
            autoFocus
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteModalGoal)}
        onClose={() => setDeleteModalGoal(null)}
        title="Excluir meta"
        size="sm"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setDeleteModalGoal(null)}>
              Cancelar
            </Button>
            <Button fullWidth variant="danger" loading={deleteGoal.isPending} onClick={handleDelete}>
              Excluir meta
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Tem certeza que deseja excluir a meta <strong>{deleteModalGoal?.name}</strong>?
          Esta ação não pode ser desfeita.
        </p>
      </Modal>

      <AlertModal
        open={Boolean(alert)}
        title={alert?.title || ''}
        message={alert?.message || ''}
        tone={alert?.tone}
        onClose={() => setAlert(null)}
      />
    </div>
  )
}
