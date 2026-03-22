export type AccountType = 'checking' | 'savings' | 'investment' | 'cash' | 'digital_wallet'
export type TransactionType = 'income' | 'expense' | 'transfer'
export type TransactionStatus = 'pending' | 'completed' | 'cancelled' | 'scheduled'
export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly'
export type GoalStatus = 'active' | 'completed' | 'cancelled' | 'paused'
export type CreditCardBrand = 'visa' | 'mastercard' | 'elo' | 'amex' | 'hipercard' | 'other'
export type InstallmentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'
export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'yearly'
export type NotificationType = 'budget_alert' | 'goal_reached' | 'bill_due' | 'large_expense' | 'low_balance' | 'recurring_created' | 'installment_due' | 'general'
export type NotificationStatus = 'unread' | 'read' | 'dismissed'
export type CategoryType = 'income' | 'expense' | 'both'
export type AlertLevel = 'ok' | 'alert' | 'exceeded'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  currency: string
  locale: string
  timezone: string
  monthly_income: number
  onboarding_done: boolean
  preferences: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  bank_name: string | null
  bank_code: string | null
  agency: string | null
  account_number: string | null
  balance: number
  initial_balance: number
  color: string
  icon: string
  is_active: boolean
  include_in_sum: boolean
  notes: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Category {
  id: string
  user_id: string | null
  parent_id: string | null
  name: string
  type: CategoryType
  color: string
  icon: string
  is_system: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string | null
  credit_card_id: string | null
  category_id: string | null
  destination_account_id: string | null
  recurring_id: string | null
  installment_group_id: string | null
  installment_number: number | null
  installment_total: number | null
  type: TransactionType
  status: TransactionStatus
  amount: number
  description: string
  notes: string | null
  transaction_date: string
  competence_date: string | null
  tags: string[]
  attachments: unknown[]
  metadata: Record<string, unknown>
  is_reconciled: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreditCard {
  id: string
  user_id: string
  account_id: string | null
  name: string
  brand: CreditCardBrand
  last_four_digits: string | null
  credit_limit: number
  available_limit: number
  closing_day: number
  due_day: number
  color: string
  is_active: boolean
  notes: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface RecurringTransaction {
  id: string
  user_id: string
  account_id: string | null
  category_id: string | null
  credit_card_id: string | null
  type: TransactionType
  amount: number
  description: string
  frequency: RecurrenceFrequency
  start_date: string
  end_date: string | null
  next_date: string
  last_generated: string | null
  day_of_month: number | null
  day_of_week: number | null
  is_active: boolean
  auto_create: boolean
  advance_days: number
  tags: string[]
  notes: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Budget {
  id: string
  user_id: string
  category_id: string | null
  name: string
  amount: number
  spent: number
  period: BudgetPeriod
  start_date: string
  end_date: string | null
  alert_threshold: number
  is_active: boolean
  rollover: boolean
  notes: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Goal {
  id: string
  user_id: string
  account_id: string | null
  name: string
  description: string | null
  target_amount: number
  current_amount: number
  monthly_contribution: number
  deadline: string | null
  status: GoalStatus
  color: string
  icon: string
  priority: number
  notes: string | null
  metadata: Record<string, unknown>
  completed_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  status: NotificationStatus
  title: string
  message: string
  action_url: string | null
  metadata: Record<string, unknown>
  expires_at: string | null
  read_at: string | null
  created_at: string
  updated_at: string
}

export interface NotificationPreference {
  id: string
  user_id: string
  enabled: boolean
  push_enabled: boolean
  email_enabled: boolean
  in_app_enabled: boolean
  sound_enabled: boolean
  silent_hours_start: string
  silent_hours_end: string
  max_per_day: number
  budget_alert: boolean
  goal_reached: boolean
  bill_due: boolean
  large_expense: boolean
  low_balance: boolean
  recurring_created: boolean
  installment_due: boolean
  general_notif: boolean
  created_at: string
  updated_at: string
}

export interface AccountSummary extends Account {
  transaction_count: number
  monthly_income: number | null
  monthly_expense: number | null
}

export interface BudgetProgress extends Budget {
  remaining: number
  percent_used: number
  alert_level: AlertLevel
  category_name: string | null
  category_color: string | null
  category_icon: string | null
}

export interface GoalProgress extends Goal {
  remaining_amount: number
  percent_complete: number
  months_to_complete: number | null
  account_name: string | null
}

export interface RecentTransaction extends Transaction {
  account_name: string | null
  account_color: string | null
  category_name: string | null
  category_color: string | null
  category_icon: string | null
  credit_card_name: string | null
  destination_account_name: string | null
}

export interface MonthlySummary {
  total_income: number
  total_expense: number
  net_balance: number
  transaction_count: number
  top_expense_category: string | null
  savings_rate: number
}

export interface MonthlyFlow {
  user_id: string
  month: string
  total_income: number
  total_expense: number
  net: number
}

export interface CategorySpending {
  user_id: string
  category_id: string
  category_name: string
  color: string
  icon: string
  month: string
  transaction_count: number
  total_amount: number
  avg_amount: number
  max_amount: number
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at' | 'id' | 'deleted_at'>; Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>> }
      accounts: { Row: Account; Insert: Omit<Account, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'deleted_at'>; Update: Partial<Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>> }
      categories: { Row: Category; Insert: Omit<Category, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>; Update: Partial<Omit<Category, 'id' | 'user_id' | 'is_system' | 'created_at' | 'updated_at' | 'deleted_at'>> }
      transactions: { Row: Transaction; Insert: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'deleted_at'>; Update: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>> }
      credit_cards: { Row: CreditCard; Insert: Omit<CreditCard, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'deleted_at'>; Update: Partial<Omit<CreditCard, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>> }
      recurring_transactions: { Row: RecurringTransaction; Insert: Omit<RecurringTransaction, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'deleted_at'>; Update: Partial<Omit<RecurringTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>> }
      budgets: { Row: Budget; Insert: Omit<Budget, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'spent' | 'deleted_at'>; Update: Partial<Omit<Budget, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'spent' | 'deleted_at'>> }
      goals: { Row: Goal; Insert: Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'completed_at' | 'deleted_at'>; Update: Partial<Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'deleted_at'>> }
      notifications: { Row: Notification; Insert: Omit<Notification, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'read_at'>; Update: Partial<Omit<Notification, 'id' | 'user_id' | 'created_at' | 'updated_at'>> }
      notification_preferences: { Row: NotificationPreference; Insert: Omit<NotificationPreference, 'id' | 'created_at' | 'updated_at' | 'user_id'>; Update: Partial<Omit<NotificationPreference, 'id' | 'user_id' | 'created_at' | 'updated_at'>> }
    }
    Views: {
      vw_account_summary: { Row: AccountSummary }
      vw_budget_progress: { Row: BudgetProgress }
      vw_goal_progress: { Row: GoalProgress }
      vw_recent_transactions: { Row: RecentTransaction }
      vw_monthly_cash_flow: { Row: MonthlyFlow }
      vw_category_spending: { Row: CategorySpending }
    }
    Functions: {
      fn_monthly_summary: { Args: { p_user_id: string; p_year: number; p_month: number }; Returns: MonthlySummary[] }
    }
  }
}
