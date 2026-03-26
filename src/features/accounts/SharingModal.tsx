import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, UserPlus } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { sharingService } from '../../services/sharing'
import { toast } from '../../components/ui/Toast'
import type { BankAccount } from '../../types'

interface Props {
  account: BankAccount
  open: boolean
  onClose: () => void
}

export default function SharingModal({ account, open, onClose }: Props) {
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['sharing', account.id, 'members'],
    queryFn: () => sharingService.listMembers(account.id),
    enabled: open,
  })

  const inviteMut = useMutation({
    mutationFn: () => sharingService.invite(account.id, email, role),
    onSuccess: () => {
      toast.success('Convite enviado!')
      setEmail('')
      qc.invalidateQueries({ queryKey: ['sharing', account.id] })
    },
    onError: () => toast.error('Erro ao enviar convite.'),
  })

  const removeMut = useMutation({
    mutationFn: (userId: number) => sharingService.removeMember(account.id, userId),
    onSuccess: () => {
      toast.success('Membro removido.')
      qc.invalidateQueries({ queryKey: ['sharing', account.id] })
    },
    onError: () => toast.error('Erro ao remover membro.'),
  })

  const roleColorMap: Record<string, string> = { owner: 'indigo', editor: 'blue', viewer: 'gray' }
  const roleLabelMap: Record<string, string> = { owner: 'Proprietário', editor: 'Editor', viewer: 'Visualizador' }

  return (
    <Modal open={open} onClose={onClose} title={`Compartilhar: ${account.name}`} size="md">
      <div className="space-y-5">
        {/* Members list */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Membros</h3>
          {isLoading && <p className="text-sm text-gray-500">Carregando...</p>}
          {!isLoading && members.length === 0 && (
            <p className="text-sm text-gray-400">Nenhum membro ainda.</p>
          )}
          <ul className="space-y-2">
            {members.map((m: any) => (
              <li key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {m.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                  <p className="text-xs text-gray-500 truncate">{m.email}</p>
                </div>
                <Badge color={roleColorMap[m.role] as any}>{roleLabelMap[m.role] || m.role}</Badge>
                {m.role !== 'owner' && (
                  <button
                    onClick={() => removeMut.mutate(m.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Invite form */}
        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Convidar pessoa</h3>
          <div className="space-y-3">
            <Input
              label="Email"
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <Select
              label="Permissão"
              options={[
                { value: 'viewer', label: 'Visualizador' },
                { value: 'editor', label: 'Editor' },
              ]}
              value={role}
              onChange={e => setRole(e.target.value)}
            />
            <Button
              onClick={() => inviteMut.mutate()}
              loading={inviteMut.isPending}
              disabled={!email.trim()}
              leftIcon={<UserPlus size={14} />}
            >
              Enviar convite
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
