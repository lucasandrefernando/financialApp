import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { LogOut, User, Check } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { logout } from '../../services/auth'
import { sharingService } from '../../services/sharing'
import api from '../../lib/api'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { toast } from '../../components/ui/Toast'

export default function ProfileScreen() {
  const navigate = useNavigate()
  const { user, setUser, logout: storeLogout } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => { setName(user?.name || '') }, [user])

  const { data: invitations = [], refetch: refetchInvitations } = useQuery({
    queryKey: ['invitations'],
    queryFn: sharingService.listInvitations,
  })

  const acceptMut = useMutation({
    mutationFn: (token: string) => sharingService.acceptInvitation(token),
    onSuccess: () => { toast.success('Convite aceito!'); refetchInvitations() },
    onError: () => toast.error('Erro ao aceitar convite.'),
  })

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Nome é obrigatório'); return }
    setSaving(true)
    try {
      const { data } = await api.put('/api/auth/me', { name })
      setUser(data)
      setEditing(false)
      toast.success('Perfil atualizado!')
    } catch {
      toast.error('Erro ao atualizar perfil.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    storeLogout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Perfil</h2>

      {/* Avatar + basic info */}
      <Card>
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              <span className="text-3xl font-bold text-indigo-600">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
            )}
          </div>
          {!editing ? (
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <button
                onClick={() => setEditing(true)}
                className="mt-3 text-sm text-indigo-600 hover:underline font-medium"
              >
                Editar perfil
              </button>
            </div>
          ) : (
            <div className="w-full space-y-3">
              <Input
                label="Nome"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-3">
                <Button variant="outline" fullWidth onClick={() => { setEditing(false); setName(user?.name || '') }}>
                  Cancelar
                </Button>
                <Button fullWidth loading={saving} onClick={handleSave}>Salvar</Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Account info */}
      <Card title="Informações da conta">
        <div className="px-4 pb-4 space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-600">Email</span>
            <span className="text-sm font-medium text-gray-900">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-600">Moeda</span>
            <span className="text-sm font-medium text-gray-900">{user?.currency || 'BRL'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-600">Fuso horário</span>
            <span className="text-sm font-medium text-gray-900 text-right">{user?.timezone || 'America/Sao_Paulo'}</span>
          </div>
        </div>
      </Card>

      {/* Pending invitations */}
      {Array.isArray(invitations) && invitations.length > 0 && (
        <Card title="Convites pendentes">
          <div className="px-4 pb-4 space-y-3">
            {invitations.map((inv: any) => (
              <div key={inv.token || inv.id} className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <User size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {inv.account_name || 'Conta compartilhada'}
                  </p>
                  <p className="text-xs text-gray-500">De: {inv.invited_by || inv.from_name || 'Alguém'}</p>
                  <Badge color="indigo" className="mt-1">{inv.role || 'viewer'}</Badge>
                </div>
                <button
                  onClick={() => acceptMut.mutate(inv.token)}
                  disabled={acceptMut.isPending}
                  className="text-green-500 hover:text-green-700 transition-colors p-1"
                  title="Aceitar"
                >
                  <Check size={18} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Logout */}
      <Button
        variant="danger"
        fullWidth
        onClick={handleLogout}
        leftIcon={<LogOut size={16} />}
      >
        Sair da conta
      </Button>
    </div>
  )
}
