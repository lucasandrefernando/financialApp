/**
 * Configurações gerais da aplicação
 */
export const APP_CONFIG = {
  name: 'Financial App',
  version: '1.0.0',
  description: 'Aplicativo de controle financeiro pessoal',
} as const

/**
 * Breakpoints responsivos (Tailwind)
 */
export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
  ultraWide: 1536,
} as const

/**
 * Tipos de conta
 */
export const ACCOUNT_TYPES = {
  checking: { label: 'Conta Corrente', icon: 'CreditCard' },
  savings: { label: 'Poupança', icon: 'PiggyBank' },
  investment: { label: 'Investimento', icon: 'TrendingUp' },
  cash: { label: 'Dinheiro', icon: 'Wallet' },
  digital_wallet: { label: 'Carteira Digital', icon: 'Smartphone' },
} as const

/**
 * Tipos de transação
 */
export const TRANSACTION_TYPES = {
  income: { label: 'Receita', icon: 'TrendingUp', color: 'success' },
  expense: { label: 'Despesa', icon: 'TrendingDown', color: 'error' },
  transfer: { label: 'Transferência', icon: 'ArrowRightLeft', color: 'primary' },
} as const

/**
 * Status de transação
 */
export const TRANSACTION_STATUS = {
  pending: { label: 'Pendente', color: 'warning' },
  completed: { label: 'Concluída', color: 'success' },
  cancelled: { label: 'Cancelada', color: 'error' },
  scheduled: { label: 'Agendada', color: 'info' },
} as const

/**
 * Períodos de orçamento
 */
export const BUDGET_PERIODS = {
  weekly: { label: 'Semanal' },
  monthly: { label: 'Mensal' },
  yearly: { label: 'Anual' },
} as const

/**
 * Status de meta
 */
export const GOAL_STATUS = {
  active: { label: 'Ativa', color: 'primary' },
  completed: { label: 'Completada', color: 'success' },
  cancelled: { label: 'Cancelada', color: 'error' },
  paused: { label: 'Pausada', color: 'warning' },
} as const

/**
 * Moedas suportadas
 */
export const CURRENCIES = {
  BRL: { code: 'BRL', label: 'Real Brasileiro', symbol: 'R$' },
  USD: { code: 'USD', label: 'Dólar Americano', symbol: '$' },
  EUR: { code: 'EUR', label: 'Euro', symbol: '€' },
  JPY: { code: 'JPY', label: 'Iene Japonês', symbol: '¥' },
} as const

/**
 * Idiomas suportados
 */
export const LANGUAGES = {
  'pt-BR': { label: 'Português (Brasil)', locale: 'pt-BR' },
  'en-US': { label: 'English (US)', locale: 'en-US' },
  'es-ES': { label: 'Español (España)', locale: 'es-ES' },
} as const

/**
 * Fusos horários brasileiros
 */
export const TIMEZONES = {
  'America/Brasilia': { label: 'Brasília (GMT-3)' },
  'America/Cuiaba': { label: 'Cuiabá (GMT-4)' },
  'America/Anchorage': { label: 'Acre (GMT-5)' },
  'America/Araguaina': { label: 'Araguaína (GMT-3)' },
  'America/Bahia': { label: 'Bahia (GMT-3)' },
  'America/Belem': { label: 'Belém (GMT-3)' },
  'America/Fortaleza': { label: 'Fortaleza (GMT-3)' },
  'America/Maceio': { label: 'Maceió (GMT-3)' },
  'America/Manaus': { label: 'Manaus (GMT-4)' },
  'America/Paraiba': { label: 'Paraíba (GMT-3)' },
  'America/Recife': { label: 'Recife (GMT-3)' },
  'America/Santarem': { label: 'Santarém (GMT-3)' },
  'America/Sao_Paulo': { label: 'São Paulo (GMT-3)' },
} as const

/**
 * Categorias padrão de despesas
 */
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Alimentação', icon: 'UtensilsCrossed', color: '#FF6B6B' },
  { name: 'Transporte', icon: 'Car', color: '#4ECDC4' },
  { name: 'Saúde', icon: 'Heart', color: '#95E1D3' },
  { name: 'Educação', icon: 'BookOpen', color: '#A8E6CF' },
  { name: 'Entretenimento', icon: 'Music', color: '#FFD3B6' },
  { name: 'Utilidades', icon: 'Zap', color: '#FFAAA5' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#FF8B94' },
  { name: 'Assinaturas', icon: 'CreditCard', color: '#B4A7D6' },
  { name: 'Outros', icon: 'MoreHorizontal', color: '#95B8D1' },
] as const

