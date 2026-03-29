import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { deleteMyAccount, logout } from '../../services/auth'
import { sharingService } from '../../services/sharing'
import api from '../../lib/api'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { AlertModal, type AlertTone } from '../../components/ui/AlertModal'
import { toast } from '../../components/ui/Toast'
import type { User } from '../../types'

type AlertState = { title: string; message: string; tone?: AlertTone } | null

type ProfileForm = {
  name: string
  cpf: string
  currency: string
  locale: string
  timezone: string
}

const LOCALES = ['pt-BR', 'en-US']
const CURRENCIES = ['BRL', 'USD', 'EUR']
const TIMEZONES = ['America/Sao_Paulo', 'America/Fortaleza', 'America/Manaus', 'America/Belem', 'UTC']

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function isValidCpf(value: string) {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11) return false
  if (/^(\d)\1+$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i += 1) sum += Number(cpf[i]) * (10 - i)
  let check = (sum * 10) % 11
  if (check === 10) check = 0
  if (check !== Number(cpf[9])) return false

  sum = 0
  for (let i = 0; i < 10; i += 1) sum += Number(cpf[i]) * (11 - i)
  check = (sum * 10) % 11
  if (check === 10) check = 0
  return check === Number(cpf[10])
}

function toProfileForm(user: User | null): ProfileForm {
  return {
    name: user?.name || '',
    cpf: user?.cpf || '',
    currency: user?.currency || 'BRL',
    locale: user?.locale || 'pt-BR',
    timezone: user?.timezone || 'America/Sao_Paulo',
  }
}

