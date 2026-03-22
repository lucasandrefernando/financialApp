import { Link } from 'react-router-dom'
import { ChevronRight, LogOut, Moon, Sun, Bell, Lock, CreditCard, Tag, Landmark, Download } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/stores/appStore'

export function ProfileScreen() {
  const { profile, logout } = useAuth()
  const { theme, setTheme } = useAppStore()

  const handleLogout = async () => {
    await logout()
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const sections = [
    {
      title: 'Financeiro',
      items: [
        { icon: Landmark, label: 'Minhas Contas', to: '/profile/accounts', implemented: true },
        // Fix #5: mark unimplemented routes — disabled until routes are added
        { icon: CreditCard, label: 'Cartões de Crédito', to: '/profile/cards', implemented: false },
        { icon: Tag, label: 'Categorias', to: '/profile/categories', implemented: false },
      ],
    },
    {
      title: 'Configurações',
      items: [
        { icon: Bell, label: 'Notificações', to: '/notifications', implemented: false },
        { icon: Lock, label: 'Segurança', to: '/profile/security', implemented: false },
      ],
    },
    {
      title: 'Dados',
      items: [
        { icon: Download, label: 'Exportar dados', to: '/profile/export', implemented: false },
      ],
    },
  ]

  return (
    <AppLayout title="Perfil">
      <div className="p-4 lg:p-6 max-w-screen-md mx-auto space-y-6">

        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center text-primary-600 text-xl font-bold flex-shrink-0">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={profile.full_name ?? ''} className="h-full w-full object-cover" />
              : (profile?.full_name ?? 'U').charAt(0).toUpperCase()
            }
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{profile?.full_name ?? 'Usuário'}</p>
            {/* Fix #5: profile/edit is not implemented, disable until it is */}
            <span className="text-sm text-slate-400 cursor-not-allowed" title="Em breve">Editar perfil</span>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{section.title}</p>
            <div className="bg-white dark:bg-slate-800 rounded-[16px] border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
              {section.items.map(({ icon: Icon, label, to, implemented }) =>
                implemented ? (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-3 px-4 h-12 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors first:rounded-t-[16px] last:rounded-b-[16px]"
                  >
                    <Icon size={18} className="text-slate-400 flex-shrink-0" />
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{label}</span>
                    <ChevronRight size={16} className="text-slate-300" />
                  </Link>
                ) : (
                  /* Fix #5: render as non-navigable item with "Em breve" badge */
                  <div
                    key={to}
                    className="flex items-center gap-3 px-4 h-12 cursor-not-allowed opacity-50 first:rounded-t-[16px] last:rounded-b-[16px]"
                    title="Em breve"
                  >
                    <Icon size={18} className="text-slate-400 flex-shrink-0" />
                    <span className="flex-1 text-sm text-slate-400">{label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-400 font-medium">Em breve</span>
                  </div>
                )
              )}
            </div>
          </div>
        ))}

        <div className="bg-white dark:bg-slate-800 rounded-[16px] border border-slate-100 dark:border-slate-700">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 h-12 w-full hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors rounded-[16px]"
          >
            {theme === 'dark' ? <Sun size={18} className="text-slate-400" /> : <Moon size={18} className="text-slate-400" />}
            <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 text-left">
              {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            </span>
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full h-12 rounded-[16px] text-error-500 font-medium text-sm hover:bg-error-100 dark:hover:bg-error-500/10 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut size={18} />
          Sair da conta
        </button>

        <p className="text-center text-xs text-slate-400">v1.0.0</p>
      </div>
    </AppLayout>
  )
}
