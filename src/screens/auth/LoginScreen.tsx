import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/utils/validators'
import { useAuthStore } from '@/stores/authStore'
import { signIn } from '@/services/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useState } from 'react'

export function LoginScreen() {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const { error } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    try {
      setIsLoading(true)
      const { user } = await signIn(data.email, data.password)
      setUser(user)
      navigate('/')
    } catch (err) {
      error(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-400 to-secondary-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-lg mb-4">
            <span className="text-2xl font-bold text-primary-500">💰</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Financial App</h1>
          {/* Fix #10: white text instead of text-primary-100 for sufficient contrast */}
          <p className="text-white/80 mt-2">Controle suas finanças com facilidade</p>
        </div>

        {/* Fix #8: wrap content in <main> for landmark */}
        <main>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 space-y-6">
            {/* Fix #3 & #9: use Input component which handles id/htmlFor + consistent styles */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                id="login-email"
                label="Email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                id="login-password"
                label="Senha"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                error={errors.password?.message}
                {...register('password')}
              />

              <Button type="submit" loading={isLoading} fullWidth>
                Entrar
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">Ou</span>
              </div>
            </div>

            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              Não tem conta?{' '}
              {/* Fix #2: text-primary-700 on white = 7.3:1 contrast ✓ */}
              <button
                onClick={() => navigate('/auth/register')}
                className="text-primary-700 font-medium hover:underline inline-flex items-center gap-1"
              >
                Criar conta <ArrowRight size={14} />
              </button>
            </p>

            <button
              onClick={() => navigate('/auth/forgot-password')}
              className="w-full text-sm text-primary-700 hover:underline"
            >
              Esqueceu sua senha?
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