/**
 * Categorias padrão de receitas
 */
export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salário', icon: 'Briefcase', color: '#52B788' },
  { name: 'Freelance', icon: 'Code', color: '#74C69D' },
  { name: 'Investimento', icon: 'TrendingUp', color: '#40916C' },
  { name: 'Presente', icon: 'Gift', color: '#1B4332' },
  { name: 'Outro', icon: 'MoreHorizontal', color: '#2D6A4F' },
] as const

/**
 * Cores do design system
 */
export const DESIGN_COLORS = {
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#06B6D4',
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
} as const

/**
 * Constantes de animação
 */
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 1000,
} as const

/**
 * Limites de paginação
 */
export const PAGINATION = {
  defaultPageSize: 25,
  maxPageSize: 100,
  minPageSize: 5,
} as const

/**
 * Configurações de cache (React Query)
 */
export const CACHE_CONFIG = {
  accounts: 5 * 60 * 1000, // 5 minutos
  transactions: 3 * 60 * 1000, // 3 minutos
  budgets: 5 * 60 * 1000, // 5 minutos
  goals: 5 * 60 * 1000, // 5 minutos
  categories: 30 * 60 * 1000, // 30 minutos
  profile: 30 * 60 * 1000, // 30 minutos
  notifications: 1 * 60 * 1000, // 1 minuto
} as const

/**
 * Mensagens da aplicação
 */
export const MESSAGES = {
  loading: 'Carregando...',
  error: 'Erro ao carregar dados',
  success: 'Operação realizada com sucesso!',
  emptyState: 'Nenhum item encontrado',
  confirmDelete: 'Deseja realmente excluir este item?',
  networkError: 'Erro de conexão. Verifique sua internet.',
  unauthorized: 'Você não tem permissão para acessar este recurso.',
  notFound: 'Recurso não encontrado.',
  serverError: 'Erro do servidor. Tente novamente mais tarde.',
} as const

/**
 * Validações
 */
export const VALIDATION = {
  passwordMinLength: 8,
  nameMinLength: 3,
  nameMaxLength: 100,
  descriptionMaxLength: 255,
} as const

/**
 * Rotas da aplicação
 */
export const ROUTES = {
  // Auth
  login: '/auth/login',
  register: '/auth/register',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
  
  // App
  dashboard: '/',
  transactions: '/transactions',
  budgets: '/budgets',
  goals: '/goals',
  profile: '/profile',
  
  // Profile sub-routes
  profileEdit: '/profile/edit',
  profileAccounts: '/profile/accounts',
  profileNotifications: '/profile/notifications',
  
  // Details
  transactionDetail: '/transactions/:id',
  budgetDetail: '/budgets/:id',
  goalDetail: '/goals/:id',
} as const

/**
 * Ícones de categorias disponíveis
 */
export const CATEGORY_ICONS = [
  'UtensilsCrossed', // Alimentação
  'Car', // Transporte
  'Heart', // Saúde
  'BookOpen', // Educação
  'Music', // Entretenimento
  'Zap', // Utilidades
  'ShoppingBag', // Shopping
  'CreditCard', // Cartão
  'Home', // Moradia
  'Wifi', // Internet
  'Briefcase', // Trabalho
  'Code', // Freelance
  'TrendingUp', // Investimento
  'Gift', // Presente
  'MoreHorizontal', // Outro
] as const

/**
 * Cores de conta disponíveis
 */
export const ACCOUNT_COLORS = [
  '#3B82F6', // Azul
  '#8B5CF6', // Roxo
  '#EC4899', // Rosa
  '#F43F5E', // Vermelho Coral
  '#F97316', // Laranja
  '#EAB308', // Amarelo
  '#22C55E', // Verde
  '#10B981', // Esmeralda
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#6366F1', // Índigo
] as const

/**
 * Limites padrão de alertas
 */
export const ALERT_THRESHOLDS = {
  budgetWarning: 80, // Alerta quando atinge 80% do orçamento
  lowBalance: 1000, // Alerta quando saldo fica abaixo de R$ 1000
  largeExpense: 5000, // Considera despesa grande acima de R$ 5000
} as const
