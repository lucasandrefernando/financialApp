import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'
import { PlusCircle } from 'lucide-react'
import { AccountCard } from '@/components/accounts/AccountCard'
import { AccountForm } from '@/components/accounts/AccountForm'
import { EmptyState, SkeletonList } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { useAccounts, useDeleteAccount, accountKeys } from '@/hooks/api/useAccounts'
import type { Account } from '@/types/database'

export function AccountListScreen() {
  const qc = useQueryClient()
  const { success, error: showError } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

  const { data: accounts = [], isLoading, error } = useAccounts()

  const { mutate: deleteAccount, isPending: isDeleting } = useDeleteAccount()

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setShowForm(true)
  }

  const handleDelete = (account: Account) => {
    deleteAccount(account.id, {
      onSuccess: () => {
        success('Conta excluída com sucesso!')
      },
      onError: () => showError('Não foi possível excluir a conta'),
    })
  }

  const handleCloseForm = () => {
    setEditingAccount(null)
    setShowForm(false)
    qc.invalidateQueries({ queryKey: accountKeys.all })
  }

  const handleAddNew = () => {
    setEditingAccount(null)
    setShowForm(true)
  }

  return (
    <AppLayout title="Minhas Contas">
      {showForm && (
        <AccountForm
          account={editingAccount}
          onClose={handleCloseForm}
        />
      )}

      {/* Fix #21: consistent padding pattern p-4 lg:p-6 */}
      <div className="p-4 lg:p-6 max-w-screen-xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Minhas Contas</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Gerencie suas contas bancárias, carteiras e cartões.</p>
          </div>
          <Button onClick={handleAddNew}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Adicionar Conta
          </Button>
        </div>

        {/* Fix #7 (debug logs removed) + Fix #19: use SkeletonList instead of plain text */}
        {isLoading && <SkeletonList count={4} />}

        {error && (
          <p className="text-sm text-error-500 bg-error-50 px-4 py-3 rounded-[10px]">
            Erro ao carregar contas: {error.message}
          </p>
        )}

        {!isLoading && !error && accounts && accounts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} onEdit={handleEdit} onDelete={handleDelete} isDeleting={isDeleting} />
            ))}
          </div>
        )}

        {!isLoading && !error && (!accounts || accounts.length === 0) && (
          <EmptyState
            icon={<PlusCircle size={48} />}
            title="Nenhuma conta encontrada"
            description="Comece adicionando sua primeira conta para organizar suas finanças."
            actionLabel="Adicionar Primeira Conta"
            onAction={handleAddNew}
          />
        )}
      </div>
    </AppLayout>
  )
}
