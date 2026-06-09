'use client'

import { PieChart, Pie, Cell } from 'recharts'
import { ArrowDownLeft, ArrowUpRight, Crown, Receipt } from 'lucide-react'
import { CurrencyDisplay } from '@/components/shared/currency-display'

export interface CategoryBreakdownEntry {
  categoryId: string | null
  name:       string
  icon:       string
  color:      string
  isDefault:  boolean
  total:      number
  percentage: number
  count:      number
  trend:      number | null
}

export interface CategoryKpis {
  totalExpense:  number
  totalIncome:   number
  topCategory:   { name: string; percentage: number } | null
  avgTicket:     number
}

interface CategoryInsightsProps {
  breakdown: CategoryBreakdownEntry[]
  kpis:      CategoryKpis
  period:    string
  loading?:  boolean
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({
  label, chipBg, chipIcon: ChipIcon, chipColor, value, loading,
}: {
  label:     string
  chipBg:    string
  chipIcon:  React.ElementType
  chipColor: string
  value:     React.ReactNode
  loading?:  boolean
}) {
  return (
    <div className="glass-card p-4 flex flex-col gap-1.5">
      {/* label row */}
      <div className="flex items-center gap-[7px]">
        <span
          className="w-[26px] h-[26px] rounded-[9px] grid place-items-center flex-shrink-0"
          style={{ background: chipBg }}
        >
          <ChipIcon size={14} style={{ color: chipColor }} />
        </span>
        <span className="text-[10.5px] font-semibold uppercase tracking-[.12em] text-[var(--gray-500)]">
          {label}
        </span>
      </div>
      {/* value */}
      <div className="text-[var(--gray-900)]">
        {loading ? (
          <div className="skeleton h-6 w-28 rounded" />
        ) : (
          value
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CategoryInsights({ breakdown, kpis, period, loading }: CategoryInsightsProps) {
  const donutData  = breakdown.slice(0, 8)

  // Month name for subtitle
  const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' })

  return (
    <div className="grid gap-[18px] mb-[18px]" style={{ gridTemplateColumns: '300px 1fr' }}>

      {/* ── Donut card ──────────────────────────────────────── */}
      <div className="glass-card p-5 flex flex-col items-center gap-1.5">
        <div className="self-start">
          <h3 className="text-[13px] font-semibold text-[var(--gray-900)]">Distribuição</h3>
          <p className="text-[11.5px] text-[var(--gray-500)] mt-[1px]">
            {breakdown.length} {breakdown.length === 1 ? 'categoria' : 'categorias'} · {monthName}
          </p>
        </div>

        {/* Donut with center overlay */}
        <div className="relative mt-2" style={{ width: 188, height: 188 }}>
          {loading ? (
            <div className="skeleton w-full h-full rounded-full" style={{ borderRadius: '50%' }} />
          ) : donutData.length > 0 ? (
            <>
              <PieChart width={188} height={188}>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={74}
                  outerRadius={94}
                  paddingAngle={0}
                  dataKey="total"
                  animationDuration={700}
                  animationBegin={0}
                >
                  {donutData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
              </PieChart>
              {/* Center overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--gray-500)]">
                  Total
                </span>
                <CurrencyDisplay
                  value={kpis.totalExpense}
                  type="expense"
                  size="md"
                  showSymbol
                  className="mt-1"
                />
              </div>
            </>
          ) : (
            <div className="w-full h-full rounded-full border-[20px] border-[rgba(26,26,46,.06)] flex items-center justify-center">
              <span className="text-[11px] text-[var(--gray-400)] text-center px-4">Sem despesas</span>
            </div>
          )}
        </div>
      </div>

      {/* ── KPIs 2×2 ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-[14px] content-start">
        <KpiCard
          label="Despesas"
          chipBg="rgba(224,122,95,.14)"
          chipIcon={ArrowDownLeft}
          chipColor="#E07A5F"
          loading={loading}
          value={
            <CurrencyDisplay value={kpis.totalExpense} type="expense" size="md" showSymbol />
          }
        />
        <KpiCard
          label="Receitas"
          chipBg="rgba(82,183,136,.16)"
          chipIcon={ArrowUpRight}
          chipColor="#52B788"
          loading={loading}
          value={
            <CurrencyDisplay value={kpis.totalIncome} type="income" size="md" showSymbol />
          }
        />
        <KpiCard
          label="Maior gasto"
          chipBg="rgba(69,123,157,.16)"
          chipIcon={Crown}
          chipColor="#457B9D"
          loading={loading}
          value={
            kpis.topCategory ? (
              <span className="text-[17px] font-bold text-[var(--gray-900)] font-[var(--font-space-grotesk)]">
                {kpis.topCategory.name}
                <span className="text-[12px] font-medium text-[var(--gray-500)] ml-1">
                  · {kpis.topCategory.percentage}%
                </span>
              </span>
            ) : (
              <span className="text-[var(--gray-400)] text-sm">—</span>
            )
          }
        />
        <KpiCard
          label="Ticket médio"
          chipBg="rgba(136,136,170,.16)"
          chipIcon={Receipt}
          chipColor="#8888AA"
          loading={loading}
          value={
            <CurrencyDisplay value={kpis.avgTicket} type="neutral" size="md" showSymbol />
          }
        />
      </div>

    </div>
  )
}
