export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  category: string
  description: string | null
  date: string
  account_id?: string | null
  created_at: string
}

export interface TransactionFormData {
  type: TransactionType
  amount: number
  category: string
  description?: string
  date: string
  account_id?: string | null
}

export interface Account {
  id: string
  user_id: string
  name: string
  type: 'checking' | 'savings' | 'cash' | 'investment'
  color: string
  initial_balance: number
  created_at: string
}

export interface RecurringTransaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  category: string
  description: string | null
  frequency: 'monthly' | 'weekly' | 'yearly'
  next_date: string
  active: boolean
  created_at: string
}

export const INCOME_CATEGORIES = [
  'Salário',
  'Freelance',
  'Investimentos',
  'Aluguel recebido',
  'Presente',
  'Outros',
]

export const EXPENSE_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Educação',
  'Lazer',
  'Vestuário',
  'Contas',
  'Compras',
  'Outros',
]
