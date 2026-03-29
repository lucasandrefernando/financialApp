import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, CreditCard, UserRound } from 'lucide-react'
import { completeMyProfile } from '../../services/auth'
import { useAuthStore } from '../../stores/authStore'
import { AlertModal, type AlertTone } from '../../components/ui/AlertModal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { getFirstFormErrorMessage } from './formError'
import { BrandWordmark } from '../../components/brand/Brand'

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
  cpf: z.string().refine(isValidCpf, 'CPF inválido.'),
})

type FormData = z.infer<typeof schema>
type AlertState = { title: string; message: string; tone?: AlertTone } | null

export default function CompleteProfileScreen() {
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()
  const [alert, setAlert] = useState<AlertState>(null)

  if (!user) return <Navigate to="/login" replace />

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user.name || '',
      cpf: user.cpf || '',
    },
  })

  const onSubmit = async (data: FormData) => {
    try {
      const updated = await completeMyProfile(data.name, data.cpf)
      setUser(updated)
      navigate(updated.onboarding_completed ? '/' : '/onboarding', { replace: true })
    } catch (err: any) {
      setAlert({
        title: 'Não foi possível concluir',
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
      <main className="mx-auto flex w-full max-w-6xl items-center justify-center overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_80px_-36px_rgba(76,29,149,0.38)] p-6 sm:p-8 lg:min-h-[720px] lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <BrandWordmark size="sm" className="justify-center" />
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Cadastro complementar</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Finalize seu perfil</h2>
            <p className="mt-1 text-sm text-slate-600">Para continuar, confirme seu nome completo e CPF.</p>
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

            <Button
              type="submit"
              fullWidth
              loading={isSubmitting}
              size="lg"
              leftIcon={!isSubmitting ? <ArrowRight size={16} /> : undefined}
              className="h-12 rounded-xl bg-gradient-to-r from-violet-700 to-purple-600 text-white shadow-[0_14px_30px_-20px_rgba(109,40,217,0.85)] hover:brightness-110"
            >
              Concluir cadastro
            </Button>
          </form>
        </div>
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
