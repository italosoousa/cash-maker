'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingDown, ArrowRight, Tag, Receipt, Search } from 'lucide-react'
import Link from 'next/link'
import * as LucideIcons from 'lucide-react'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { cn, formatDate }   from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type Period = 'today' | 'week' | 'month' | 'year' | 'custom'

interface MonthItem { label: string; income: number; expense: number }

interface RecentTransaction {
  id:          string
  type:        'INCOME' | 'EXPENSE'
  amount:      number
  description: string
  date:        string
  category?: { id: string; name: string; icon: string; color: string } | null
}

interface Summary {
  balance:          number
  periodIncome:     number
  periodExpense:    number
  periodBalance:    number
  incomeVariation:  number
  expenseVariation: number
}

interface BankData {
  bank:             string
  totalAmount:      number
  transactionCount: number
  lastDate:         string | null
}

// ── Config dos bancos conhecidos ───────────────────────────────────────────────

const KNOWN_BANKS: {
  id:        string
  name:      string
  color:     string
  available: boolean
}[] = [
  { id: 'nubank',    name: 'Nubank',          color: '#8A05BE', available: true  },
  { id: 'bb',        name: 'Banco do Brasil',  color: '#FDCE2A', available: false },
  { id: 'picpay',    name: 'PicPay',           color: '#11C76F', available: false },
  { id: 'bradesco',  name: 'Bradesco',         color: '#CC092F', available: false },
  { id: 'santander', name: 'Santander',        color: '#EC0000', available: false },
  { id: 'c6',        name: 'C6 Bank',          color: '#242424', available: false },
  { id: 'sicoob',    name: 'Sicoob',           color: '#006937', available: false },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function getLucideIcon(name: string): React.ElementType {
  const pascal = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  return (LucideIcons as unknown as Record<string, React.ElementType>)[pascal] ?? LucideIcons.Tag
}

// ── Custom Tooltip do gráfico ──────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number; name: string }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-[var(--gray-200)] rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-[var(--gray-700)] mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="text-[var(--status-expense)]">{fmt(p.value)}</p>
      ))}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

interface Props {
  period:         Period
  summary?:       Summary
  monthlyData:    MonthItem[]
  transactions:   RecentTransaction[]
  loading:        boolean
  importFrom:     'fatura' | 'extrato'
}

