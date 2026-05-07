import type { TransactionType, TransactionSource, Frequency } from '@prisma/client'

export type { TransactionType, TransactionSource, Frequency }

export interface UserSession {
  id: string
  name: string
  email: string
}

export interface CategoryData {
  id: string
  name: string
  icon: string
  color: string
  isDefault: boolean
  userId: string
  _count?: { transactions: number }
}

export interface TransactionData {
  id: string
  type: TransactionType
  amount: number
  description: string
  date: string
  notes?: string | null
  source: TransactionSource
  deletedAt?: string | null
  categoryId: string
  category?: CategoryData
  userId: string
  createdAt: string
}

export interface FixedExpenseData {
  id: string
  name: string
  amount: number
  type: TransactionType
  frequency: Frequency
  startDate: string
  endDate?: string | null
  isActive: boolean
  nextDueDate: string
  notes?: string | null
  categoryId: string
  category?: CategoryData
}

export interface DashboardSummary {
  balance: number
  income: number
  expense: number
  incomeVariation: number
  expenseVariation: number
  recentTransactions: TransactionData[]
  categoryBreakdown: CategoryBreakdown[]
  monthlyEvolution: MonthlyPoint[]
}

export interface CategoryBreakdown {
  categoryId: string
  name: string
  icon: string
  color: string
  total: number
  percentage: number
}

export interface MonthlyPoint {
  month: string
  income: number
  expense: number
}

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export type Period = 'today' | 'week' | 'month' | 'year'
