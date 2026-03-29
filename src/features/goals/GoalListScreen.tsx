import { useState } from 'react'
import { Plus, Edit2, Trash2, Target, PlusCircle } from 'lucide-react'
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '../../hooks/api/useGoals'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { ProgressBar } from '../../components/ui/ProgressBar'
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
const STATUS_COLORS: Record<string, string> = { active: 'green', paused: 'yellow', completed: 'purple', cancelled: 'red' }
const STATUS_LABELS: Record<string, string> = { active: 'Ativa', paused: 'Pausada', completed: 'Concluída', cancelled: 'Cancelada' }

interface GoalFormData {
  name: string; description: string; target_amount: string; current_amount: string
  monthly_contribution: string; deadline: string; icon: string; color: string; status: string
}
const defaultForm: GoalFormData = { name: '', description: '', target_amount: '', current_amount: '0', monthly_contribution: '', deadline: '', icon: '🎯', color: COLORS[0], status: 'active' }

export default function GoalListScreen() {
  const { data: goals = [], isLoading } = useGoals()
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [form, setForm] = useState<GoalFormData>(defaultForm)
  const [contribModal, setContribModal] = useState<Goal | null>(null)
  const [contribAmount, setContribAmount] = useState('')

  const openCreate = () => { setEditing(null); setForm(defaultForm); setModalOpen(true) }
  const openEdit = (g: Goal) => {
    setEditing(g)
    setForm({
      name: g.name, description: g.description || '', target_amount: String(g.target_amount),
      current_amount: String(g.current_amount), monthly_contribution: String(g.monthly_contribution || ''),
      deadline: g.deadline ? g.deadline.split('T')[0] : '', icon: g.icon || '🎯', color: g.color || COLORS[0], status: g.status,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.target_amount) { toast.error('Preencha os campos obrigatórios'); return }
    const payload = {
      name: form.name, description: form.description || undefined, target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount) || 0, monthly_contribution: parseFloat(form.monthly_contribution) || undefined,
      deadline: form.deadline || undefined, icon: form.icon, color: form.color, status: form.status as Goal['status'], priority: 1,
    }
    try {
      if (editing) {
        await updateGoal.mutateAsync({ id: editing.id, ...payload })
        toast.success('Meta atualizada!')
      } else {
        await createGoal.mutateAsync(payload)
        toast.success('Meta criada!')
      }
      setModalOpen(false)
    } catch {
      toast.error('Erro ao salvar meta.')
    }
  }

  const handleContrib = async () => {
    if (!contribModal || !contribAmount) return
    const amt = parseFloat(contribAmount)
    if (isNaN(amt) || amt <= 0) { toast.error('Valor inválido'); return }
    try {
      await updateGoal.mutateAsync({ id: contribModal.id, current_amount: contribModal.current_amount + amt })
      toast.success('Valor adicionado!')
      setContribModal(null)
      setContribAmount('')
    } catch {
      toast.error('Erro ao adicionar valor.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir esta meta?')) return
    try {
      await deleteGoal.mutateAsync(id)
      toast.success('Meta excluída.')
    } catch {
      toast.error('Erro ao excluir.')
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Metas</h2>
        <Button onClick={openCreate} leftIcon={<Plus size={16} />}>Nova meta</Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl animate-pulse border border-gray-100 overflow-hidden">
              <div className="h-16 bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-2 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && goals.length === 0 && (
        <div className="text-center py-12">
          <Target size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma meta cadastrada</p>
          <p className="text-gray-400 text-sm mt-1">Crie metas para alcançar seus objetivos</p>
        </div>
      )}

      {goals.map((g: Goal) => {
        const pct = g.percentage ?? (g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 100) : 0)
        return (
          <Card key={g.id} className="overflow-hidden">
            {/* Colored header */}
            <div className="h-12 flex items-center px-4 gap-3" style={{ backgroundColor: g.color || COLORS[0] }}>
              <span className="text-xl">{g.icon}</span>
              <span className="text-white font-semibold text-sm flex-1 truncate">{g.name}</span>
              <div className="flex gap-1">
                <button onClick={() => openEdit(g)} className="text-white/80 hover:text-white p-1"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(g.id)} className="text-white/80 hover:text-white p-1"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {g.description && <p className="text-sm text-gray-600">{g.description}</p>}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge color={STATUS_COLORS[g.status] as any}>{STATUS_LABELS[g.status]}</Badge>
                {g.deadline && (
                  <span className="text-xs text-gray-500">Prazo: {formatDate(g.deadline.split('T')[0])}</span>
                )}
              </div>
              <ProgressBar value={pct} max={100} showPercentage />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{formatCurrency(g.current_amount)}</span>
                <span className="text-gray-500">de {formatCurrency(g.target_amount)}</span>
              </div>
              {g.monthly_contribution && (
                <p className="text-xs text-gray-500">Contribuição mensal: {formatCurrency(g.monthly_contribution)}</p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setContribModal(g); setContribAmount('') }}
                leftIcon={<PlusCircle size={14} />}
              >
                Adicionar valor
              </Button>
            </div>
          </Card>
        )
      })}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar meta' : 'Nova meta'}
        footer={
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button fullWidth loading={createGoal.isPending || updateGoal.isPending} onClick={handleSave}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Nome *" placeholder="Ex: Viagem para Europa" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Descrição</label>
            <textarea rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor alvo *" type="number" step="0.01" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} />
            <Input label="Valor atual" type="number" step="0.01" value={form.current_amount} onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Contribuição mensal" type="number" step="0.01" value={form.monthly_contribution} onChange={e => setForm(f => ({ ...f, monthly_contribution: e.target.value }))} />
            <Input label="Prazo" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ícone (emoji)" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
            <Select label="Status" options={STATUS_OPTIONS} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={cn('w-7 h-7 rounded-full border-2 transition-transform', form.color === c ? 'border-gray-700 scale-110' : 'border-transparent')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Contribution Modal */}
      <Modal open={!!contribModal} onClose={() => setContribModal(null)} title="Adicionar valor"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setContribModal(null)}>Cancelar</Button>
            <Button fullWidth loading={updateGoal.isPending} onClick={handleContrib}>Adicionar</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Adicionar valor à meta: <strong>{contribModal?.name}</strong></p>
          <Input label="Valor (R$)" type="number" step="0.01" placeholder="0,00" value={contribAmount} onChange={e => setContribAmount(e.target.value)} autoFocus />
        </div>
      </Modal>
    </div>
  )
}
