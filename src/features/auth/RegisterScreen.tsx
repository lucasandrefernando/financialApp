import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, CreditCard, Mail, ShieldCheck, UserRound, Wallet } from 'lucide-react'
import { register as registerUser } from '../../services/auth'
import { AlertModal, type AlertTone } from '../../components/ui/AlertModal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { getFirstFormErrorMessage } from './formError'

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function isValidCpf(value: string) {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11) return false
  if (/^(\d)\1+$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i += 1) sum += Number(cpf[i]) * (10 - i)
  let check = (sum * 10) % 11
  if (check === 10) check = 0
  if (check !== Number(cpf[9])) return false

  sum = 0
  for (let i = 0; i < 10; i += 1) sum += Number(cpf[i]) * (11 - i)
  check = (sum * 10) % 11
  if (check === 10) check = 0
  return check === Number(cpf[10])
}

const schema = z.object({
  name: z.string().min(3, 'Informe seu nome completo.'),
  cpf: z
    .string()
    .min(11, 'Informe um CPF válido.')
    .refine(isValidCpf, 'CPF inválido.'),
  email: z.string().email('E-mail inválido.'),
})

type FormData = z.infer<typeof schema>

type AlertState = {
  title: string
  message: string
  tone?: AlertTone
  confirmLabel?: string
  onConfirm?: () => void
} | null

export default function RegisterScreen() {
  const navigate = useNavigate()
  const [alert, setAlert] = useState<AlertState>(null)
  const heroImageSrc = `${import.meta.env.BASE_URL}img/login-02.jpg`

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const response = await registerUser(data.name, data.cpf, data.email)
      setAlert({
        title: 'Cadastro iniciado',
        message: response.message || 'Confira seu e-mail para confirmar a conta e criar sua senha.',
        tone: 'success',
        confirmLabel: 'Ir para login',
        onConfirm: () => {
          setAlert(null)
          navigate('/login', { replace: true })
        },
      })
    } catch (err: any) {
      setAlert({
        title: 'Não foi possível continuar',
        message: err?.response?.data?.error || 'Tente novamente em alguns instantes.',
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
            alt="Pessoa analisando o planejamento financeiro"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2a1152]/80 via-[#4b1d95]/32 to-transparent" />

          <div className="absolute left-8 top-8 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            <ShieldCheck size={14} />
            Cadastro verificado
          </div>

          <div className="absolute inset-x-8 bottom-10">
            <h1 className="max-w-md text-4xl font-semibold leading-tight text-white">
              Crie sua conta e comece com segurança.
            </h1>
            <p className="mt-3 max-w-sm text-sm text-white/85">
              Depois de confirmar seu e-mail, você define sua senha e acessa o app normalmente.
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
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Cadastro</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Crie sua conta</h2>
              <p className="mt-1 text-sm text-slate-600">Informe seus dados para receber o link de verificação.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
              <Input
                label="Nome completo"
                placeholder="Seu nome completo"
                leftIcon={<UserRound size={16} />}
                autoComplete="name"
                className="h-12 rounded-xl border-slate-300 bg-slate-50 text-[15px] focus:ring-violet-600"
                {...register('name')}
              />

              <Input
                label="CPF"
                placeholder="000.000.000-00"
                leftIcon={<CreditCard size={16} />}
                inputMode="numeric"
                className="h-12 rounded-xl border-slate-300 bg-slate-50 text-[15px] focus:ring-violet-600"
                {...register('cpf')}
                onChange={(e) => setValue('cpf', e.target.value, { shouldValidate: true })}
              />

              <Input
                label="E-mail"
                type="email"
                placeholder="seuemail@exemplo.com"
                leftIcon={<Mail size={16} />}
                autoComplete="email"
                className="h-12 rounded-xl border-slate-300 bg-slate-50 text-[15px] focus:ring-violet-600"
                {...register('email')}
              />

              <Button
                type="submit"
                fullWidth
                loading={isSubmitting}
                size="lg"
                leftIcon={!isSubmitting ? <ArrowRight size={16} /> : undefined}
                className="h-12 rounded-xl bg-gradient-to-r from-violet-700 to-purple-600 text-white shadow-[0_14px_30px_-20px_rgba(109,40,217,0.85)] hover:brightness-110"
              >
                Continuar
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Já tem conta?{' '}
              <Link to="/login" className="font-semibold text-violet-700 hover:underline">
                Entrar
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
        confirmLabel={alert?.confirmLabel || 'Entendi'}
        onConfirm={alert?.onConfirm}
        onClose={() => setAlert(null)}
      />
    </div>
  )
}
