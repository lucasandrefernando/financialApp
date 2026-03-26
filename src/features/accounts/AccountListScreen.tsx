import { useState } from 'react'
import { Plus, Edit2, Trash2, Share2, CreditCard } from 'lucide-react'
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from '../../hooks/api/useAccounts'
import { formatCurrency } from '../../utils/formatters'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { toast } from '../../components/ui/Toast'
import SharingModal from './SharingModal'
import { cn } from '../../lib/utils'
import type { BankAccount } from '../../types'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899']
const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Conta Corrente' },
  { value: 'savings', label: 'Poupança' },
  { value: 'investment', label: 'Investimentos' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'digital_wallet', label: 'Carteira Digital' },
]
const TYPE_LABELS: Record<string, string> = {
  checking: 'Corrente', savings: 'Poupança', investment: 'Investimentos', cash: 'Dinheiro', digital_wallet: 'Digital'
}
const ROLE_LABELS: Record<string, string> = { owner: 'Proprietário', editor: 'Editor', viewer: 'Visualizador' }
const ROLE_COLORS: Record<string, string> = { owner: 'indigo', editor: 'blue', viewer: 'gray' }

interface AccountFormData {
  name: string
  type: string
  bank_name: string
  initial_balance: string
  color: string
  include_in_total: boolean
}

const defaultForm: AccountFormData = { name: '', type: 'checking', bank_name: '', initial_balance: '', color: COLORS[0], include_in_total: true }

export default function AccountListScreen() {
  const { data: accounts = [], isLoading } = useAccounts()
  const createAcc = useCreateAccount()
  const updateAcc = useUpdateAccount()
  const deleteAcc = useDeleteAccount()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<BankAccount | null>(null)
  const [form, setForm] = useState<AccountFormData>(defaultForm)
  const [sharingAccount, setSharingAccount] = useState<BankAccount | null>(null)

  const openCreate = () => { setEditing(null); setForm(defaultForm); setModalOpen(true) }
  const openEdit = (acc: BankAccount) => {
    setEditing(acc)
    setForm({ name: acc.name, type: acc.type, bank_name: acc.bank_name || '', initial_balance: String(acc.initial_balance), color: acc.color, include_in_total: acc.include_in_total })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return }
    const payload = { name: form.name, type: form.type, bank_name: form.bank_name || undefined, initial_balance: parseFloat(form.initial_balance) || 0, color: form.color, icon: 'wallet', include_in_total: form.include_in_total }
    try {
      if (editing) {
        await updateAcc.mutateAsync({ id: editing.id, ...payload })
        toast.success('Conta atualizada!')
      } else {
        await createAcc.mutateAsync(payload)
        toast.success('Conta criada!')
      }
      setModalOpen(false)
    } catch {
      toast.error('Erro ao salvar conta.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir esta conta?')) return
    try {
      await deleteAcc.mutateAsync(id)
      toast.success('Conta excluída.')
    } catch {
      toast.error('Erro ao excluir conta.')
    }
  }

  const totalBalance = accounts
    .filter((a: BankAccount) => a.include_in_total)
    .reduce((sum: number, a: BankAccount) => sum + (a.current_balance || 0), 0)

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Contas</h2>
          <p className="text-sm text-gray-500">Total: {formatCurrency(totalBalance)}</p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus size={16} />}>Nova conta</Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse border border-gray-100">
              <div className="h-5 w-40 bg-gray-200 rounded mb-2" />
              <div className="h-8 w-28 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && accounts.length === 0 && (
        <div className="text-center py-12">
          <CreditCard size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma conta cadastrada</p>
          <p className="text-gray-400 text-sm mt-1">Adicione uma conta para começar</p>
        </div>
      )}

      {accounts.map((acc: BankAccount) => (
        <Card key={acc.id}>
          <div className="flex items-stretch">
            {/* Color bar */}
            <div className="w-1.5 rounded-l-xl flex-shrink-0" style={{ backgroundColor: acc.color }} />
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-gray-900">{acc.name}</h3>
                    <Badge color="gray">{TYPE_LABELS[acc.type] || acc.type}</Badge>
                    {acc.role && acc.role !== 'owner' && (
                      <Badge color={ROLE_COLORS[acc.role] as any}>{ROLE_LABELS[acc.role]}</Badge>
                    )}
                  </div>
                  {acc.bank_name && <p className="text-xs text-gray-500 mt-0.5">{acc.bank_name}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(acc)} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors" title="Editar">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => setSharingAccount(acc)} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors" title="Compartilhar">
                    <Share2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(acc.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Excluir">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className={cn('text-2xl font-bold mt-3 tabular-nums', acc.current_balance < 0 ? 'text-red-600' : 'text-gray-900')}>
                {formatCurrency(acc.current_balance || 0)}
              </p>
              {!acc.include_in_total && (
                <p className="text-xs text-gray-400 mt-1">Não incluída no total</p>
              )}
            </div>
          </div>
        </Card>
      ))}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar conta' : 'Nova conta'}
        footer={
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button fullWidth loading={createAcc.isPending || updateAcc.isPending} onClick={handleSave}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Nome" placeholder="Ex: Nubank" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipo" options={ACCOUNT_TYPES} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
            <Input label="Banco (opcional)" placeholder="Ex: Nubank" value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} />
          </div>
          <Input label="Saldo inicial" type="number" step="0.01" value={form.initial_balance} onChange={e => setForm(f => ({ ...f, initial_balance: e.target.value }))} />
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
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <label className="text-sm font-medium text-gray-700">Incluir no total</label>
            <button type="button" onClick={() => setForm(f => ({ ...f, include_in_total: !f.include_in_total }))}
              className={cn('w-10 h-6 rounded-full transition-colors relative', form.include_in_total ? 'bg-indigo-600' : 'bg-gray-300')}
            >
              <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', form.include_in_total ? 'translate-x-4 left-0.5' : 'left-0.5')} />
            </button>
          </div>
        </div>
      </Modal>

      {/* Sharing Modal */}
      {sharingAccount && (
        <SharingModal account={sharingAccount} open={!!sharingAccount} onClose={() => setSharingAccount(null)} />
      )}
    </div>
  )
}
