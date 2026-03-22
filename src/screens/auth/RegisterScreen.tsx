import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterInput } from '@/utils/validators'
import { signUp } from '@/services/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'

export function RegisterScreen() {
  const navigate = useNavigate()
  const { success, error } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterInput) => {
    try {
      setIsLoading(true)
      await signUp(data.email, data.password, data.full_name)
      success('Conta criada com sucesso! Faça login para continuar.')
      setTimeout(() => navigate('/auth/login'), 2000)
    } catch (err) {
      error(err instanceof Error ? err.message : 'Erro ao criar conta')
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
          <h1 className="text-3xl font-bold text-white">Crie sua conta</h1>
          {/* Fix #10: white/80 instead of text-primary-100 for sufficient contrast */}
          <p className="text-white/80 mt-2">Comece a controlar suas finanças hoje</p>
        </div>

        {/* Fix #8: wrap content in <main> for landmark */}
        <main>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 space-y-6">
            {/* Fix #3 & #9: use Input component which handles id/htmlFor + consistent styles */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                id="register-name"
                label="Nome Completo"
                type="text"
                placeholder="Seu nome completo"
                autoComplete="name"
                error={errors.full_name?.message}
                {...register('full_name')}
              />

              <Input
                id="register-email"
                label="Email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                id="register-password"
                label="Senha"
                type="password"
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
              />

              <Input
                id="register-confirm-password"
                label="Confirmar Senha"
                type="password"
                placeholder="Confirme sua senha"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              <Button type="submit" loading={isLoading} fullWidth>
                Criar Conta
              </Button>
            </form>

            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              Já tem conta?{' '}
              {/* Fix #2: text-primary-700 on white = 7.3:1 contrast ✓ */}
              <button
                onClick={() => navigate('/auth/login')}
                className="text-primary-700 font-medium hover:underline inline-flex items-center gap-1"
              >
                Fazer login <ArrowRight size={14} />
              </button>
            </p>
          </div>

          <p className="text-center text-xs text-white/70 mt-6">
            Ao criar uma conta, você concorda com nossos Termos de Serviço e Política de Privacidade
          </p>
        </main>
      </div>
    </div>
  )
}
