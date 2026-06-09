'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ArrowUpRight, ArrowDownLeft, ArrowDownRight, ArrowRight,
  Wallet, PiggyBank, Plus, AlertTriangle, Tag, Receipt,
  Calendar, CalendarDays, CalendarRange, X,
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import Link from 'next/link'
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart as RechartsPieChart, Pie, Cell,
  LineChart, Line,
  XAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { startOfWeek, endOfWeek } from 'date-fns'
import { DashboardFatura }  from '@/components/dashboard/dashboard-fatura'
import { CurrencyDisplay }  from '@/components/shared/currency-display'
import { cn, formatDate }   from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type Period     = 'today' | 'week' | 'month' | 'year' | 'custom'
type View       = 'all' | 'fatura' | 'extrato'
type CustomMode = 'day' | 'week' | 'interval'

interface Summary {
  balance:          number
  periodIncome:     number
  periodExpense:    number
  periodBalance:    number
  incomeVariation:  number
  expenseVariation: number
  balanceVariation: number
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
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  }).format(value)
}

function getPeriodLabel(period: Period, fromDate: string): string {
  if (period === 'today')  return 'Hoje'
  if (period === 'week')   return 'Esta semana'
  if (period === 'year')   return 'Este ano'
  if (period === 'custom' && fromDate) {
    const d = new Date(fromDate + 'T12:00:00')
    return d.toLocaleDateString('pt-BR', { month: 'long' })
  }
  return new Date().toLocaleDateString('pt-BR', { month: 'long' })
}

function getPeriodSince(period: Period, fromDate: string): string {
  if (period === 'today') return 'Hoje'
  if (period === 'week')  return 'Esta semana'
  if (period === 'year')  return 'Este ano'
  const month = getPeriodLabel(period, fromDate)
  return 'Este ' + month.charAt(0).toUpperCase() + month.slice(1)
}

// ─── Trend badge ─────────────────────────────────────────────────────────────

function TrendBadge({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full bg-[rgba(136,136,170,.14)] text-[var(--gray-500)]">
        —
      </span>
    )
  }
  const pos  = value > 0
  const Icon = pos ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0',
      pos
        ? 'bg-[rgba(82,183,136,.14)] text-[var(--status-income)]'
        : 'bg-[rgba(244,230,226,.8)] text-[var(--status-expense)]',
    )}>
      <Icon size={11} />
      {Math.abs(value)}%
    </span>
  )
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  return (
    <ResponsiveContainer width={88} height={38}>
      <LineChart data={data.map(v => ({ v }))}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2.5} dot={false} animationDuration={600} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Period filter (segmented + popover) ─────────────────────────────────────

interface PeriodFilterProps {
  period:    Period
  fromDate:  string
  toDate:    string
  onPeriod:  (p: Exclude<Period, 'custom'>) => void
  onCustom:  (from: string, to: string) => void
}

const PRESET_PILLS: { key: Exclude<Period, 'custom'>; label: string }[] = [
  { key: 'today', label: 'Hoje'   },
  { key: 'week',  label: 'Semana' },
  { key: 'month', label: 'Mês'    },
  { key: 'year',  label: 'Ano'    },
]

