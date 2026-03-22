import { Save, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Bell, Volume2, Clock, Zap } from 'lucide-react'
import { Button } from './Button'
import { useToast } from './Toast'

interface NotificationPreferences {
  enabled: boolean
  pushEnabled: boolean
  emailEnabled: boolean
  inAppEnabled: boolean
  soundEnabled: boolean
  silentHours: { start: string; end: string }
  maxPerDay: number
  types: Record<string, boolean>
}

interface NotificationSettingsProps {
  onSave?: (preferences: NotificationPreferences) => void
  loading?: boolean
}

const notificationTypeLabels: Record<string, string> = {
  budget_alert: '💰 Alertas de Orçamento',
  goal_reached: '🎉 Metas Atingidas',
  bill_due: '📅 Contas a Vencer',
  large_expense: '⚠️ Gastos Elevados',
  low_balance: '📉 Saldo Baixo',
  recurring_created: '🔄 Transações Recorrentes',
  installment_due: '💳 Parcelas Vencendo',
  general: 'ℹ️ Avisos Gerais',
}

/**
 * Configurações de preferências de notificações
 */
export function NotificationSettings({ onSave, loading }: NotificationSettingsProps) {
  const { success } = useToast()

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    pushEnabled: true,
    emailEnabled: false,
    inAppEnabled: true,
    soundEnabled: true,
    silentHours: { start: '22:00', end: '07:00' },
    maxPerDay: 20,
    types: {
      budget_alert: true,
      goal_reached: true,
      bill_due: true,
      large_expense: true,
      low_balance: true,
      recurring_created: true,
      installment_due: true,
      general: true,
    },
  })

  const [changed, setChanged] = useState(false)

  const handleMainToggle = (key: keyof Omit<NotificationPreferences, 'types' | 'silentHours'>) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
    setChanged(true)
  }

  const handleTypeToggle = (type: string) => {
    setPreferences((prev) => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: !prev.types[type],
      },
    }))
    setChanged(true)
  }

  const handleSilentHoursChange = (field: 'start' | 'end', value: string) => {
    setPreferences((prev) => ({
      ...prev,
      silentHours: {
        ...prev.silentHours,
        [field]: value,
      },
    }))
    setChanged(true)
  }

  const handleMaxPerDayChange = (value: number) => {
    setPreferences((prev) => ({
      ...prev,
      maxPerDay: Math.max(1, Math.min(100, value)),
    }))
    setChanged(true)
  }

  const handleSave = () => {
    onSave?.(preferences)
    setChanged(false)
    success('✓ Preferências salvas')
  }

  const handleReset = () => {
    setPreferences({
      enabled: true,
      pushEnabled: true,
      emailEnabled: false,
      inAppEnabled: true,
      soundEnabled: true,
      silentHours: { start: '22:00', end: '07:00' },
      maxPerDay: 20,
      types: {
        budget_alert: true,
        goal_reached: true,
        bill_due: true,
        large_expense: true,
        low_balance: true,
        recurring_created: true,
        installment_due: true,
        general: true,
      },
    })
    setChanged(true)
  }

  return (
    <div className="space-y-6">
      {/* Principal */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Configuração Principal</h3>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.enabled}
            onChange={() => handleMainToggle('enabled')}
            className="w-4 h-4 rounded"
          />
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              Ativar notificações
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Desativar todas as notificações do app
            </p>
          </div>
        </label>
      </div>

      {/* Canais */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Bell size={18} /> Canais
        </h3>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.inAppEnabled}
            onChange={() => handleMainToggle('inAppEnabled')}
            disabled={!preferences.enabled}
            className="w-4 h-4 rounded disabled:opacity-50"
          />
          <span className="text-slate-900 dark:text-slate-100">Notificações no App</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.pushEnabled}
            onChange={() => handleMainToggle('pushEnabled')}
            disabled={!preferences.enabled}
            className="w-4 h-4 rounded disabled:opacity-50"
          />
          <span className="text-slate-900 dark:text-slate-100">Notificações Push</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.emailEnabled}
            onChange={() => handleMainToggle('emailEnabled')}
            disabled={!preferences.enabled}
            className="w-4 h-4 rounded disabled:opacity-50"
          />
          <span className="text-slate-900 dark:text-slate-100">Notificações por Email</span>
        </label>
      </div>

      {/* Som e Vibração */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Volume2 size={18} /> Som
        </h3>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.soundEnabled}
            onChange={() => handleMainToggle('soundEnabled')}
            disabled={!preferences.enabled}
            className="w-4 h-4 rounded disabled:opacity-50"
          />
          <span className="text-slate-900 dark:text-slate-100">Som nas notificações</span>
        </label>
      </div>

      {/* Horário Silencioso */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Clock size={18} /> Horário Silencioso
        </h3>

        <p className="text-sm text-slate-600 dark:text-slate-400">
          Nenhuma notificação será enviada entre estes horários
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Início
            </label>
            <input
              type="time"
              value={preferences.silentHours.start}
              onChange={(e) => handleSilentHoursChange('start', e.target.value)}
              disabled={!preferences.enabled}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Fim
            </label>
            <input
              type="time"
              value={preferences.silentHours.end}
              onChange={(e) => handleSilentHoursChange('end', e.target.value)}
              disabled={!preferences.enabled}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Frequência Máxima */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Zap size={18} /> Frequência
        </h3>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Máximo por dia: {preferences.maxPerDay}
          </label>
          <input
            type="range"
            min="1"
            max="100"
            value={preferences.maxPerDay}
            onChange={(e) => handleMaxPerDayChange(parseInt(e.target.value))}
            disabled={!preferences.enabled}
            className="w-full disabled:opacity-50"
          />
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
            Limita o número de notificações recebidas por dia
          </p>
        </div>
      </div>

      {/* Tipos de Notificação */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Tipos de Notificação</h3>

        <div className="space-y-2">
          {Object.entries(notificationTypeLabels).map(([type, label]) => (
            <label key={type} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.types[type]}
                onChange={() => handleTypeToggle(type)}
                disabled={!preferences.enabled}
                className="w-4 h-4 rounded disabled:opacity-50"
              />
              <span className="text-slate-900 dark:text-slate-100">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2 pt-4">
        <Button
          onClick={handleSave}
          disabled={!changed || loading}
          loading={loading}
          className="flex-1"
        >
          <Save size={16} />
          Salvar Preferências
        </Button>
        <Button
          onClick={handleReset}
          variant="ghost"
          disabled={loading}
        >
          <RotateCcw size={16} />
          Resetar
        </Button>
      </div>
    </div>
  )
}

export default NotificationSettings
