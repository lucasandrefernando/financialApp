import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState, SkeletonList } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useGoals, useCreateGoal, useContributeToGoal } from '@/hooks/api/useGoals'
import { useToast } from '@/components/ui/Toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { formatCurrency } from '@/utils/formatters'

const goalSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  target_amount: z.coerce.number().positive('Valor deve ser positivo'),
  current_amount: z.coerce.number().min(0),
  monthly_contribution: z.coerce.number().min(0),
  deadline: z.string().optional(),
  priority: z.coerce.number().min(1).max(5),
})

const contributeSchema = z.object({
  amount: z.coerce.number().positive('Valor deve ser positivo'),
})

type GoalForm = z.infer<typeof goalSchema>
type ContributeForm = z.infer<typeof contributeSchema>

export function GoalListScreen() {
  const [addOpen, setAddOpen] = useState(false)
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null)
  const { data: goals = [], isLoading } = useGoals()
  const { mutateAsync: createGoal, isPending: creating } = useCreateGoal()
  const { mutateAsync: contribute, isPending: contributing } = useContributeToGoal()
  const { success, error } = useToast()

  const goalForm = useForm<GoalForm>({
    resolver: zodResolver(goalSchema),
    defaultValues: { current_amount: 0, monthly_contribution: 0, priority: 1 },
  })

  const contribForm = useForm<ContributeForm>({ resolver: zodResolver(contributeSchema) })

  const onCreateGoal = async (data: GoalForm) => {
    try {
      await createGoal({
        name: data.name,
        target_amount: data.target_amount,
        current_amount: data.current_amount,
        monthly_contribution: data.monthly_contribution,
        deadline: data.deadline ?? null,
        priority: data.priority,
        status: 'active',
        color: '#6366F1',
        icon: 'target',
        description: null,
        account_id: null,
        notes: null,
        metadata: {},
        deleted_at: null,
      })
      success('Meta criada!')
      goalForm.reset()
      setAddOpen(false)
    } catch {
      error('Não foi possível criar a meta')
    }
  }

  const onContribute = async (data: ContributeForm) => {
    if (!contributeGoalId) return
    try {
      await contribute({ id: contributeGoalId, amount: data.amount })
      success('Contribuição registrada!')
      contribForm.reset()
      setContributeGoalId(null)
    } catch {
      error('Não foi possível registrar a contribuição')
    }
  }

  return (
    <AppLayout title="Metas">
      <div className="p-4 lg:p-6 max-w-screen-xl mx-auto space-y-4">

        {isLoading ? (
          <SkeletonList count={3} />
        ) : goals.length === 0 ? (
          <EmptyState title="Nenhuma meta" description="Comece a planejar seu futuro financeiro" actionLabel="Criar meta" onAction={() => setAddOpen(true)} />
        ) : (
          <div className="space-y-3">
            {goals.map((g) => (
              <div key={g.id} className="bg-white dark:bg-slate-800 rounded-[16px] p-4 border border-slate-100 dark:border-slate-700">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{g.name}</h3>
                    {g.deadline && <p className="text-xs text-slate-500 mt-0.5">Prazo: {new Date(g.deadline).toLocaleDateString('pt-BR')}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums text-primary-500">{g.percent_complete.toFixed(0)}%</p>
                    {g.months_to_complete && <p className="text-xs text-slate-500">{g.months_to_complete} meses</p>}
                  </div>
                </div>
                <ProgressBar current={g.current_amount} total={g.target_amount} showPercentage={false} />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-slate-500 tabular-nums">
                    {formatCurrency(g.current_amount)} de {formatCurrency(g.target_amount)}
                  </p>
                  <Button size="sm" variant="secondary" onClick={() => { setContributeGoalId(g.id); contribForm.reset() }}>
                    + Contribuir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => setAddOpen(true)} className="lg:hidden fixed bottom-20 right-4 h-14 w-14 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-fab hover:bg-primary-600 z-30" aria-label="Nova meta">
        <Plus size={24} />
      </button>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Nova Meta">
        <form onSubmit={goalForm.handleSubmit(onCreateGoal)} className="space-y-4">
          <Input label="Nome *" placeholder="Ex: Viagem Europa" error={goalForm.formState.errors.name?.message} {...goalForm.register('name')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor alvo *" type="number" step="0.01" error={goalForm.formState.errors.target_amount?.message} {...goalForm.register('target_amount')} />
            <Input label="Já tenho (R$)" type="number" step="0.01" {...goalForm.register('current_amount')} />
          </div>
          <Input label="Contribuição mensal" type="number" step="0.01" {...goalForm.register('monthly_contribution')} />
          <Input label="Prazo (opcional)" type="date" {...goalForm.register('deadline')} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" fullWidth onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button type="submit" fullWidth loading={creating}>Salvar</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!contributeGoalId} onClose={() => setContributeGoalId(null)} title="Contribuir para a Meta" size="sm">
        <form onSubmit={contribForm.handleSubmit(onContribute)} className="space-y-4">
          <Input label="Valor a guardar (R$)" type="number" step="0.01" autoFocus error={contribForm.formState.errors.amount?.message} {...contribForm.register('amount')} />
          <div className="flex gap-3">
            <Button type="button" variant="ghost" fullWidth onClick={() => setContributeGoalId(null)}>Cancelar</Button>
            <Button type="submit" fullWidth loading={contributing}>Confirmar</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
