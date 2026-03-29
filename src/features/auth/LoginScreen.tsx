import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Lock, Mail, ShieldCheck, Wallet } from 'lucide-react'
import { login } from '../../services/auth'
import { useAuthStore } from '../../stores/authStore'
import { AlertModal, type AlertTone } from '../../components/ui/AlertModal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { getFirstFormErrorMessage } from './formError'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

type FormData = z.infer<typeof schema>
type AlertState = { title: string; message: string; tone?: AlertTone } | null

function normalizeBasePath(value: string | undefined) {
  if (!value || value === '/') return ''
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.replace(/\/+$/, '')
}

export default function LoginScreen() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [alert, setAlert] = useState<AlertState>(null)

  const appBasePath = normalizeBasePath(import.meta.env.VITE_APP_BASE_PATH)
  const googleLoginUrl = `${appBasePath}/api/auth/google/start`
  const heroImageSrc = `${appBasePath}/api/media/login-01`

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const user = await login(data.email, data.password)
      setUser(user)
      if (!user.cpf || !String(user.cpf).trim()) {
        navigate('/complete-profile', { replace: true })
        return
      }
      navigate(user.onboarding_completed ? '/' : '/onboarding', { replace: true })
    } catch (err: any) {
      setAlert({
        title: 'Não foi possível entrar',
        message: err?.response?.data?.error || 'Credenciais inválidas. Tente novamente.',
        tone: 'error',
      })
    }
  }

  const onInvalid = () => {
    setAlert({
      title: 'Verifique os dados',
      message: getFirstFormErrorMessage(errors, 'Preencha os campos obrigatórios para continuar.'),
      tone: 'warning',
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f7fb] via-[#f1f2f8] to-[#ede9fe] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <main className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_80px_-36px_rgba(76,29,149,0.38)] lg:min-h-[720px] lg:grid-cols-[1.04fr_0.96fr]">
        <section className="relative hidden lg:block">
          <img
            src={heroImageSrc}
            alt="Pessoa organizando controle financeiro"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2a1152]/80 via-[#4b1d95]/32 to-transparent" />

          <div className="absolute left-8 top-8 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            <ShieldCheck size={14} />
            Ambiente seguro
          </div>

          <div className="absolute inset-x-8 bottom-10">
            <h1 className="max-w-md text-4xl font-semibold leading-tight text-white">
              Entre e acompanhe suas finanças com clareza.
            </h1>
            <p className="mt-3 max-w-sm text-sm text-white/85">
              Acesso rápido, seguro e sem complicação.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center bg-white p-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-md">
            <div className="relative mb-6 overflow-hidden rounded-2xl border border-violet-100 lg:hidden">
              <img
                src={heroImageSrc}
                alt="Pessoa organizando as finanças"
                className="h-44 w-full object-cover"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-violet-900/45 via-transparent to-transparent" />
            </div>

            <div className="mb-8 text-center">
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <Wallet size={24} />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Bem-vindo</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Acesse sua conta</h2>
              <p className="mt-1 text-sm text-slate-600">Entre com Google ou use seu e-mail e senha.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
              <Input
                label="E-mail"
                type="email"
                placeholder="seuemail@exemplo.com"
                leftIcon={<Mail size={16} />}
                autoComplete="email"
                className="h-12 rounded-xl border-slate-300 bg-slate-50 text-[15px] focus:ring-violet-600"
                {...register('email')}
              />

              <Input
                label="Senha"
                type="password"
                placeholder="Digite sua senha"
                leftIcon={<Lock size={16} />}
                autoComplete="current-password"
                className="h-12 rounded-xl border-slate-300 bg-slate-50 text-[15px] focus:ring-violet-600"
                {...register('password')}
              />

              <div className="flex items-center justify-end">
                <Link to="/forgot-password" className="text-xs font-semibold text-violet-700 hover:underline">
                  Esqueci minha senha
                </Link>
              </div>

              <Button
                type="submit"
                fullWidth
                loading={isSubmitting}
                size="lg"
                leftIcon={!isSubmitting ? <ArrowRight size={16} /> : undefined}
                className="h-12 rounded-xl bg-gradient-to-r from-violet-700 to-purple-600 text-white shadow-[0_14px_30px_-20px_rgba(109,40,217,0.85)] hover:brightness-110"
              >
                Entrar
              </Button>
            </form>

            <div className="mt-6 mb-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">ou</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <a
              href={googleLoginUrl}
              className="group mb-5 inline-flex w-full items-center justify-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-white"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-violet-200 bg-white text-sm font-bold text-violet-700">
                G
              </span>
              Continuar com o Google
            </a>

            <p className="mt-6 text-center text-sm text-slate-600">
              Não tem conta?{' '}
              <Link to="/register" className="font-semibold text-violet-700 hover:underline">
                Criar conta
              </Link>
            </p>
          </div>
        </section>
      </main>

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