export function DashboardFatura({
  period, summary, monthlyData, transactions, loading, importFrom,
}: Props) {
  const [banks,         setBanks]         = useState<BankData[]>([])
  const [banksLoading,  setBanksLoading]  = useState(true)
  const [txSearch,      setTxSearch]      = useState('')

  const fetchBanks = useCallback(async () => {
    setBanksLoading(true)
    try {
      const res  = await fetch(`/api/dashboard/banks?importFrom=${importFrom}`)
      const json = await res.json()
      setBanks(json.data ?? [])
    } finally {
      setBanksLoading(false)
    }
  }, [importFrom])

  useEffect(() => { fetchBanks() }, [fetchBanks])

  const filteredTx = txSearch
    ? transactions.filter(tx =>
        tx.description.toLowerCase().includes(txSearch.toLowerCase())
      )
    : transactions

  // Summary stats bar
  const stats = [
    { label: 'Gasto no período',  value: summary?.periodExpense ?? 0, color: 'var(--status-expense)' },
    { label: 'Saldo do período',  value: summary?.periodBalance ?? 0,
      color: (summary?.periodBalance ?? 0) >= 0 ? 'var(--status-income)' : 'var(--status-expense)' },
    { label: 'Total importado',   value: summary?.balance ?? 0, color: 'var(--gray-900)' },
  ]

  const title = importFrom === 'fatura' ? 'Cartão de Crédito' : 'Extrato Bancário'

  return (
    <div className="space-y-5">

      {/* ── Summary stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className="glass-card px-4 py-3">
            <p className="text-[11px] text-[var(--gray-500)] font-medium mb-1">{s.label}</p>
            {loading
              ? <div className="skeleton h-6 w-28 rounded" />
              : <p className="font-[var(--font-mono)] font-bold text-base" style={{ color: s.color }}>
                  {fmt(s.value)}
                </p>
            }
          </div>
        ))}
      </div>

      {/* ── Main two-column area ───────────────────────────────── */}
      <div className="flex gap-4 items-start">

        {/* Left: bar chart */}
        <div className="flex-1 min-w-0 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--gray-900)]">Gastos Mensais</h3>
              <p className="text-xs text-[var(--gray-500)] mt-0.5">Últimos 6 meses</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--gray-500)]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[var(--status-expense)] inline-block" />
              Despesas
            </div>
          </div>

          {loading ? (
            <div className="skeleton h-52 rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barSize={28} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--gray-400)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10, fill: 'var(--gray-400)' }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 6 }} />
                <Bar
                  dataKey="expense"
                  name="Despesas"
                  fill="var(--status-expense)"
                  radius={[5, 5, 0, 0]}
                  opacity={0.85}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Right: Meus Bancos */}
        <div className="w-[260px] shrink-0 glass-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--gray-300)]">
            <div>
              <h3 className="text-sm font-bold text-[var(--gray-900)]">Meus Bancos</h3>
              <p className="text-[11px] text-[var(--gray-500)] mt-0.5">
                {banksLoading ? '…' : `${banks.length} com dados`}
              </p>
            </div>
            <Link
              href="/importar"
              className="text-[11px] font-semibold text-[var(--gray-600)] hover:text-[var(--gray-900)] transition-colors"
            >
              + Importar
            </Link>
          </div>

          {/* Bank list */}
          <div className="divide-y divide-[var(--gray-300)]">
            {KNOWN_BANKS.map(kb => {
              const data    = banks.find(b => b.bank === kb.id)
              const hasData = !!data

              return (
                <div
                  key={kb.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 transition-colors',
                    !kb.available && 'opacity-45',
                    kb.available && hasData && 'hover:bg-[var(--gray-100)]'
                  )}
                >
                  {/* Bank avatar */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white text-[11px] font-bold"
                    style={{ background: kb.color }}
                  >
                    {kb.name.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--gray-900)] truncate">{kb.name}</p>
                    {banksLoading && kb.available ? (
                      <div className="skeleton h-2.5 w-20 rounded mt-0.5" />
                    ) : hasData ? (
                      <p className="text-[10px] text-[var(--gray-500)]">
                        {data!.transactionCount} transações · {fmt(data!.totalAmount)}
                      </p>
                    ) : (
                      <p className="text-[10px] text-[var(--gray-400)]">
                        {kb.available ? 'Nenhum dado' : 'Em breve'}
                      </p>
                    )}
                  </div>

                  {/* Badge */}
                  {hasData ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[rgba(82,183,136,0.15)] text-[var(--status-income)] uppercase tracking-wide shrink-0">
                      Ativo
                    </span>
                  ) : kb.available ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--gray-200)] text-[var(--gray-500)] uppercase tracking-wide shrink-0">
                      Vazio
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--gray-200)] text-[var(--gray-400)] uppercase tracking-wide shrink-0">
                      Breve
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Transactions ──────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--gray-300)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--gray-900)]">Transações</h3>
            <p className="text-xs text-[var(--gray-500)] mt-0.5">{title}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--gray-400)] pointer-events-none" />
              <input
                value={txSearch}
                onChange={e => setTxSearch(e.target.value)}
                placeholder="Buscar…"
                className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-[var(--gray-300)] bg-white/80 text-[var(--gray-900)] placeholder:text-[var(--gray-400)] outline-none focus:border-[var(--gray-500)] w-40 transition-colors"
              />
            </div>
            <Link
              href="/transactions"
              className="flex items-center gap-1 text-xs font-semibold text-[var(--gray-700)] hover:text-[var(--gray-900)] transition-colors"
            >
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Column headers */}
        <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-x-6 px-5 py-2.5 border-b border-[var(--gray-300)]/60 bg-[var(--gray-100)]/60">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gray-500)]">Descrição</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gray-500)]">Categoria</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gray-500)]">Data</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--gray-500)] text-right">Valor</p>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="divide-y divide-[var(--gray-300)]/40">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-6 items-center px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="skeleton w-8 h-8 rounded-xl shrink-0" />
                  <div className="skeleton h-3 w-36 rounded" />
                </div>
                <div className="skeleton h-3 w-20 rounded hidden sm:block" />
                <div className="skeleton h-3 w-16 rounded hidden sm:block" />
                <div className="skeleton h-3 w-20 rounded justify-self-end" />
              </div>
            ))}
          </div>
        ) : filteredTx.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-[var(--gray-500)]">
            <Receipt size={28} strokeWidth={1.5} />
            <p className="text-sm">
              {txSearch ? 'Nenhuma transação encontrada' : `Nenhuma transação de ${title.toLowerCase()}`}
            </p>
            {!txSearch && (
              <Link href="/importar" className="text-xs font-semibold text-[var(--gray-700)] hover:underline mt-1">
                Importar planilha
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--gray-300)]/40">
            {filteredTx.map(tx => {
              const isIncome = tx.type === 'INCOME'
              const Icon     = tx.category ? getLucideIcon(tx.category.icon) : Tag

              return (
                <div
                  key={tx.id}
                  className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] gap-x-6 items-center px-5 py-3.5 hover:bg-[var(--gray-100)] transition-colors"
                >
                  {/* Description */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={tx.category
                        ? { background: tx.category.color + '22', border: `1.5px solid ${tx.category.color}` }
                        : { background: 'var(--gray-100)', border: '1.5px solid var(--gray-300)' }
                      }
                    >
                      <Icon size={13} style={{ color: tx.category?.color ?? 'var(--gray-500)' }} />
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
    </div>
  )
}
