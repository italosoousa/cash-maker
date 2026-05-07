'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Wallet, TrendingUp, TrendingDown, Minus,
  AlertTriangle, ArrowRight, Tag,
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import Link from 'next/link'
import { SummaryCard } from '@/components/dashboard/summary-card'
import { BalanceChart } from '@/components/dashboard/balance-chart'
import { CategoryChart } from '@/components/dashboard/category-chart'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { cn, formatDate } from '@/lib/utils'

type Period = 'today' | 'week' | 'month' | 'year'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'week',  label: 'Esta semana' },
  { key: 'month', label: 'Este mês' },
  { key: 'year',  label: 'Este ano' },
]

interface Summary {
  balance:          number
  periodIncome:     number
  periodExpense:    number
  periodBalance:    number
  incomeVariation:  number
  expenseVariation: number
}

interface CategoryItem {
  categoryId:  string | null
  name:        string
  icon:        string
  color:       string
  total:       number
  percentage:  number
}

interface MonthItem {
  label:   string
  income:  number
  expense: number
}

interface RecentTransaction {
  id:          string
  type:        'INCOME' | 'EXPENSE'
  amount:      number
  description: string
  date:        string
  category?: {
    id:    string
    name:  string
    icon:  string
    color: string
  } | null
}

interface DashboardData {
  summary:              Summary
  categoryBreakdown:    CategoryItem[]
  monthlyEvolution:     MonthItem[]
  recentTransactions:   RecentTransaction[]
}

function getLucideIcon(name: string): React.ElementType {
  const pascal = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  return (LucideIcons as unknown as Record<string, React.ElementType>)[pascal] ?? LucideIcons.Tag
}

function RecentTransactionRow({ tx }: { tx: RecentTransaction }) {
  const isIncome = tx.type === 'INCOME'
  const Icon = tx.category ? getLucideIcon(tx.category.icon) : Tag

  return (
    <div className="flex items-center gap-3 py-3 px-2 rounded-xl hover:bg-white/40 transition-colors">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={tx.category
          ? { background: tx.category.color + '22', border: `1.5px solid ${tx.category.color}` }
          : { background: 'var(--green-frost)', border: '1.5px solid var(--glass-border)' }
        }
      >
        <Icon size={16} style={{ color: tx.category?.color ?? 'var(--ink-soft)' }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--ink-dark)] truncate">{tx.description}</p>
        <p className="text-xs text-[var(--ink-ghost)] mt-0.5">
          {tx.category?.name ?? 'Outros'} · {formatDate(tx.date)}
        </p>
      </div>

      <CurrencyDisplay
        value={tx.amount}
        type={isIncome ? 'income' : 'expense'}
        size="sm"
        showSign
      />
    </div>
  )
}

function SummaryCardSkeleton() {
  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="skeleton w-12 h-5 rounded-full" />
      </div>
      <div className="skeleton h-8 w-32 rounded-lg" />
      <div className="skeleton h-3 w-24 rounded" />
    </div>
  )
}

interface DashboardClientProps {
  firstName: string
}

export function DashboardClient({ firstName }: DashboardClientProps) {
  const [period, setPeriod]     = useState<Period>('month')
  const [data,   setData]       = useState<DashboardData | null>(null)
  const [loading, setLoading]   = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard?period=${period}`)
      if (!res.ok) throw new Error('Erro ao carregar dados')
      const json = await res.json()
      setData(json.data)
    } catch {
      /* silent — skeleton stays visible */
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { fetchData() }, [fetchData])

  const s = data?.summary

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--green-deep)] font-[var(--font-space-grotesk)]">
            Olá, {firstName} 👋
          </h1>
          <p className="text-sm text-[var(--ink-soft)] mt-1">
            Aqui está um resumo das suas finanças.
          </p>
        </div>

        {/* Period selector — scrollable on small screens */}
        <div className="overflow-x-auto scrollbar-none -mx-1 px-1 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--green-frost)] border border-[var(--green-mist)] min-w-max">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  'text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 whitespace-nowrap',
                  period === p.key
                    ? 'bg-white text-[var(--green-deep)] shadow-sm'
                    : 'text-[var(--ink-soft)] hover:text-[var(--ink-mid)]'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Negative balance alert — RN01 */}
      {!loading && s && s.balance < 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle size={16} className="text-[var(--status-err)] shrink-0" />
          <p className="text-sm text-[var(--status-err)] font-medium">
            Seu saldo está negativo. Fique atento às despesas!
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          <>
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </>
        ) : (
          <>
            <SummaryCard
              label="Saldo Total"
              value={s?.balance ?? 0}
              type="neutral"
              icon={Wallet}
            />
            <SummaryCard
              label="Receitas"
              value={s?.periodIncome ?? 0}
              type="income"
              icon={TrendingUp}
              variation={s?.incomeVariation}
            />
            <SummaryCard
              label="Despesas"
              value={s?.periodExpense ?? 0}
              type="expense"
              icon={TrendingDown}
              variation={s?.expenseVariation}
            />
            <SummaryCard
              label="Saldo do Período"
              value={s?.periodBalance ?? 0}
              type="neutral"
              icon={Minus}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="glass-card p-5">
              <div className="skeleton h-5 w-36 rounded mb-2" />
              <div className="skeleton h-4 w-24 rounded mb-4" />
              <div className="skeleton h-52 rounded-xl" />
            </div>
          ) : (
            <BalanceChart data={data?.monthlyEvolution ?? []} />
          )}
        </div>

        <div>
          {loading ? (
            <div className="glass-card p-5">
              <div className="skeleton h-5 w-48 rounded mb-2" />
              <div className="skeleton h-4 w-28 rounded mb-4" />
              <div className="skeleton h-52 rounded-xl" />
            </div>
          ) : (
            <CategoryChart data={data?.categoryBreakdown ?? []} />
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--ink-dark)]">Últimas Transações</h3>
            <p className="text-xs text-[var(--ink-ghost)] mt-0.5">As 6 mais recentes</p>
          </div>
          <Link
            href="/transactions"
            className="flex items-center gap-1 text-xs font-semibold text-[var(--green-mid)] hover:text-[var(--green-deep)] transition-colors"
          >
            Ver todas
            <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 px-2 py-3">
                <div className="skeleton w-9 h-9 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-40 rounded" />
                  <div className="skeleton h-2.5 w-24 rounded" />
                </div>
                <div className="skeleton h-4 w-20 rounded" />
              </div>
            ))}
          </div>
        ) : (data?.recentTransactions ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <LucideIcons.Receipt size={32} className="text-[var(--ink-ghost)]" strokeWidth={1.5} />
            <p className="text-sm text-[var(--ink-ghost)]">Nenhuma transação ainda</p>
            <Link
              href="/transactions"
              className="mt-1 text-xs font-semibold text-[var(--green-mid)] hover:underline"
            >
              Adicionar transação
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--green-mist)]/40">
            {(data?.recentTransactions ?? []).map(tx => (
              <RecentTransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
