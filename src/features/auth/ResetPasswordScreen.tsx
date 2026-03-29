import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight } from 'lucide-react'
import api from '../../lib/api'
import { AlertModal, type AlertTone } from '../../components/ui/AlertModal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { getFirstFormErrorMessage } from './formError'

const schema = z
  .object({
    password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
    confirm: z.string().min(1, 'Confirme sua senha.'),
  })
  .refine(d => d.password === d.confirm, {
    message: 'As senhas não coincidem.',
    path: ['confirm'],
  })

type FormData = z.infer<typeof schema>

type AlertState = {
  title: string
  message: string
  tone?: AlertTone
  confirmLabel?: string
  onConfirm?: () => void
} | null

export default function ResetPasswordScreen() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const [alert, setAlert] = useState<AlertState>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!token) {
      setAlert({
        title: 'Link inválido',
        message: 'Não encontramos um link válido para redefinir sua senha.',
        tone: 'warning',
        confirmLabel: 'Voltar ao login',
        onConfirm: () => {
          setAlert(null)
          navigate('/login', { replace: true })
        },
      })
    }
  }, [token, navigate])

  async function onSubmit(data: FormData) {
    if (!token) {
      setAlert({
        title: 'Link inválido',
        message: 'Solicite um novo link de redefinição de senha.',
        tone: 'warning',
      })
      return
    }

    try {
      await api.post('/api/auth/reset-password', { token, password: data.password })
      setAlert({
        title: 'Senha redefinida',
        message: 'Sua nova senha foi salva com sucesso.',
        tone: 'success',
        confirmLabel: 'Ir para login',
        onConfirm: () => {
          setAlert(null)
          navigate('/login', { replace: true })
        },
      })
    } catch (err: any) {
      setAlert({
        title: 'Não foi possível redefinir',
        message: err?.response?.data?.error || 'Link inválido ou expirado.',
        tone: 'error',
      })
    }
  }

  const onInvalid = () => {
    setAlert({
      title: 'Verifique os dados',
      message: getFirstFormErrorMessage(errors, 'Preencha os campos corretamente para continuar.'),
      tone: 'warning',
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f7fb] via-[#f1f2f8] to-[#ede9fe] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-violet-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">💼</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">FinanceApp</h1>
          <p className="text-slate-500 mt-1">Nova senha</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
            <Input
              label="Nova senha"
              type="password"
              placeholder="Mínimo de 6 caracteres"
              autoComplete="new-password"
              className="h-12 rounded-xl border-slate-300 bg-slate-50 text-[15px] focus:ring-violet-600"
              {...register('password')}
            />

            <Input
              label="Confirmar senha"
              type="password"
              placeholder="Digite novamente sua senha"
              autoComplete="new-password"
              className="h-12 rounded-xl border-slate-300 bg-slate-50 text-[15px] focus:ring-violet-600"
              {...register('confirm')}
            />

            <Button
              type="submit"
              fullWidth
              loading={isSubmitting}
              size="lg"
              leftIcon={!isSubmitting ? <ArrowRight size={16} /> : undefined}
              className="h-12 rounded-xl bg-gradient-to-r from-violet-700 to-purple-600 text-white"
            >
              Redefinir senha
            </Button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-slate-600">
          Lembrou sua senha?{' '}
          <Link to="/login" className="font-semibold text-violet-700 hover:underline">
            Entrar
          </Link>
        </p>
      </div>

      <AlertModal
        open={Boolean(alert)}
        title={alert?.title || ''}
        message={alert?.message || ''}
        tone={alert?.tone}
        confirmLabel={alert?.confirmLabel || 'Entendi'}
        onConfirm={alert?.onConfirm}
        onClose={() => setAlert(null)}
      />
    </div>
  )
}
