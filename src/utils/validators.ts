import { z } from 'zod'

/**
 * Schema para validação de email
 */
export const emailSchema = z
  .string()
  .min(1, 'Email é obrigatório')
  .email('Email inválido')

/**
 * Schema para validação de senha
 */
export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'Senha deve conter pelo menos um número')

/**
 * Schema para login
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha é obrigatória'),
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * Schema para registro
 */
export const registerSchema = z.object({
  full_name: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não correspondem',
  path: ['confirmPassword'],
})

export type RegisterInput = z.infer<typeof registerSchema>

/**
 * Schema para profile
 */
export const profileSchema = z.object({
  full_name: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  phone: z.string().optional().nullable(),
  currency: z.string().min(1, 'Moeda é obrigatória'),
  timezone: z.string().min(1, 'Fuso horário é obrigatório'),
  monthly_income: z
    .number()
    .min(0, 'Renda mensal não pode ser negativa'),
  locale: z.string().min(1, 'Localização é obrigatória'),
})

export type ProfileInput = z.infer<typeof profileSchema>

/**
 * Schema para conta
 */
export const accountSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome da conta é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  type: z.enum(['checking', 'savings', 'investment', 'cash', 'digital_wallet']),
  bank_name: z.string().optional().nullable(),
  bank_code: z.string().optional().nullable(),
  agency: z.string().optional().nullable(),
  account_number: z.string().optional().nullable(),
  initial_balance: z.number().default(0),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor deve ser um código hex válido'),
  icon: z.string().min(1, 'Ícone é obrigatório'),
  include_in_sum: z.boolean().default(true),
  notes: z.string().optional().nullable(),
})

export type AccountInput = z.infer<typeof accountSchema>

/**
 * Schema para transação
 */
export const transactionSchema = z.object({
  description: z
    .string()
    .min(1, 'Descrição é obrigatória')
    .max(255, 'Descrição deve ter no máximo 255 caracteres'),
  amount: z
    .number()
    .positive('Valor deve ser positivo')
    .or(z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0)),
  type: z.enum(['income', 'expense', 'transfer']),
  status: z.enum(['pending', 'completed', 'cancelled', 'scheduled']).default('completed'),
  from_account_id: z.string().uuid('Conta de origem inválida'),
  to_account_id: z.string().uuid('Conta de destino inválida').optional().nullable(),
  category_id: z.string().uuid('Categoria inválida').optional().nullable(),
  transaction_date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Data inválida'),
  notes: z.string().optional().nullable(),
}).refine(
  (data) => data.type === 'transfer' ? !!data.to_account_id : true,
  {
    message: 'Transferência requer conta de destino',
    path: ['to_account_id'],
  }
)

export type TransactionInput = z.infer<typeof transactionSchema>

/**
 * Schema para orçamento
 */
export const budgetSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  amount: z
    .number()
    .positive('Valor deve ser positivo'),
  category_id: z.string().uuid('Categoria inválida'),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  alert_threshold: z
    .number()
    .min(0)
    .max(100, 'Limite deve estar entre 0 e 100%')
    .default(80),
  notes: z.string().optional().nullable(),
})

export type BudgetInput = z.infer<typeof budgetSchema>

/**
 * Schema para meta
 */
export const goalSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  target_amount: z
    .number()
    .positive('Valor deve ser positivo'),
  current_amount: z
    .number()
    .nonnegative('Valor não pode ser negativo')
    .default(0),
  deadline: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Data inválida'),
  category: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type GoalInput = z.infer<typeof goalSchema>

/**
 * Valida um valor monetário simples
 */
export function validateAmount(value: unknown): boolean {
  return !isNaN(Number(value)) && Number(value) > 0
}

/**
 * Valida um CPF (básico)
 */
export function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11) return false
  if (/^(\d)\1{10}$/.test(clean)) return false
  return true
}

/**
 * Valida um CNPJ (básico)
 */
export function validateCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14) return false
  if (/^(\d)\1{13}$/.test(clean)) return false
  return true
}

/**
 * Valida uma URL
 */
export const urlSchema = z
  .string()
  .url('URL inválida')
  .optional()
  .nullable()

/**
 * Valida um telefone brasileiro simples
 */
export const phoneSchema = z
  .string()
  .regex(/^(\(?[0-9]{2}\)?\s)?[0-9]{4,5}-?[0-9]{4}$/, 'Telefone inválido')
  .optional()
  .nullable()

/**
 * Validador genérico de número não negativo
 */
export const nonNegativeNumberSchema = z
  .number()
  .nonnegative('Valor não pode ser negativo')
