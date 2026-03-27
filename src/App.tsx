import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useAuthInit } from './hooks/useAuth'
import AppLayout from './components/layout/AppLayout'
import { ToastContainer } from './components/ui/Toast'
import LoginScreen from './features/auth/LoginScreen'
import GoogleAuthCallbackScreen from './features/auth/GoogleAuthCallbackScreen'
import RegisterScreen from './features/auth/RegisterScreen'
import ForgotPasswordScreen from './features/auth/ForgotPasswordScreen'
import ResetPasswordScreen from './features/auth/ResetPasswordScreen'
import OnboardingWizard from './features/onboarding/OnboardingWizard'
import DashboardScreen from './features/dashboard/DashboardScreen'
import TransactionListScreen from './features/transactions/TransactionListScreen'
import AccountListScreen from './features/accounts/AccountListScreen'
import BudgetListScreen from './features/budgets/BudgetListScreen'
import GoalListScreen from './features/goals/GoalListScreen'
import ProfileScreen from './features/profile/ProfileScreen'

function normalizeBasePath(value: string | undefined) {
  if (!value || value === '/') return '/'
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.replace(/\/+$/, '')
}

const ROUTER_BASENAME = normalizeBasePath(import.meta.env.VITE_APP_BASE_PATH)

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (!user.onboarding_completed) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function App() {
  useAuthInit()
  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/auth/callback" element={<GoogleAuthCallbackScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/reset-password" element={<ResetPasswordScreen />} />
        <Route path="/onboarding" element={<OnboardingWizard />} />
        <Route path="/" element={<ProtectedRoute><AppLayout><DashboardScreen /></AppLayout></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><AppLayout><TransactionListScreen /></AppLayout></ProtectedRoute>} />
        <Route path="/accounts" element={<ProtectedRoute><AppLayout><AccountListScreen /></AppLayout></ProtectedRoute>} />
        <Route path="/budgets" element={<ProtectedRoute><AppLayout><BudgetListScreen /></AppLayout></ProtectedRoute>} />
        <Route path="/goals" element={<ProtectedRoute><AppLayout><GoalListScreen /></AppLayout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfileScreen /></AppLayout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
