import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react'
import api from '../../lib/api'
import { AlertModal, type AlertTone } from '../../components/ui/AlertModal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { getFirstFormErrorMessage } from './formError'

const schema = z.object({
  email: z.string().email('E-mail inválido.'),
})

type FormData = z.infer<typeof schema>
type AlertState = { title: string; message: string; tone?: AlertTone } | null

export default function ForgotPasswordScreen() {
  const [alert, setAlert] = useState<AlertState>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    try {
      await api.post('/api/auth/forgot-password', data)
      setAlert({
        title: 'E-mail enviado',
        message: 'Se o e-mail informado estiver cadastrado, você receberá um link para redefinir sua senha.',
        tone: 'success',
      })
    } catch {
      setAlert({
        title: 'Não foi possível enviar',
        message: 'Ocorreu um erro ao enviar o e-mail. Tente novamente.',
        tone: 'error',
      })
    }
  }

  const onInvalid = () => {
    setAlert({
      title: 'Verifique os dados',
      message: getFirstFormErrorMessage(errors, 'Informe um e-mail válido para continuar.'),
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
          <p className="text-slate-500 mt-1">Recuperar senha</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-slate-600 mb-6">
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </p>

          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seuemail@exemplo.com"
              leftIcon={<Mail size={16} />}
              className="h-12 rounded-xl border-slate-300 bg-slate-50 text-[15px] focus:ring-violet-600"
              {...register('email')}
            />

            <Button
              type="submit"
              fullWidth
              loading={isSubmitting}
              size="lg"
              leftIcon={!isSubmitting ? <ArrowRight size={16} /> : undefined}
              className="h-12 rounded-xl bg-gradient-to-r from-violet-700 to-purple-600 text-white"
            >
              Enviar link de recuperação
            </Button>
          </form>
        </div>

        <p className="text-center mt-6">
          <Link to="/login" className="text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Voltar para o login
          </Link>
        </p>
      </div>

      <AlertModal
        open={Boolean(alert)}
        title={alert?.title || ''}
        message={alert?.message || ''}
        tone={alert?.tone}
        onClose={() => setAlert(null)}
      />
    </div>
  )
}
