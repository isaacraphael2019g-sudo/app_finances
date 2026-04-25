export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  category: string
  description: string | null
  date: string
  created_at: string
}

export interface TransactionFormData {
  type: TransactionType
  amount: number
  category: string
  description?: string
  date: string
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