function PeriodFilter({ period, onPeriod, onCustom }: PeriodFilterProps) {
  const [open,      setOpen]      = useState(false)
  const [mode,      setMode]      = useState<CustomMode>('interval')
  const [localFrom, setLocalFrom] = useState('')
  const [localTo,   setLocalTo]   = useState('')
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (!popRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const todayStr = new Date().toISOString().slice(0, 10)

  function applyShortcut(kind: 7 | 30 | 'quarter') {
    const to   = new Date()
    const from = new Date()
    if (kind === 'quarter') {
      const qStart = Math.floor(from.getMonth() / 3) * 3
      from.setMonth(qStart, 1)
    } else {
      from.setDate(from.getDate() - kind + 1)
    }
    setLocalFrom(from.toISOString().slice(0, 10))
    setLocalTo(to.toISOString().slice(0, 10))
    setMode('interval')
  }

  function handleApply() {
    let from = localFrom
    let to   = localTo
    if (mode === 'day') {
      to = from
    } else if (mode === 'week' && from) {
      const d = new Date(from + 'T12:00:00')
      from = startOfWeek(d, { weekStartsOn: 0 }).toISOString().slice(0, 10)
      to   = endOfWeek(d,   { weekStartsOn: 0 }).toISOString().slice(0, 10)
    }
    if (from) {
      onCustom(from, to || from)
      setOpen(false)
    }
  }

  const MODE_CONFIG: { key: CustomMode; label: string; Icon: React.ElementType }[] = [
    { key: 'day',      label: 'Dia',       Icon: Calendar      },
    { key: 'week',     label: 'Semana',    Icon: CalendarDays  },
    { key: 'interval', label: 'Intervalo', Icon: CalendarRange },
  ]

  return (
    <div className="relative" ref={popRef}>
      {/* Segmented control */}
      <div className="flex items-center gap-0.5 p-1 rounded-[13px] bg-[rgba(255,255,255,.5)] border border-[var(--gray-300)]">
        {PRESET_PILLS.map(p => (
          <button
            key={p.key}
            onClick={() => onPeriod(p.key)}
            className={cn(
              'px-3 py-1.5 rounded-[9px] text-[12.5px] font-medium transition-all',
              period === p.key
                ? 'bg-[var(--gray-900)] text-white shadow-sm'
                : 'text-[var(--gray-600)] hover:text-[var(--gray-900)]',
            )}
          >
            {p.label}
          </button>
        ))}
        <div className="w-px self-stretch mx-0.5 bg-[rgba(26,26,46,.12)]" />
        <button
          onClick={() => setOpen(v => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-[12.5px] font-medium transition-all',
            period === 'custom' || open
              ? 'bg-[var(--gray-900)] text-white shadow-sm'
              : 'text-[var(--gray-600)] hover:text-[var(--gray-900)]',
          )}
        >
          <CalendarRange size={13} />
          <span>Personalizado</span>
        </button>
      </div>

      {/* Popover */}
      {open && (
        <div className="glass-popover absolute top-[calc(100%+10px)] right-0 z-50 w-[316px] p-4 rounded-[18px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-3.5">
            <span className="text-[12.5px] font-bold text-[var(--gray-900)] tracking-[-0.01em]">
              Período personalizado
            </span>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 rounded-lg grid place-items-center text-[var(--gray-500)] bg-[rgba(255,255,255,.6)] border border-[rgba(200,200,224,.45)] hover:bg-white transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          {/* Mode chips */}
          <div className="flex gap-1.5 mb-3.5">
            {MODE_CONFIG.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-1.5 text-[11.5px] font-semibold py-2 px-1.5 rounded-[10px] border transition-all',
                  mode === key
                    ? 'bg-[var(--gray-900)] text-white border-[var(--gray-900)]'
                    : 'text-[var(--gray-600)] bg-[rgba(255,255,255,.5)] border-[rgba(200,200,224,.5)] hover:bg-[rgba(255,255,255,.85)]',
                )}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* Date fields */}
          <div className={cn('grid gap-2.5', mode === 'interval' ? 'grid-cols-2' : 'grid-cols-1')}>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-[var(--gray-500)]">
                {mode === 'interval' ? 'De' : mode === 'week' ? 'Semana de' : 'Data'}
              </span>
              <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-[11px] bg-[rgba(255,255,255,.72)] border border-[var(--gray-300)] focus-within:border-[var(--gray-500)] focus-within:ring-2 focus-within:ring-[rgba(136,136,170,.16)] transition-all">
                <Calendar size={13} className="text-[var(--gray-500)] shrink-0" />
                <input
                  type="date"
                  value={localFrom}
                  max={todayStr}
                  onChange={e => setLocalFrom(e.target.value)}
                  className="border-0 bg-transparent outline-none text-[12.5px] font-semibold text-[var(--gray-900)] w-full [color-scheme:light]"
                />
              </div>
            </label>
            {mode === 'interval' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-[var(--gray-500)]">Até</span>
                <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-[11px] bg-[rgba(255,255,255,.72)] border border-[var(--gray-300)] focus-within:border-[var(--gray-500)] focus-within:ring-2 focus-within:ring-[rgba(136,136,170,.16)] transition-all">
                  <Calendar size={13} className="text-[var(--gray-500)] shrink-0" />
                  <input
                    type="date"
                    value={localTo}
                    min={localFrom}
                    max={todayStr}
                    onChange={e => setLocalTo(e.target.value)}
                    className="border-0 bg-transparent outline-none text-[12.5px] font-semibold text-[var(--gray-900)] w-full [color-scheme:light]"
                  />
                </div>
              </label>
            )}
          </div>

          {/* Quick shortcuts */}
          <div className="mt-3.5">
            <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-[var(--gray-500)]">Atalhos</span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {([
                { label: 'Últimos 7 dias',  kind: 7   },
                { label: 'Últimos 30 dias', kind: 30  },
                { label: 'Este trimestre',  kind: 'quarter' },
              ] as { label: string; kind: 7 | 30 | 'quarter' }[]).map(s => (
                <button
                  key={s.label}
                  onClick={() => applyShortcut(s.kind)}
                  className="text-[11px] font-semibold text-[var(--gray-700)] bg-[rgba(255,255,255,.55)] border border-[rgba(200,200,224,.5)] rounded-full px-3 py-1.5 hover:bg-white hover:text-[var(--gray-900)] hover:border-[var(--gray-400)] transition-all"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 mt-4 pt-3.5 border-t border-[rgba(200,200,224,.4)]">
            <button
              onClick={() => setOpen(false)}
              className="px-3.5 py-2 text-[12.5px] font-semibold text-[var(--gray-600)] hover:text-[var(--gray-900)] hover:bg-[rgba(255,255,255,.6)] rounded-[10px] transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-2 text-[12.5px] font-semibold text-white bg-[var(--gray-900)] rounded-[11px] shadow-[0_4px_14px_rgba(26,26,46,.28)] hover:shadow-[0_8px_20px_rgba(26,26,46,.34)] hover:-translate-y-px transition-all"
            >
              Aplicar período
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Balance hero ─────────────────────────────────────────────────────────────

function BalanceHero({ balance, variation, monthlyEvolution, loading }: {
  balance?:          number
  variation?:        number
  monthlyEvolution:  MonthItem[]
  loading:           boolean
}) {
  const isNeg    = typeof balance === 'number' && balance < 0
  const areaData = monthlyEvolution.map(m => ({ label: m.label, value: m.income - m.expense }))

  return (
    <div className="glass-card p-6 flex flex-col min-h-[210px]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--gray-500)]">Saldo total</p>
          {loading ? (
            <div className="skeleton h-11 w-44 rounded-lg mt-2.5" />
          ) : (
            <div className="mt-2">
              <CurrencyDisplay value={balance ?? 0} type={isNeg ? 'expense' : 'income'} size="xl" />
            </div>
          )}
          {!loading && typeof variation === 'number' && (
            <div className="flex items-center gap-2.5 mt-2.5 flex-wrap">
              <TrendBadge value={variation} />
              <span className="text-[12px] text-[var(--gray-500)]">vs. mês anterior · atualizado hoje</span>
            </div>
          )}
        </div>
        <div
          className="w-[38px] h-[38px] rounded-xl grid place-items-center shrink-0"
          style={{ background: 'rgba(82,183,136,.16)', border: '1px solid rgba(82,183,136,.3)' }}
        >
          <Wallet size={19} className="text-[var(--green-income)]" />
        </div>
      </div>

      {/* Area chart */}
      <div className="mt-auto pt-4">
        {loading ? (
          <div className="skeleton h-24 w-full rounded-xl" />
        ) : areaData.length > 1 ? (
          <>
            <ResponsiveContainer width="100%" height={96}>
              <AreaChart data={areaData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="heroBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--status-income)" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="var(--status-income)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--status-income)"
                  strokeWidth={2.5}
                  fill="url(#heroBalanceGrad)"
                  dot={false}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-between mt-1.5">
              {monthlyEvolution.map(m => (
                <span key={m.label} className="text-[10.5px] font-semibold text-[var(--gray-500)]">{m.label}</span>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

// ─── Period summary ───────────────────────────────────────────────────────────

function PeriodSummary({ summary, monthLabel, loading }: { summary?: Summary; monthLabel: string; loading: boolean }) {
  const savings    = summary && summary.periodIncome > 0
    ? Math.max(0, Math.round((summary.periodBalance / summary.periodIncome) * 100))
    : 0
  const expensePct = summary && summary.periodIncome > 0
    ? Math.min(100, (summary.periodExpense / summary.periodIncome) * 100)
    : 0

  return (
    <div className="glass-card p-5 flex flex-col">
      <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[var(--gray-500)]">Resumo do período</p>
      {loading ? (
        <div className="mt-2 space-y-3">
          <div className="skeleton h-8 w-36 rounded-lg" />
          <div className="skeleton h-3 w-48 rounded" />
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-full rounded" />
        </div>
      ) : (
        <>
          <div className="mt-2">
            <CurrencyDisplay
              value={summary?.periodBalance ?? 0}
              type={(summary?.periodBalance ?? 0) >= 0 ? 'income' : 'expense'}
              size="lg"
            />
          </div>
          <p className="text-[11px] text-[var(--gray-500)] mt-1.5">
            Saldo de {monthLabel} · sobrou {savings}% da renda
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-[9px] h-[9px] rounded-[3px] bg-[var(--status-income)] shrink-0" />
                <span className="text-[12.5px] text-[var(--gray-700)]">Receitas</span>
              </div>
              <span className="text-[13px] font-bold font-[var(--font-mono)] text-[var(--status-income)]">
                {fmt(summary?.periodIncome ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-[9px] h-[9px] rounded-[3px] bg-[var(--status-expense)] shrink-0" />
                <span className="text-[12.5px] text-[var(--gray-700)]">Despesas</span>
              </div>
              <span className="text-[13px] font-bold font-[var(--font-mono)] text-[var(--status-expense)]">
                {fmt(summary?.periodExpense ?? 0)}
              </span>
            </div>
          </div>

          {/* Proportional bar */}
          {(summary?.periodIncome ?? 0) > 0 && (
            <div className="mt-4 h-2 rounded-full bg-[rgba(26,26,46,.07)] overflow-hidden flex">
              <div
                className="h-full bg-[var(--status-expense)] transition-[width] duration-[1100ms] ease-[cubic-bezier(.22,1,.36,1)]"
                style={{ width: `${expensePct.toFixed(1)}%` }}
              />
              <div
                className="h-full bg-[var(--status-income)] opacity-50 transition-[width] duration-[1100ms] ease-[cubic-bezier(.22,1,.36,1)]"
                style={{ width: `${(100 - expensePct).toFixed(1)}%` }}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── KPI card (receitas / despesas) ──────────────────────────────────────────

function KPICard({ label, value, variation, sparkData, type, since, loading }: {
  label:      string
  value?:     number
  variation?: number
  sparkData:  number[]
  type:       'income' | 'expense'
  since:      string
  loading:    boolean
}) {
  const isIncome  = type === 'income'
  const color     = isIncome ? 'var(--status-income)' : 'var(--status-expense)'
  const chipBg    = isIncome ? 'rgba(82,183,136,.16)' : 'rgba(224,122,95,.14)'
  const Icon      = isIncome ? ArrowUpRight : ArrowDownLeft
  const cardClass = isIncome ? 'glass-card-income' : 'glass-card-expense'

  return (
    <div className={cn(cardClass, 'p-5 flex flex-col justify-between min-h-[128px]')}>
      {/* Top: icon + label + trend badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-[34px] h-[34px] rounded-[11px] grid place-items-center shrink-0"
            style={{ background: chipBg }}
          >
            <Icon size={17} style={{ color }} />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[.1em] text-[var(--gray-500)]">{label}</span>
        </div>
        {typeof variation === 'number' && !loading && <TrendBadge value={variation} />}
      </div>

      {/* Bottom: value + sublabel + sparkline */}
      <div className="flex items-end justify-between gap-2">
        <div>
          {loading ? (
            <div className="skeleton h-7 w-28 rounded-lg" />
          ) : (
            <CurrencyDisplay value={value ?? 0} type={type} size="lg" />
          )}
          <p className="text-[10.5px] text-[var(--gray-500)] mt-1">{since}</p>
        </div>
        {!loading && sparkData.length > 1 && (
          <div className="shrink-0 opacity-90">
            <Sparkline data={sparkData} color={color} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Savings card ─────────────────────────────────────────────────────────────

function SavingsCard({ rate, variation, loading }: { rate: number; variation?: number; loading: boolean }) {
  return (
    <div className="glass-card p-5 flex flex-col justify-between min-h-[128px]">
      {/* Top: icon + label + trend badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-[34px] h-[34px] rounded-[11px] grid place-items-center shrink-0"
            style={{ background: 'rgba(123,159,199,.16)' }}
          >
            <PiggyBank size={17} style={{ color: 'var(--status-info)' }} />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[.1em] text-[var(--gray-500)]">Taxa de economia</span>
        </div>
        {typeof variation === 'number' && !loading && <TrendBadge value={variation} />}
      </div>

      {/* Bottom: value + sublabel — mesma estrutura dos KPICards */}
      <div className="flex items-end justify-between gap-2">
        <div>
          {loading ? (
            <div className="skeleton h-7 w-20 rounded-lg" />
          ) : (
            <p className="text-[25px] font-[var(--font-mono)] font-bold text-[var(--gray-900)] leading-none">
              {rate}%
            </p>
          )}
          <p className="text-[10.5px] text-[var(--gray-500)] mt-1">da renda guardada</p>
        </div>
      </div>
    </div>
  )
}

// ─── Donut distribution ───────────────────────────────────────────────────────

function DonutDistrib({ categories, monthLabel, loading }: { categories: CategoryItem[]; monthLabel: string; loading: boolean }) {
  const total = categories.reduce((s, c) => s + c.total, 0)
  const top6  = categories.slice(0, 6)

  return (
    <div className="glass-card flex flex-col overflow-hidden">
      <div className="flex items-start justify-between px-5 py-4 pb-2">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--gray-900)]">Distribuição de gastos</h3>
          <p className="text-[11.5px] text-[var(--gray-500)] mt-0.5">
            {categories.length > 0 ? `${categories.length} categorias · ${monthLabel}` : 'Nenhuma despesa'}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center px-5 pb-5">
        {loading ? (
          <div className="flex flex-col items-center gap-4 w-full py-4">
            <div className="skeleton w-[176px] h-[176px] rounded-full" />
            <div className="grid grid-cols-2 gap-2.5 w-full">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-3 rounded" />
              ))}
            </div>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2 text-[var(--gray-500)]">
            <LucideIcons.PieChart size={32} strokeWidth={1.5} className="text-[var(--gray-300)]" />
            <p className="text-xs">Nenhuma despesa no período</p>
          </div>
        ) : (
          <>
            {/* Donut */}
            <div className="relative w-[176px] h-[176px] my-1.5">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={top6}
                    cx="50%"
                    cy="50%"
                    innerRadius={74}
                    outerRadius={94}
                    paddingAngle={2}
                    dataKey="total"
                    animationDuration={600}
                    animationBegin={0}
                  >
                    {top6.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[9.5px] font-semibold uppercase tracking-[.12em] text-[var(--gray-500)]">Gastos</p>
                <p className="text-[21px] font-[var(--font-mono)] font-bold text-[var(--status-expense)] tabular-nums leading-tight mt-0.5">
                  {fmt(total)}
                </p>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-3.5 gap-y-2.5 w-full mt-2">
              {top6.map(cat => (
                <div key={cat.categoryId ?? cat.name} className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-[9px] h-[9px] rounded-[3px] shrink-0"
                    style={{ background: cat.color }}
                  />
                  <span className="text-[12px] text-[var(--gray-700)] flex-1 truncate">{cat.name}</span>
                  <span className="text-[11.5px] font-bold font-[var(--font-mono)] text-[var(--gray-700)] shrink-0">
                    {cat.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Transaction list ─────────────────────────────────────────────────────────

function TransactionList({ transactions, loading }: { transactions: RecentTransaction[]; loading: boolean }) {
  return (
    <div className="glass-card flex flex-col overflow-hidden">
      <div className="flex items-start justify-between px-5 py-4">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--gray-900)]">Últimas transações</h3>
          <p className="text-[11.5px] text-[var(--gray-500)] mt-0.5">Movimentações recentes</p>
        </div>
        <Link
          href="/transactions"
          className="flex items-center gap-1 text-[12px] font-semibold text-[var(--gray-700)] hover:text-[var(--gray-900)] transition-colors shrink-0"
        >
          Ver todas <ArrowRight size={13} />
        </Link>
      </div>

      <div className="px-2 pb-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[40px_1fr_auto] gap-3 items-center px-3 py-3">
              <div className="skeleton w-10 h-10 rounded-[13px]" />
              <div className="space-y-1.5">
                <div className="skeleton h-3 w-32 rounded" />
                <div className="skeleton h-2.5 w-24 rounded" />
              </div>
              <div className="skeleton h-4 w-16 rounded" />
            </div>
          ))
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2 text-[var(--gray-500)]">
            <Receipt size={32} strokeWidth={1.5} />
            <p className="text-sm">Nenhuma transação ainda</p>
            <Link href="/transactions" className="text-xs font-semibold text-[var(--gray-700)] hover:underline mt-1">
              Adicionar transação
            </Link>
          </div>
        ) : (
          transactions.map(tx => {
            const isIncome = tx.type === 'INCOME'
            const Icon     = tx.category ? getLucideIcon(tx.category.icon) : Tag
            const catColor = tx.category?.color ?? 'var(--gray-400)'
            return (
              <div
                key={tx.id}
                className="grid grid-cols-[40px_1fr_auto] gap-3 items-center px-3 py-2.5 rounded-2xl hover:bg-white/55 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-[13px] grid place-items-center shrink-0"
                  style={{ background: catColor + '1f', border: `1.5px solid ${catColor}` }}
                >
                  <Icon size={18} style={{ color: catColor }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-[var(--gray-900)] truncate">{tx.description}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11.5px] text-[var(--gray-500)]">{tx.category?.name ?? 'Outros'}</span>
                    <span className="w-[3px] h-[3px] rounded-full bg-[var(--gray-400)] shrink-0" />
                    <span className="text-[11.5px] text-[var(--gray-500)]">{formatDate(tx.date)}</span>
                  </div>
                </div>
                <CurrencyDisplay
                  value={tx.amount}
                  type={isIncome ? 'income' : 'expense'}
                  size="sm"
                  showSign
                />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Bar chart card ───────────────────────────────────────────────────────────

function BarTooltip({ active, payload, label }: {
  active?:  boolean
  payload?: { name: string; value: number; color: string }[]
  label?:   string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-4 py-3 text-sm shadow-[0_16px_40px_rgba(26,26,46,0.12)]">
      <p className="font-semibold text-[var(--gray-900)] mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[var(--gray-700)]">{p.name}:</span>
          <span className="font-[var(--font-mono)] font-semibold" style={{ color: p.color }}>
            {fmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function BarChartCard({ data, loading }: { data: MonthItem[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="skeleton h-5 w-44 rounded mb-1" />
        <div className="skeleton h-3.5 w-28 rounded mb-5" />
        <div className="skeleton h-[170px] rounded-xl" />
      </div>
    )
  }

  return (
    <div className="glass-card">
      <div className="flex items-start justify-between px-5 pt-4 pb-0">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--gray-900)]">Receitas e despesas</h3>
          <p className="text-[11.5px] text-[var(--gray-500)] mt-0.5">Últimos 6 meses</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-[var(--status-income)]" />
            <span className="text-[11.5px] font-medium text-[var(--gray-600)]">Receitas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-[var(--status-expense)]" />
            <span className="text-[11.5px] font-medium text-[var(--gray-600)]">Despesas</span>
          </div>
        </div>
      </div>
      <div className="px-5 pb-4 pt-3.5">
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={data} barCategoryGap="30%" barGap={3} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(26,26,46,.07)" strokeDasharray="" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--gray-500)', fontFamily: 'var(--font-inter)', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(200,200,224,.20)', radius: 8 }} />
            <Bar dataKey="income"  name="Receitas" fill="var(--status-income)"  radius={[5, 5, 0, 0]} maxBarSize={15} animationDuration={800} animationBegin={0}   />
            <Bar dataKey="expense" name="Despesas" fill="var(--status-expense)" radius={[5, 5, 0, 0]} maxBarSize={15} animationDuration={800} animationBegin={100} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardClient({ firstName }: { firstName: string }) {
  const searchParams = useSearchParams()
  const view         = (searchParams.get('view') as View) ?? 'all'

  const [period,   setPeriod]   = useState<Period>('month')
  const [fromDate, setFromDate] = useState('')
  const [toDate,   setToDate]   = useState('')
  const [data,     setData]     = useState<DashboardData | null>(null)
  const [loading,  setLoading]  = useState(true)

  const fetchData = useCallback(async () => {
    if (period === 'custom' && !fromDate) return
    setLoading(true)
    try {
      let url = `/api/dashboard?period=${period}&view=${view}`
      if (period === 'custom' && fromDate) {
        url += `&from=${fromDate}&to=${toDate || fromDate}`
      }
      const res  = await fetch(url)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(json.data)
    } catch { /* keep skeleton */ }
    finally  { setLoading(false) }
  }, [period, fromDate, toDate, view])

  useEffect(() => { fetchData() }, [fetchData])

  const s = data?.summary

  const incomeSparkData  = (data?.monthlyEvolution ?? []).map(m => m.income)
  const expenseSparkData = (data?.monthlyEvolution ?? []).map(m => m.expense)
  const savingsRate      = s && s.periodIncome > 0
    ? Math.max(0, Math.round((s.periodBalance / s.periodIncome) * 100))
    : 0
  const monthLabel = getPeriodLabel(period, fromDate)
  const sinceLabel = getPeriodSince(period, fromDate)

  // ── Fatura / extrato view ────────────────────────────────────────────────────
  if (view === 'fatura' || view === 'extrato') {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
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

          <PeriodFilter
            period={period}
            fromDate={fromDate}
            toDate={toDate}
            onPeriod={p => { setPeriod(p); setFromDate(''); setToDate('') }}
            onCustom={(from, to) => { setPeriod('custom'); setFromDate(from); setToDate(to) }}
          />
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

  // ── Default (all) view ───────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] text-[var(--gray-500)] mb-0.5">Olá, {firstName} 👋</p>
          <h1 className="font-[var(--font-display)] font-bold text-[27px] tracking-[-0.02em] text-[var(--gray-900)] leading-tight">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <PeriodFilter
            period={period}
            fromDate={fromDate}
            toDate={toDate}
            onPeriod={p => { setPeriod(p); setFromDate(''); setToDate('') }}
            onCustom={(from, to) => { setPeriod('custom'); setFromDate(from); setToDate(to) }}
          />
          <Link href="/transactions">
            <button className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[13px] text-[13.5px] font-semibold text-white bg-[var(--gray-900)] shadow-[0_3px_10px_rgba(26,26,46,.25)] hover:shadow-[0_8px_20px_rgba(26,26,46,.34)] hover:-translate-y-px transition-all">
              <Plus size={15} />
              Nova transação
            </button>
          </Link>
        </div>
      </div>

      {/* Negative balance alert — RN01 */}
      {!loading && s && s.balance < 0 && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-[14px] bg-[rgba(244,230,226,.7)] border border-[rgba(224,122,95,.4)]">
          <AlertTriangle size={16} className="text-[var(--status-expense)] shrink-0" />
          <span className="text-[13px] font-medium text-[var(--status-expense)]">
            Seu saldo está negativo. Fique atento às despesas!
          </span>
        </div>
      )}

      {/* ROW 1 — hero + summary */}
      <div className="grid grid-cols-1 lg:grid-cols-[2.1fr_1fr] gap-4">
        <BalanceHero
          balance={s?.balance}
          variation={s?.balanceVariation}
          monthlyEvolution={data?.monthlyEvolution ?? []}
          loading={loading}
        />
        <PeriodSummary summary={s} monthLabel={monthLabel} loading={loading} />
      </div>

      {/* ROW 2 — KPIs */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-4">
        <KPICard
          label="Receitas"
          value={s?.periodIncome}
          variation={s?.incomeVariation}
          sparkData={incomeSparkData}
          type="income"
          since={sinceLabel}
          loading={loading}
        />
        <KPICard
          label="Despesas"
          value={s?.periodExpense}
          variation={s?.expenseVariation}
          sparkData={expenseSparkData}
          type="expense"
          since={sinceLabel}
          loading={loading}
        />
        <SavingsCard rate={savingsRate} variation={s?.balanceVariation} loading={loading} />
      </div>

      {/* ROW 3 — donut + transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.45fr] gap-4">
        <DonutDistrib categories={data?.categoryBreakdown ?? []} monthLabel={monthLabel} loading={loading} />
        <TransactionList transactions={data?.recentTransactions ?? []} loading={loading} />
      </div>

      {/* ROW 4 — bar chart */}
      <BarChartCard data={data?.monthlyEvolution ?? []} loading={loading} />
    </div>
  )
}