export default function ProfileScreen() {
  const navigate = useNavigate()
  const { user, setUser, logout: storeLogout } = useAuthStore()

  const [form, setForm] = useState<ProfileForm>(() => toProfileForm(user))
  const [baselineForm, setBaselineForm] = useState<ProfileForm>(() => toProfileForm(user))
  const [saving, setSaving] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [alert, setAlert] = useState<AlertState>(null)

  useEffect(() => {
    const next = toProfileForm(user)
    setForm(next)
    setBaselineForm(next)
  }, [user])

  const { data: invitations = [], refetch: refetchInvitations } = useQuery({
    queryKey: ['invitations'],
    queryFn: sharingService.listInvitations,
  })

  const acceptMut = useMutation({
    mutationFn: (token: string) => sharingService.acceptInvitation(token),
    onSuccess: () => {
      toast.success('Convite aceito com sucesso!')
      refetchInvitations()
    },
    onError: () => toast.error('Não foi possível aceitar o convite.'),
  })

  const hasChanges = useMemo(() => {
    return (
      form.name !== baselineForm.name ||
      form.cpf !== baselineForm.cpf ||
      form.currency !== baselineForm.currency ||
      form.locale !== baselineForm.locale ||
      form.timezone !== baselineForm.timezone
    )
  }, [form, baselineForm])

  const userInitial = (user?.name?.trim().charAt(0) || 'S').toUpperCase()
  const displayName = user?.name?.trim() || 'Sem nome'
  const memberSince = user?.created_at
    ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(user.created_at))
    : '-'

  const handleFormChange = (field: keyof ProfileForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    const cleanName = form.name.trim()
    if (!cleanName || cleanName.length < 3) {
      setAlert({
        title: 'Nome inválido',
        message: 'Informe seu nome completo com pelo menos 3 caracteres.',
        tone: 'warning',
      })
      return
    }

    if (!isValidCpf(form.cpf)) {
      setAlert({
        title: 'CPF inválido',
        message: 'Revise o CPF informado para continuar.',
        tone: 'warning',
      })
      return
    }

    setSaving(true)
    try {
      const { data } = await api.put('/api/auth/me', {
        name: cleanName,
        cpf: form.cpf,
        currency: form.currency,
        locale: form.locale,
        timezone: form.timezone,
      })
      const updatedUser = data as User
      setUser(updatedUser)
      const next = toProfileForm(updatedUser)
      setForm(next)
      setBaselineForm(next)
      toast.success('Perfil atualizado com sucesso!')
    } catch (error: any) {
      setAlert({
        title: 'Não foi possível salvar',
        message: error?.response?.data?.error || 'Tente novamente em alguns instantes.',
        tone: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDiscardChanges = () => {
    setForm(baselineForm)
  }

  const handleLogout = async () => {
    await logout()
    storeLogout()
    navigate('/login', { replace: true })
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'EXCLUIR') {
      setAlert({
        title: 'Confirmação incorreta',
        message: 'Digite EXCLUIR corretamente para confirmar a remoção da conta.',
        tone: 'warning',
      })
      return
    }

    setDeletingAccount(true)
    try {
      await deleteMyAccount()
      storeLogout()
      setDeleteModalOpen(false)
      toast.success('Conta excluída com sucesso.')
      navigate('/login', { replace: true })
    } catch (error: any) {
      setAlert({
        title: 'Erro ao excluir conta',
        message: error?.response?.data?.error || 'Não foi possível concluir a exclusão da conta.',
        tone: 'error',
      })
    } finally {
      setDeletingAccount(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-3 py-4 sm:px-4 sm:py-6">
      <Card className="overflow-hidden border-violet-100">
        <div className="relative bg-gradient-to-r from-violet-700 via-purple-700 to-violet-600 p-5 text-white sm:p-6">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/10 blur-sm" />
          <div className="absolute -left-8 bottom-0 h-20 w-20 rounded-full bg-white/10 blur-sm" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold">
                {userInitial}
              </div>
              <div>
                <p className="text-sm text-violet-100">Minha conta</p>
                <h2 className="text-2xl font-bold leading-tight">{displayName}</h2>
                <p className="text-sm text-violet-100">{user?.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Badge color="purple" className="bg-white/20 text-white">
                Membro desde {memberSince}
              </Badge>
              {user?.email_verified && (
                <Badge color="green" className="bg-emerald-100 text-emerald-700">
                  Email verificado
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Dados pessoais" className="border-slate-200">
          <div className="space-y-3 px-4 pb-4">
            <Input
              label="Nome completo"
              value={form.name}
              onChange={e => handleFormChange('name', e.target.value)}
              leftIcon={<UserRound size={16} />}
              autoComplete="name"
              className="h-11 rounded-xl border-slate-300 bg-slate-50"
            />
            <Input
              label="CPF"
              value={form.cpf}
              onChange={e => handleFormChange('cpf', formatCpf(e.target.value))}
              inputMode="numeric"
              className="h-11 rounded-xl border-slate-300 bg-slate-50"
            />
            <Input
              label="Email"
              value={user?.email || ''}
              disabled
              leftIcon={<Mail size={16} />}
              className="h-11 rounded-xl border-slate-200 bg-slate-100 text-slate-500"
            />
          </div>
        </Card>

        <Card title="Preferências" className="border-slate-200">
          <div className="space-y-3 px-4 pb-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Moeda</label>
              <select
                value={form.currency}
                onChange={e => handleFormChange('currency', e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition-all focus:ring-2 focus:ring-violet-500"
              >
                {CURRENCIES.map(currency => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Idioma</label>
              <select
                value={form.locale}
                onChange={e => handleFormChange('locale', e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition-all focus:ring-2 focus:ring-violet-500"
              >
                {LOCALES.map(locale => (
                  <option key={locale} value={locale}>
                    {locale}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Fuso horário</label>
              <select
                value={form.timezone}
                onChange={e => handleFormChange('timezone', e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-800 outline-none transition-all focus:ring-2 focus:ring-violet-500"
              >
                {[...new Set([...TIMEZONES, form.timezone])].map(timezone => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2">
              <div className="flex items-center gap-2 text-violet-700">
                <ShieldCheck size={14} />
                <p className="text-xs font-medium">Seus dados são protegidos e usados apenas para sua experiência no app.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {Array.isArray(invitations) && invitations.length > 0 && (
        <Card title="Convites pendentes" className="border-violet-100">
          <div className="space-y-3 px-4 pb-4">
            {invitations.map((inv: any) => (
              <div key={inv.token || inv.id} className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50 p-3">
                <UserRound size={16} className="mt-0.5 flex-shrink-0 text-violet-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{inv.account_name || 'Conta compartilhada'}</p>
                  <p className="text-xs text-slate-500">De: {inv.invited_by || inv.from_name || 'Convite recebido'}</p>
                  <Badge color="purple" className="mt-1">
                    {inv.role || 'viewer'}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  onClick={() => acceptMut.mutate(inv.token)}
                  loading={acceptMut.isPending}
                  className="rounded-lg"
                  leftIcon={<Check size={14} />}
                >
                  Aceitar
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Ações de conta" className="border-slate-200">
          <div className="space-y-3 px-4 pb-4">
            <Button
              fullWidth
              loading={saving}
              disabled={!hasChanges}
              onClick={handleSave}
              className="h-11 rounded-xl"
            >
              Salvar alterações
            </Button>
            <Button
              fullWidth
              variant="outline"
              disabled={!hasChanges}
              onClick={handleDiscardChanges}
              className="h-11 rounded-xl"
            >
              Descartar alterações
            </Button>
            <Button
              fullWidth
              variant="danger"
              onClick={handleLogout}
              leftIcon={<LogOut size={16} />}
              className="h-11 rounded-xl"
            >
              Sair da conta
            </Button>
          </div>
        </Card>

        <Card title="Zona de perigo" className="border-rose-100">
          <div className="space-y-3 px-4 pb-4">
            <p className="text-sm text-slate-600">
              Ao excluir sua conta, seus dados deixarão de aparecer no sistema e a ação não poderá ser desfeita.
            </p>
            <Button
              fullWidth
              variant="danger"
              onClick={() => {
                setDeleteConfirmText('')
                setDeleteModalOpen(true)
              }}
              leftIcon={<AlertTriangle size={16} />}
              className="h-11 rounded-xl"
            >
              Excluir minha conta
            </Button>
          </div>
        </Card>
      </div>

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirmar exclusão da conta"
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button fullWidth variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button fullWidth variant="danger" loading={deletingAccount} onClick={handleDeleteAccount}>
              Excluir conta
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <p className="text-sm font-medium text-rose-700">
              Esta ação é permanente. Para confirmar, digite <strong>EXCLUIR</strong>.
            </p>
          </div>
          <Input
            label="Confirmação"
            value={deleteConfirmText}
            onChange={e => setDeleteConfirmText(e.target.value)}
            placeholder="Digite EXCLUIR"
            className="h-11 rounded-xl border-slate-300 bg-slate-50"
          />
        </div>
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
