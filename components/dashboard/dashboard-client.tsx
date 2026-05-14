'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, ArrowRight, Tag, Receipt, ChevronDown, CreditCard, Landmark, Check } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import Link from 'next/link'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { BalanceChart }       from '@/components/dashboard/balance-chart'
import { DashboardFatura }    from '@/components/dashboard/dashboard-fatura'
import { CurrencyDisplay }    from '@/components/shared/currency-display'
import { cn, formatDate }     from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'month' | 'year'
type View   = 'all' | 'fatura' | 'extrato'

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
  category?: { id: string; name: string; icon: string; color: string } | null
}

interface DashboardData {
  summary:            Summary
  categoryBreakdown:  CategoryItem[]
  monthlyEvolution:   MonthItem[]
  recentTransactions: RecentTransaction[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLucideIcon(name: string): React.ElementType {
  const pascal = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  return (LucideIcons as unknown as Record<string, React.ElementType>)[pascal] ?? LucideIcons.Tag
}

function fmt(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const points = data.map(v => ({ v }))
  return (
    <ResponsiveContainer width={80} height={40}>
      <LineChart data={points}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2.5}
          dot={false}
          animationDuration={600}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── View Dropdown ────────────────────────────────────────────────────────────

const VIEW_OPTIONS: {
  value:    View
  label:    string
  sublabel: string
  icon:     React.ElementType
  soon?:    boolean
}[] = [
  { value: 'all',     label: 'Visão geral',        sublabel: 'Todas as transações',      icon: Landmark },
  { value: 'fatura',  label: 'Cartão de crédito',  sublabel: 'Importações via fatura',   icon: CreditCard },
  { value: 'extrato', label: 'Extrato bancário',   sublabel: 'Importações via extrato',  icon: Landmark },
]

const SOON_OPTIONS = [
  { label: 'Banco do Brasil',  sublabel: 'Integração bancária' },
  { label: 'PicPay',           sublabel: 'Integração bancária' },
  { label: 'Bradesco',         sublabel: 'Integração bancária' },
  { label: 'Santander',        sublabel: 'Integração bancária' },
]

function ViewDropdown({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = VIEW_OPTIONS.find(o => o.value === view)!

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all',
          open
            ? 'bg-[var(--gray-100)] border-[var(--gray-400)] text-[var(--gray-900)]'
            : 'border-[var(--gray-300)] text-[var(--gray-600)] hover:bg-[var(--gray-100)] hover:border-[var(--gray-400)]'
        )}
      >
        <current.icon size={14} className="shrink-0" />
        <span>{current.label}</span>
        <ChevronDown size={13} className={cn('transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full left-0 mt-2 w-64 z-50 rounded-2xl border border-[var(--gray-300)] bg-white/[0.97] backdrop-blur-xl shadow-[0_16px_48px_rgba(26,26,46,0.14)] overflow-hidden">

          {/* Available views */}
          <div className="p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gray-400)] px-2 py-1.5">
              Visualizações
            </p>
            {VIEW_OPTIONS.map(opt => {
              const isActive = view === opt.value
              const Icon = opt.icon
              return (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-left transition-colors group',
                    isActive ? 'bg-[var(--gray-900)]' : 'hover:bg-[var(--gray-100)]'
                  )}
                >
                  <div className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                    isActive ? 'bg-white/20' : 'bg-[var(--gray-100)] group-hover:bg-[var(--gray-200)]'
                  )}>
                    <Icon size={13} className={isActive ? 'text-white' : 'text-[var(--gray-600)]'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-semibold', isActive ? 'text-white' : 'text-[var(--gray-900)]')}>
                      {opt.label}
                    </p>
                    <p className={cn('text-[10px]', isActive ? 'text-white/70' : 'text-[var(--gray-400)]')}>
                      {opt.sublabel}
                    </p>
                  </div>
                  {isActive && <Check size={13} className="text-white shrink-0" />}
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div className="mx-3 border-t border-[var(--gray-200)]" />

          {/* Coming soon */}
          <div className="p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gray-400)] px-2 py-1.5">
              Em breve
            </p>
            {SOON_OPTIONS.map(opt => (
              <div
                key={opt.label}
                className="flex items-center gap-3 px-2 py-2.5 rounded-xl opacity-50 cursor-not-allowed"
              >
                <div className="w-7 h-7 rounded-lg bg-[var(--gray-100)] flex items-center justify-center shrink-0">
                  <Landmark size={13} className="text-[var(--gray-400)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--gray-700)]">{opt.label}</p>
                  <p className="text-[10px] text-[var(--gray-400)]">{opt.sublabel}</p>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--gray-200)] text-[var(--gray-500)] uppercase tracking-wider shrink-0">
                  Em breve
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Greeting card ───────────────────────────────────────────────────────────

function GreetingCard({
  firstName, balance, loading,
}: { firstName: string; balance?: number; loading: boolean }) {
  const initials = firstName.slice(0, 2).toUpperCase()
  const isNeg    = typeof balance === 'number' && balance < 0

  return (
    <div className="glass-card p-5 flex flex-col justify-between gap-5 min-h-[148px]">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-full bg-[var(--gray-800)] flex items-center justify-center text-white font-bold text-sm shrink-0">
          {initials}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--gray-500)]">
          Saldo total
        </span>
      </div>

      <div>
        <p className="text-sm text-[var(--gray-500)] mb-1.5">Olá, {firstName} 👋</p>
        {loading ? (
          <div className="skeleton h-9 w-40 rounded-lg" />
        ) : (
          <CurrencyDisplay
            value={balance ?? 0}
            type={isNeg ? 'expense' : 'income'}
            size="xl"
          />
        )}
      </div>
    </div>
  )
}

// ─── Stat card with sparkline ─────────────────────────────────────────────────

function StatCard({
  label, value, variation, sparkData, type, loading,
}: {
  label:     string
  value?:    number
  variation?: number
  sparkData: number[]
  type:      'income' | 'expense'
  loading:   boolean
}) {
  const color = type === 'income' ? 'var(--status-income)' : 'var(--status-expense)'
  const isNeg = typeof variation === 'number' && variation < 0
  const Icon  = type === 'income' ? TrendingUp : TrendingDown

  return (
    <div className={cn('p-5 flex flex-col gap-4 min-h-[148px]', type === 'income' ? 'glass-card-income' : 'glass-card-expense')}>
      {/* Label + badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '22' }}>
            <Icon size={16} style={{ color }} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--gray-500)]">{label}</p>
        </div>
        {typeof variation === 'number' && !loading && (
          <span className={cn(
            'flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0',
            isNeg
              ? 'bg-[rgba(244,230,226,0.8)] text-[var(--status-expense)]'
              : 'bg-[var(--green-frost)] text-[var(--status-income)]'
          )}>
            {isNeg ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
            {Math.abs(variation)}%
          </span>
        )}
      </div>

      {/* Value + sparkline */}
      <div className="flex items-end justify-between gap-2">
        <div>
          {loading ? (
            <div className="skeleton h-8 w-28 rounded-lg" />
          ) : (
            <CurrencyDisplay value={value ?? 0} type={type} size="lg" />
          )}
          <p className="text-[10px] text-[var(--gray-500)] mt-1">Este período</p>
        </div>
        {!loading && sparkData.length > 1 && (
          <div className="shrink-0 opacity-80">
            <Sparkline data={sparkData} color={color} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Transactions table ───────────────────────────────────────────────────────

function TransactionsTable({
  transactions, loading,
}: { transactions: RecentTransaction[]; loading: boolean }) {
  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--gray-300)]">
        <div>
          <h3 className="text-sm font-semibold text-[var(--gray-900)]">Últimas Transações</h3>
          <p className="text-xs text-[var(--gray-500)] mt-0.5">Movimentações recentes da conta</p>
        </div>
        <Link
          href="/transactions"
          className="flex items-center gap-1 text-xs font-semibold text-[var(--gray-700)] hover:text-[var(--gray-900)] transition-colors"
        >
          Ver todas <ArrowRight size={12} />
        </Link>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-x-4 px-5 py-2.5 border-b border-[var(--gray-300)]/60 bg-[var(--gray-100)]/60">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gray-500)]">Descrição</p>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gray-500)] hidden sm:block">Categoria</p>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gray-500)] hidden sm:block">Data</p>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gray-500)] text-right">Valor</p>
      </div>

      {/* Rows */}
      {loading ? (
        <div className="divide-y divide-[var(--gray-300)]/40">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="skeleton w-8 h-8 rounded-xl shrink-0" />
                <div className="skeleton h-3 w-32 rounded" />
              </div>
              <div className="skeleton h-3 w-20 rounded hidden sm:block" />
              <div className="skeleton h-3 w-20 rounded hidden sm:block" />
              <div className="skeleton h-3 w-16 rounded justify-self-end" />
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-2 text-[var(--gray-500)]">
          <Receipt size={32} strokeWidth={1.5} />
          <p className="text-sm">Nenhuma transação ainda</p>
          <Link href="/transactions" className="text-xs font-semibold text-[var(--gray-700)] hover:underline mt-1">
            Adicionar transação
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-[var(--gray-300)]/40">
          {transactions.map(tx => {
            const isIncome = tx.type === 'INCOME'
            const Icon     = tx.category ? getLucideIcon(tx.category.icon) : Tag
            return (
              <div
                key={tx.id}
                className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center px-5 py-3.5 hover:bg-[var(--gray-100)] transition-colors"
              >
                {/* Description + icon */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={tx.category
                      ? { background: tx.category.color + '22', border: `1.5px solid ${tx.category.color}` }
                      : { background: 'var(--gray-100)', border: '1.5px solid var(--gray-300)' }
                    }
                  >
                    <Icon size={14} style={{ color: tx.category?.color ?? 'var(--gray-500)' }} />
                  </div>
                  <span className="text-sm font-medium text-[var(--gray-900)] truncate">{tx.description}</span>
                </div>

                {/* Category */}
                <span className="hidden sm:block text-xs text-[var(--gray-500)] whitespace-nowrap">
                  {tx.category?.name ?? 'Outros'}
                </span>

                {/* Date */}
                <span className="hidden sm:block text-xs text-[var(--gray-500)] whitespace-nowrap">
                  {formatDate(tx.date)}
                </span>

                {/* Amount */}
                <div className="justify-self-end">
                  <CurrencyDisplay
                    value={tx.amount}
                    type={isIncome ? 'income' : 'expense'}
                    size="sm"
                    showSign
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Right panel ─────────────────────────────────────────────────────────────

function RightPanel({
  period, onChangePeriod, summary, categories, loading,
}: {
  period:          Period
  onChangePeriod:  (p: Period) => void
  summary?:        Summary
  categories:      CategoryItem[]
  loading:         boolean
}) {
  return (
    <aside className="flex flex-col gap-4">
      {/* Period selector */}
      <div className="glass-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--gray-500)] mb-3">Período</p>
        <div className="space-y-1">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => onChangePeriod(p.key)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all',
                period === p.key
                  ? 'bg-[var(--gray-900)] text-white shadow-sm'
                  : 'text-[var(--gray-700)] hover:bg-[var(--gray-100)]'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Period balance summary */}
      <div className="glass-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--gray-500)] mb-3">
          Resumo do período
        </p>
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-8 w-36 rounded-lg" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-full rounded" />
          </div>
        ) : (
          <>
            <CurrencyDisplay
              value={summary?.periodBalance ?? 0}
              type={(summary?.periodBalance ?? 0) >= 0 ? 'income' : 'expense'}
              size="lg"
            />
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--status-income)]" />
                  <span className="text-xs text-[var(--gray-500)]">Receitas</span>
                </div>
                <span className="text-xs font-semibold text-[var(--status-income)]">
                  {fmt(summary?.periodIncome ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--status-expense)]" />
                  <span className="text-xs text-[var(--gray-500)]">Despesas</span>
                </div>
                <span className="text-xs font-semibold text-[var(--status-expense)]">
                  {fmt(summary?.periodExpense ?? 0)}
                </span>
              </div>

              {/* Progress bar */}
              {(summary?.periodIncome ?? 0) > 0 && (
                <div className="mt-1 h-1.5 rounded-full bg-[var(--gray-200)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--status-expense)] transition-all duration-500"
                    style={{
                      width: `${Math.min(100, ((summary?.periodExpense ?? 0) / (summary?.periodIncome ?? 1)) * 100).toFixed(1)}%`
                    }}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Top categories */}
      <div className="glass-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--gray-500)] mb-3">
          Top categorias
        </p>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="skeleton w-5 h-5 rounded-lg" />
                <div className="skeleton h-3 flex-1 rounded" />
                <div className="skeleton h-3 w-8 rounded" />
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-xs text-[var(--gray-500)] text-center py-2">Nenhuma despesa</p>
        ) : (
          <div className="space-y-2.5">
            {categories.slice(0, 5).map(cat => {
              const Icon = getLucideIcon(cat.icon)
              return (
                <div key={cat.categoryId ?? cat.name} className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-lg shrink-0 flex items-center justify-center"
                    style={{ background: cat.color + '22' }}
                  >
                    <Icon size={11} style={{ color: cat.color }} />
                  </div>
                  <span className="text-xs text-[var(--gray-700)] flex-1 truncate">{cat.name}</span>
                  <span className="text-xs font-semibold text-[var(--gray-900)] shrink-0">
                    {cat.percentage}%
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardClient({ firstName }: { firstName: string }) {
  const [period,  setPeriod]  = useState<Period>('month')
  const [view,    setView]    = useState<View>('all')
  const [data,    setData]    = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/dashboard?period=${period}&view=${view}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(json.data)
    } catch { /* keep skeleton */ }
    finally  { setLoading(false) }
  }, [period, view])

  useEffect(() => { fetchData() }, [fetchData])

  const s = data?.summary

  // Sparkline data: income and expense series from monthly evolution
  const incomeSparkData  = (data?.monthlyEvolution ?? []).map(m => m.income)
  const expenseSparkData = (data?.monthlyEvolution ?? []).map(m => m.expense)

  // ── Render fatura / extrato view ─────────────────────────────────────────────
  if (view === 'fatura' || view === 'extrato') {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--gray-900)] font-[var(--font-space-grotesk)]">
              {view === 'fatura' ? 'Cartão de Crédito' : 'Extrato Bancário'}
            </h1>
            <p className="text-xs text-[var(--gray-500)] mt-0.5">
              {view === 'fatura'
                ? 'Gastos importados via fatura do cartão'
                : 'Movimentações importadas via extrato da conta'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Period pills */}
            <div className="hidden sm:flex gap-1 p-1 rounded-xl bg-[var(--gray-100)] border border-[var(--gray-300)]">
              {PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                    period === p.key
                      ? 'bg-[var(--gray-900)] text-white shadow-sm'
                      : 'text-[var(--gray-600)] hover:text-[var(--gray-900)]'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <ViewDropdown view={view} onChange={setView} />
          </div>
        </div>

        <DashboardFatura
          period={period}
          summary={data?.summary}
          monthlyData={data?.monthlyEvolution ?? []}
          transactions={data?.recentTransactions ?? []}
          loading={loading}
          importFrom={view}
        />
      </div>
    )
  }

  // ── Default (all) view ────────────────────────────────────────────────────────
  return (
    <div className="flex gap-5 xl:gap-6 items-start">

      {/* ── Main column ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* ── View selector header ──────────────────────────────── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--gray-900)] font-[var(--font-space-grotesk)]">
              Dashboard
            </h1>
          </div>
          <ViewDropdown view={view} onChange={v => { setView(v) }} />
        </div>

        {/* Negative balance alert — RN01 */}
        {!loading && s && s.balance < 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
            <AlertTriangle size={15} className="text-[var(--status-expense)] shrink-0" />
            <p className="text-sm text-[var(--status-expense)] font-medium">
              Seu saldo está negativo. Fique atento às despesas!
            </p>
          </div>
        )}

        {/* Row 1: Greeting + stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GreetingCard firstName={firstName} balance={s?.balance} loading={loading} />
          <StatCard
            label="Receitas"
            value={s?.periodIncome}
            variation={s?.incomeVariation}
            sparkData={incomeSparkData}
            type="income"
            loading={loading}
          />
          <StatCard
            label="Despesas"
            value={s?.periodExpense}
            variation={s?.expenseVariation}
            sparkData={expenseSparkData}
            type="expense"
            loading={loading}
          />
        </div>

        {/* Row 2: Recent transactions table */}
        <TransactionsTable
          transactions={data?.recentTransactions ?? []}
          loading={loading}
        />

        {/* Row 3: Balance chart */}
        {loading ? (
          <div className="glass-card p-5">
            <div className="skeleton h-5 w-36 rounded mb-1" />
            <div className="skeleton h-4 w-24 rounded mb-5" />
            <div className="skeleton h-52 rounded-xl" />
          </div>
        ) : (
          <BalanceChart data={data?.monthlyEvolution ?? []} />
        )}
      </div>

      {/* ── Right panel (xl+) ───────────────────────────────────── */}
      <div className="hidden xl:block w-[220px] shrink-0">
        <RightPanel
          period={period}
          onChangePeriod={setPeriod}
          summary={s}
          categories={data?.categoryBreakdown ?? []}
          loading={loading}
        />
      </div>
    </div>
  )
}
