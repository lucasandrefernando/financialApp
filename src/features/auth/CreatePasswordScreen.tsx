import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Lock, ShieldCheck } from 'lucide-react'
import { createPassword } from '../../services/auth'
import { AlertModal, type AlertTone } from '../../components/ui/AlertModal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { getFirstFormErrorMessage } from './formError'
import { BrandWordmark } from '../../components/brand/Brand'
import { resolveAppBasePath, toBasePrefix } from '../../lib/basePath'

const schema = z
  .object({
    password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirme sua senha.'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

type AlertState = {
  title: string
  message: string
  tone?: AlertTone
  confirmLabel?: string
  onConfirm?: () => void
} | null

export default function CreatePasswordScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const status = searchParams.get('status') || ''
  const appBasePath = resolveAppBasePath(import.meta.env.VITE_APP_BASE_PATH)
  const basePrefix = toBasePrefix(appBasePath)
  const heroImageSrc = `${basePrefix}/api/auth/media/login-03`

  const [alert, setAlert] = useState<AlertState>(null)

  const initialStatusMessage = useMemo(() => {
    if (status === 'verified') return 'E-mail confirmado com sucesso. Defina sua senha para concluir.'
    if (status === 'token_invalid') return 'Este link de confirmação é inválido ou expirou.'
    if (status === 'token_missing') return 'Não encontramos o token de confirmação.'
    if (status === 'unexpected_error') return 'Ocorreu um erro ao validar sua confirmação.'
    return ''
  }, [status])

  const initialStatusTone: AlertTone = useMemo(() => {
    if (status === 'verified') return 'success'
    if (status === 'token_invalid' || status === 'token_missing') return 'warning'
    if (status === 'unexpected_error') return 'error'
    return 'info'
  }, [status])

  useEffect(() => {
    if (!initialStatusMessage) return
    setAlert({
      title: status === 'verified' ? 'Tudo certo' : 'Atenção',
      message: initialStatusMessage,
      tone: initialStatusTone,
    })
  }, [initialStatusMessage, initialStatusTone, status])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    if (!token) {
      setAlert({
        title: 'Token inválido',
        message: 'Não encontramos um token válido. Solicite um novo cadastro.',
        tone: 'warning',
      })
      return
    }

    try {
      const response = await createPassword(token, data.password)
      setAlert({
        title: 'Senha criada com sucesso',
        message: response.message || 'Agora você já pode entrar na plataforma.',
        tone: 'success',
        confirmLabel: 'Ir para login',
        onConfirm: () => {
          setAlert(null)
          navigate('/login', { replace: true })
        },
      })
    } catch (err: any) {
      setAlert({
        title: 'Não foi possível salvar a senha',
        message: err?.response?.data?.error || 'Tente novamente em alguns instantes.',
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
    <div className="min-h-screen bg-gradient-to-br from-[#f7f7fb] via-[#f1f2f8] to-[#ede9fe] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <main className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_80px_-36px_rgba(76,29,149,0.38)] lg:min-h-[720px] lg:grid-cols-[1.04fr_0.96fr]">
        <section className="relative hidden lg:block">
          <img
            src={heroImageSrc}
            alt="Pessoa planejando metas financeiras"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2a1152]/80 via-[#4b1d95]/32 to-transparent" />

          <div className="absolute left-8 top-8 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            <ShieldCheck size={14} />
            Etapa final
          </div>

          <div className="absolute inset-x-8 bottom-10">
            <h1 className="max-w-md text-4xl font-semibold leading-tight text-white">
              Defina sua senha e finalize seu acesso.
            </h1>
            <p className="mt-3 max-w-sm text-sm text-white/85">
              Você está a um passo de entrar na plataforma.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center bg-white p-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-md">
            <div className="relative mb-6 overflow-hidden rounded-2xl border border-violet-100 lg:hidden">
              <img
                src={heroImageSrc}
                alt="Pessoa criando senha"
                className="h-44 w-full object-cover"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-violet-900/45 via-transparent to-transparent" />
            </div>

            <div className="mb-8 text-center">
              <BrandWordmark size="sm" className="justify-center" />
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Segurança</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Criar senha</h2>
              <p className="mt-1 text-sm text-slate-600">Escolha uma senha segura para concluir seu cadastro.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
              <Input
                label="Nova senha"
                type="password"
                placeholder="Mínimo de 6 caracteres"
                leftIcon={<Lock size={16} />}
                autoComplete="new-password"
                className="h-12 rounded-xl border-slate-300 bg-slate-50 text-[15px] focus:ring-violet-600"
                {...register('password')}
              />

              <Input
                label="Confirmar senha"
                type="password"
                placeholder="Digite novamente sua senha"
                leftIcon={<Lock size={16} />}
                autoComplete="new-password"
                className="h-12 rounded-xl border-slate-300 bg-slate-50 text-[15px] focus:ring-violet-600"
                {...register('confirmPassword')}
              />

              <Button
                type="submit"
                fullWidth
                loading={isSubmitting}
                size="lg"
                leftIcon={!isSubmitting ? <ArrowRight size={16} /> : undefined}
                className="h-12 rounded-xl bg-gradient-to-r from-violet-700 to-purple-600 text-white shadow-[0_14px_30px_-20px_rgba(109,40,217,0.85)] hover:brightness-110"
              >
                Salvar senha
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
