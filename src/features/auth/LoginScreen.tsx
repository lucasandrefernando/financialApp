import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Wallet } from 'lucide-react'
import { login } from '../../services/auth'
import { useAuthStore } from '../../stores/authStore'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})
type FormData = z.infer<typeof schema>

function normalizeBasePath(value: string | undefined) {
  if (!value || value === '/') return ''
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.replace(/\/+$/, '')
}

export default function LoginScreen() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [error, setError] = useState('')
  const appBasePath = normalizeBasePath(import.meta.env.VITE_APP_BASE_PATH)
  const googleLoginUrl = `${appBasePath}/api/auth/google/start`

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const user = await login(data.email, data.password)
      setUser(user)
      navigate(user.onboarding_completed ? '/' : '/onboarding', { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Credenciais inválidas. Tente novamente.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4">
            <Wallet size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FinanceApp</h1>
          <p className="text-gray-500 text-sm mt-1">Entre na sua conta</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <a
            href={googleLoginUrl}
            className="mb-4 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white border border-gray-200 text-[11px] font-semibold text-gray-700"
              aria-hidden="true"
            >
              G
            </span>
            Continuar com Google
          </a>

          <div className="mb-4 flex items-center gap-3">
            <div className="h-px bg-gray-200 flex-1" />
            <span className="text-xs uppercase tracking-wide text-gray-400">ou</span>
            <div className="h-px bg-gray-200 flex-1" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-indigo-600 hover:underline">
                Esqueci minha senha
              </Link>
            </div>
            <Button type="submit" fullWidth loading={isSubmitting} size="lg">
              Entrar
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Não tem conta?{' '}
          <Link to="/register" className="text-indigo-600 font-medium hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
