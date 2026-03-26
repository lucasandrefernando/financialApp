export interface User {
  id: number
  name: string
  email: string
  avatar_url?: string
  currency: string
  locale: string
  timezone: string
  onboarding_completed: boolean
  created_at: string
}

export interface BankAccount {
  id: number
  owner_id: number
  name: string
  type: 'checking' | 'savings' | 'investment' | 'cash' | 'digital_wallet'
  bank_name?: string
  initial_balance: number
  current_balance: number
  color: string
  icon: string
  include_in_total: boolean
  notes?: string
  role?: 'owner' | 'editor' | 'viewer'
}

export interface IncomeSource {
  id: number
  user_id: number
  account_id: number
  name: string
  type: 'salary' | 'freelance' | 'rental' | 'pension' | 'dividends' | 'investment' | 'other'
  amount: number
  day_of_month: number
  active: boolean
  notes?: string
}

export interface Category {
  id: number
  user_id?: number
  name: string
  type: 'income' | 'expense' | 'both'
  parent_id?: number
  color: string
  icon: string
  is_system: boolean
}

export interface Transaction {
  id: number
  user_id: number
  account_id: number
  category_id?: number
  type: 'income' | 'expense' | 'transfer'
  description: string
  amount: number
  date: string
  competence_date?: string
  status: 'completed' | 'pending' | 'scheduled' | 'cancelled'
  expense_type?: 'essential' | 'variable' | 'leisure' | 'investment'
  is_installment: boolean
  installment_number?: number
  installment_total?: number
  installment_group_id?: string
  is_recurring: boolean
  recurring_id?: number
  transfer_to_account_id?: number
  tags?: string[]
  notes?: string
  attachment_url?: string
  category_name?: string
  category_color?: string
  category_icon?: string
  account_name?: string
  created_at: string
}

export interface Budget {
  id: number
  user_id: number
  category_id: number
  amount: number
  period: 'weekly' | 'monthly' | 'yearly'
  alert_threshold: number
  active: boolean
  category_name?: string
  category_color?: string
  spent?: number
  percentage?: number
  remaining?: number
}

export interface Goal {
  id: number
  user_id: number
  account_id?: number
  name: string
  description?: string
  target_amount: number
  current_amount: number
  monthly_contribution?: number
  deadline?: string
  priority: number
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  icon: string
  color: string
  percentage?: number
}

export interface DashboardData {
  total_balance: number
  account_balances: BankAccount[]
  current_month: {
    income: number
    expenses: number
    balance: number
    savings_rate: number
  }
  averages: {
    daily: number
    weekly: number
    biweekly: number
  }
  projected_end_of_month: number
  top_categories: { category_name: string; color: string; total: number; percentage: number }[]
  recent_transactions: Transaction[]
  budget_alerts: Budget[]
  monthly_cash_flow: {
    year: number
    month: number
    label: string
    income: number
    expenses: number
    balance: number
  }[]
}
