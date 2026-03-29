import { useState } from 'react'
import { Plus, Edit2, Trash2, PieChart } from 'lucide-react'
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget } from '../../hooks/api/useBudgets'
import { useCategories } from '../../hooks/api/useCategories'
import { formatCurrency } from '../../utils/formatters'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { toast } from '../../components/ui/Toast'
import { cn } from '../../lib/utils'
import type { Budget, Category } from '../../types'

const PERIODS = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
]
const PERIOD_LABELS: Record<string, string> = { weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' }
const PERIOD_COLORS: Record<string, string> = { weekly: 'purple', monthly: 'purple', yearly: 'purple' }

interface FormData { category_id: string; amount: string; period: string; alert_threshold: number }
const defaultForm: FormData = { category_id: '', amount: '', period: 'monthly', alert_threshold: 80 }

export default function BudgetListScreen() {
  const { data: budgets = [], isLoading } = useBudgets()
  const { data: categories = [] } = useCategories()
  const createBudget = useCreateBudget()
  const updateBudget = useUpdateBudget()
  const deleteBudget = useDeleteBudget()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [form, setForm] = useState<FormData>(defaultForm)

  const expenseCategories = (categories as Category[]).filter(c => c.type === 'expense' || c.type === 'both')

  const openCreate = () => { setEditing(null); setForm(defaultForm); setModalOpen(true) }
  const openEdit = (b: Budget) => {
    setEditing(b)
    setForm({ category_id: String(b.category_id), amount: String(b.amount), period: b.period, alert_threshold: b.alert_threshold })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.category_id || !form.amount) { toast.error('Preencha todos os campos'); return }
    const payload = { category_id: parseInt(form.category_id), amount: parseFloat(form.amount), period: form.period, alert_threshold: form.alert_threshold, active: true }
    try {
      if (editing) {
        await updateBudget.mutateAsync({ id: editing.id, ...payload })
        toast.success('Orçamento atualizado!')
      } else {
        await createBudget.mutateAsync(payload)
        toast.success('Orçamento criado!')
      }
      setModalOpen(false)
    } catch {
      toast.error('Erro ao salvar orçamento.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir este orçamento?')) return
    try {
      await deleteBudget.mutateAsync(id)
      toast.success('Orçamento excluído.')
    } catch {
      toast.error('Erro ao excluir.')
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Orçamentos</h2>
        <Button onClick={openCreate} leftIcon={<Plus size={16} />}>Novo orçamento</Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse border border-gray-100">
              <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
              <div className="h-2 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && budgets.length === 0 && (
        <div className="text-center py-12">
          <PieChart size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum orçamento cadastrado</p>
          <p className="text-gray-400 text-sm mt-1">Crie orçamentos para controlar seus gastos</p>
        </div>
      )}

      {budgets.map((b: Budget) => {
        const pct = b.percentage ?? (b.amount > 0 ? Math.min(((b.spent ?? 0) / b.amount) * 100, 100) : 0)
        return (
          <Card key={b.id}>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: b.category_color || '#6366f1' }} />
                  <span className="text-sm font-semibold text-gray-900">{b.category_name || 'Categoria'}</span>
                  <Badge color={PERIOD_COLORS[b.period] as any}>{PERIOD_LABELS[b.period]}</Badge>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(b)} className="p-1.5 text-gray-400 hover:text-violet-600 transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(b.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
              <ProgressBar value={pct} max={100} showPercentage />
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>{formatCurrency(b.spent ?? 0)} usado</span>
                <span>de {formatCurrency(b.amount)}</span>
              </div>
              {b.remaining !== undefined && (
                <p className={cn('text-xs mt-1', b.remaining < 0 ? 'text-red-500' : 'text-green-600')}>
                  {b.remaining < 0 ? `Excedido em ${formatCurrency(Math.abs(b.remaining))}` : `${formatCurrency(b.remaining)} restantes`}
                </p>
              )}
            </div>
          </Card>
        )
      })}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar orçamento' : 'Novo orçamento'}
        footer={
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button fullWidth loading={createBudget.isPending || updateBudget.isPending} onClick={handleSave}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Categoria"
            options={expenseCategories.map(c => ({ value: c.id, label: c.name }))}
            placeholder="Selecione..."
            value={form.category_id}
            onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
          />
          <Input
            label="Valor limite"
            type="number"
            step="0.01"
            placeholder="0,00"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
          />
          <Select
            label="Período"
            options={PERIODS}
            value={form.period}
            onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
          />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">Alerta em</label>
              <span className="text-sm text-violet-600 font-medium">{form.alert_threshold}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={form.alert_threshold}
              onChange={e => setForm(f => ({ ...f, alert_threshold: parseInt(e.target.value) }))}
              className="w-full accent-violet-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
