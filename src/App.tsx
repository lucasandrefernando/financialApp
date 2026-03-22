import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/services/supabase'
import { ToastProvider } from '@/components/ui/Toast'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import { useAuth } from '@/hooks/useAuth'

// Auth Screens
import { LoginScreen } from '@/screens/auth/LoginScreen'
import { RegisterScreen } from '@/screens/auth/RegisterScreen'
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen'

// App Screens
import { DashboardScreen } from '@/screens/dashboard/DashboardScreen'
import { TransactionListScreen } from '@/screens/transactions/TransactionListScreen'
import { BudgetListScreen } from '@/screens/budgets/BudgetListScreen'
import { GoalListScreen } from '@/screens/goals/GoalListScreen'
import { ProfileScreen } from '@/screens/profile/ProfileScreen'
import { AccountListScreen } from '@/screens/accounts/AccountListScreen'

/**
 * Componente protetor de rota
 * Redireciona para login se não autenticado
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((state) => state.session)
  const isLoading = useAuthStore((state) => state.isLoading)

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/auth/login" replace />
  }

  return <>{children}</>
}

/**
 * Componente para redirecionamento de rotas públicas
 * Se já autenticado, redireciona para o dashboard
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((state) => state.session)
  const isLoading = useAuthStore((state) => state.isLoading)

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (session) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

/**
 * Componente inicializador de autenticação
 * Recupera a sessão do localStorage e sincroniza o estado
 */
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { initAuth } = useAuth()

  useEffect(() => {
    initAuth()
  }, [initAuth])

  return <>{children}</>
}

/**
 * Componente inicializador de tema
 * Aplica o tema salvo ao carregar a aplicação
 */
function ThemeInitializer({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((state) => state.theme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  return <>{children}</>
}

/**
 * Aplicação principal
 * Configura todo o sistema de roteamento, autenticação e temas
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ThemeInitializer>
          <AuthInitializer>
            <Router>
              <Routes>
                {/* ================== AUTENTICAÇÃO ================== */}
                <Route path="/auth/login" element={<PublicRoute><LoginScreen /></PublicRoute>} />
                <Route path="/auth/register" element={<PublicRoute><RegisterScreen /></PublicRoute>} />
                <Route path="/auth/forgot-password" element={<PublicRoute><ForgotPasswordScreen /></PublicRoute>} />

                {/* ================== APLICAÇÃO PRINCIPAL ================== */}
                {/* Dashboard */}
                <Route
                  path="/"
                  element={<ProtectedRoute><DashboardScreen /></ProtectedRoute>}
                />

                {/* Transações */}
                <Route
                  path="/transactions"
                  element={<ProtectedRoute><TransactionListScreen /></ProtectedRoute>}
                />

                {/* Orçamentos */}
                <Route
                  path="/budgets"
                  element={<ProtectedRoute><BudgetListScreen /></ProtectedRoute>}
                />

                {/* Metas */}
                <Route
                  path="/goals"
                  element={<ProtectedRoute><GoalListScreen /></ProtectedRoute>}
                />

                {/* Perfil */}
                <Route
                  path="/profile"
                  element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>}
                />

                {/* Contas */}
                <Route
                  path="/profile/accounts"
                  element={<ProtectedRoute><AccountListScreen /></ProtectedRoute>}
                />

                {/* ================== ROTAS NÃO ENCONTRADAS ================== */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </AuthInitializer>
        </ThemeInitializer>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App