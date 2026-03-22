import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState, SkeletonList } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { useBudgets, useCreateBudget } from '@/hooks/api/useBudgets'
import { useCategories } from '@/hooks/api/useCategoriesAndNotifications'
import { useToast } from '@/components/ui/Toast'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { z } from 'zod'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/utils/formatters'
import { format, startOfMonth } from 'date-fns'
import { clsx } from 'clsx'

const budgetSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  category_id: z.string().optional(),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  alert_threshold: z.coerce.number().min(1).max(100),
})

type BudgetForm = z.infer<typeof budgetSchema>

export function BudgetListScreen() {
  const [addOpen, setAddOpen] = useState(false)
  const { data: budgets = [], isLoading } = useBudgets()
  const { data: categories = [] } = useCategories()
  const { mutateAsync: createBudget, isPending } = useCreateBudget()
  const { success, error } = useToast()

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<BudgetForm>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { period: 'monthly', alert_threshold: 80 },
  })

  const total = budgets.reduce((s, b) => s + b.amount, 0)
  const spent = budgets.reduce((s, b) => s + b.spent, 0)

  const onSubmit = async (data: BudgetForm) => {
    try {
      await createBudget({
        name: data.name,
        amount: data.amount,
        category_id: data.category_id ?? null,
        period: data.period,
        start_date: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end_date: null,
        alert_threshold: data.alert_threshold,
        is_active: true,
        rollover: false,
        notes: null,
        metadata: {},
        deleted_at: null,
      })
      success('Orçamento criado!')
      reset()
      setAddOpen(false)
    } catch (e) {
      error('Não foi possível criar o orçamento')
    }
  }

  return (
    <AppLayout title="Orçamentos" showMonthNav>
      <div className="p-4 lg:p-6 max-w-screen-xl mx-auto space-y-4">

        {budgets.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-[16px] p-4 border border-slate-100 dark:border-slate-700">
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div><p className="text-xs text-slate-500">Total orçado</p><p className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">{formatCurrency(total)}</p></div>
              <div><p className="text-xs text-slate-500">Gasto</p><p className="font-bold text-error-500 tabular-nums">{formatCurrency(spent)}</p></div>
              <div><p className="text-xs text-slate-500">Disponível</p><p className="font-bold text-success-500 tabular-nums">{formatCurrency(total - spent)}</p></div>
            </div>
            <ProgressBar current={spent} total={total} showValues={false} />
          </div>
        )}

        {isLoading ? (
          <SkeletonList count={4} />
        ) : budgets.length === 0 ? (
          <EmptyState title="Sem orçamentos" description="Controle seus gastos por categoria" actionLabel="Criar orçamento" onAction={() => setAddOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {budgets.map((b) => (
              <Link key={b.id} to={`/budgets/${b.id}`}
                className="block bg-white dark:bg-slate-800 rounded-[16px] p-4 border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {b.category_icon && <span className="text-base">{b.category_icon}</span>}
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{b.name}</span>
                  </div>
                  <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full',
                    b.alert_level === 'exceeded' ? 'bg-error-100 text-error-500' :
                    b.alert_level === 'alert' ? 'bg-warning-100 text-warning-500' :
                    'bg-success-100 text-success-500'
                  )}>
                    {b.percent_used.toFixed(0)}%
                  </span>
                </div>
                <ProgressBar current={b.spent} total={b.amount} alertThreshold={b.alert_threshold} showPercentage={false} />
              </Link>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setAddOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 h-14 w-14 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-fab hover:bg-primary-600 transition-colors z-30"
        aria-label="Criar orçamento"
      >
        <Plus size={24} />
      </button>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Novo Orçamento">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Nome *" placeholder="Ex: Alimentação mensal" error={errors.name?.message} {...register('name')} />
          <Input label="Valor limite *" type="number" step="0.01" placeholder="0,00" error={errors.amount?.message} {...register('amount')} />
          {/* Fix #13: use Radix Select component instead of raw <select> */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Categoria</label>
            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger className="rounded-[10px] focus:ring-primary-500">
                    <SelectValue placeholder="Geral (todas as categorias)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Geral (todas as categorias)</SelectItem>
                    {categories.filter(c => c.type !== 'income').map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <Input label="Alerta em (%)" type="number" min="1" max="100" {...register('alert_threshold')} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" fullWidth onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button type="submit" fullWidth loading={isPending}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  )
}
