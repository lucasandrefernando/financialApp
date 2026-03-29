import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, LogOut, Mail, UserRound } from 'lucide-react'
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

export default function ProfileScreen() {
  const navigate = useNavigate()
  const { user, setUser, logout: storeLogout } = useAuthStore()

  const [name, setName] = useState(user?.name || '')
  const [baselineName, setBaselineName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [alert, setAlert] = useState<AlertState>(null)

  useEffect(() => {
    const nextName = user?.name || ''
    setName(nextName)
    setBaselineName(nextName)
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
    onError: () => toast.error('Nao foi possivel aceitar o convite.'),
  })

  const hasChanges = useMemo(() => name.trim() !== baselineName.trim(), [name, baselineName])
  const userInitial = (user?.name?.trim().charAt(0) || 'S').toUpperCase()
  const displayName = user?.name?.trim() || 'Sem nome'
  const cpfLabel = user?.cpf?.trim() || 'Nao informado'
  const memberSince = user?.created_at
    ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(user.created_at))
    : '-'

  const handleSave = async () => {
    const cleanName = name.trim()
    if (!cleanName || cleanName.length < 3) {
      setAlert({
        title: 'Nome invalido',
        message: 'Informe seu nome completo com pelo menos 3 caracteres.',
        tone: 'warning',
      })
      return
    }

    setSaving(true)
    try {
      const { data } = await api.put('/api/auth/me', { name: cleanName })
      const updatedUser = data as User
      setUser(updatedUser)
      setName(updatedUser.name || '')
      setBaselineName(updatedUser.name || '')
      toast.success('Perfil atualizado com sucesso!')
    } catch (error: any) {
      setAlert({
        title: 'Nao foi possivel salvar',
        message: error?.response?.data?.error || 'Tente novamente em alguns instantes.',
        tone: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDiscardChanges = () => {
    setName(baselineName)
  }

  const handleLogout = async () => {
    await logout()
    storeLogout()
    navigate('/login', { replace: true })
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'EXCLUIR') {
      setAlert({
        title: 'Confirmacao incorreta',
        message: 'Digite EXCLUIR corretamente para confirmar a remocao da conta.',
        tone: 'warning',
      })
      return
    }

    setDeletingAccount(true)
    try {
      await deleteMyAccount()
      storeLogout()
      setDeleteModalOpen(false)
      toast.success('Conta excluida com sucesso.')
      navigate('/login', { replace: true })
    } catch (error: any) {
      setAlert({
        title: 'Erro ao excluir conta',
        message: error?.response?.data?.error || 'Nao foi possivel concluir a exclusao da conta.',
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
        <Card title="Dados da conta" className="border-slate-200">
          <div className="space-y-3 px-4 pb-4">
            <Input
              label="Nome completo"
              value={name}
              onChange={e => setName(e.target.value)}
              leftIcon={<UserRound size={16} />}
              autoComplete="name"
              className="h-11 rounded-xl border-slate-300 bg-slate-50"
            />
            <Input
              label="Email"
              value={user?.email || ''}
              disabled
              leftIcon={<Mail size={16} />}
              className="h-11 rounded-xl border-slate-200 bg-slate-100 text-slate-500"
            />
            <Input
              label="CPF"
              value={cpfLabel}
              disabled
              className="h-11 rounded-xl border-slate-200 bg-slate-100 text-slate-500"
            />
          </div>
        </Card>

        <Card title="Acoes de conta" className="border-slate-200">
          <div className="space-y-3 px-4 pb-4">
            <Button
              fullWidth
              loading={saving}
              disabled={!hasChanges}
              onClick={handleSave}
              className="h-11 rounded-xl"
            >
              Salvar alteracoes
            </Button>
            <Button
              fullWidth
              variant="outline"
              disabled={!hasChanges}
              onClick={handleDiscardChanges}
              className="h-11 rounded-xl"
            >
              Descartar alteracoes
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

      <Card title="Zona de perigo" className="border-rose-100">
        <div className="space-y-3 px-4 pb-4">
          <p className="text-sm text-slate-600">
            Ao excluir sua conta, seus dados deixarao de aparecer no sistema e a acao nao podera ser desfeita.
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

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirmar exclusao da conta"
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
              Esta acao e permanente. Para confirmar, digite <strong>EXCLUIR</strong>.
            </p>
          </div>
          <Input
            label="Confirmacao"
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
