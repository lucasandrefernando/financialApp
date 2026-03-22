import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { emailSchema } from '@/utils/validators'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { resetPassword } from '@/services/auth'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: emailSchema,
})

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordScreen() {
  const navigate = useNavigate()
  const { success, error } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      setIsLoading(true)
      await resetPassword(data.email)
      setSent(true)
      success('Email de recuperação enviado para você!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar solicitação'
      error(msg)
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
          <h1 className="text-3xl font-bold text-white">{sent ? 'Email enviado' : 'Recuperar senha'}</h1>
          <p className="text-primary-100 mt-2">
            {sent
              ? 'Verifique seu email para recuperar o acesso'
              : 'Digite seu email para receber um link de recuperação'
            }
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 space-y-6">
          {!sent ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="seu@email.com"
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-error-500 mt-1">{errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                loading={isLoading}
                className="w-full"
              >
                Enviar link de recuperação
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="bg-success-100 dark:bg-success-900/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <span className="text-2xl">📧</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Enviamos um link para recuperar sua senha. Clique no link no email para criar uma nova senha.
              </p>
              <Button
                onClick={() => navigate('/auth/login')}
                className="w-full"
              >
                Voltar para login
              </Button>
            </div>
          )}

          <button
            onClick={() => navigate('/auth/login')}
            className="w-full flex items-center justify-center gap-2 text-sm text-primary-500 hover:underline"
          >
            <ArrowLeft size={16} />
            Voltar para login
          </button>
        </div>
      </div>

      {/* Toasts são exibidos via ToastProvider; useToast já notifica */}
    </div>
  )
}
