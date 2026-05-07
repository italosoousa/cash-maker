'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

interface MonthData {
  label:   string
  income:  number
  expense: number
}

interface BalanceChartProps {
  data: MonthData[]
}

function formatBRL(value: number) {
  return 'R$ ' + new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function CustomTooltip({ active, payload, label }: {
  active?:  boolean
  payload?: { name: string; value: number; color: string }[]
  label?:   string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="glass-card px-4 py-3 text-sm shadow-[0_16px_40px_rgba(45,106,79,0.14)]">
      <p className="font-semibold text-[var(--ink-dark)] mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-[var(--ink-mid)]">{p.name}:</span>
          <span className="font-[var(--font-mono)] font-semibold" style={{ color: p.color }}>
            {formatBRL(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function CustomLegend() {
  return (
    <div className="flex items-center justify-center gap-6 mt-2">
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm" style={{ background: 'var(--status-ok)' }} />
        <span className="text-xs text-[var(--ink-soft)] font-medium">Receitas</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm" style={{ background: 'var(--status-err)' }} />
        <span className="text-xs text-[var(--ink-soft)] font-medium">Despesas</span>
      </div>
    </div>
  )
}

export function BalanceChart({ data }: BalanceChartProps) {
  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--ink-dark)]">Evolução Mensal</h3>
        <p className="text-xs text-[var(--ink-ghost)] mt-0.5">Últimos 6 meses</p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap="30%" barGap={4}>
          <CartesianGrid
            vertical={false}
            stroke="var(--green-mist)"
            strokeOpacity={0.5}
            strokeDasharray="4 4"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--ink-ghost)', fontFamily: 'var(--font-inter)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--ink-ghost)', fontFamily: 'var(--font-inter)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => v === 0 ? '0' : 'R$ ' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)}
            width={56}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(183,228,199,0.15)', radius: 8 }}
          />
          <Bar
            dataKey="income"
            name="Receitas"
            fill="var(--status-ok)"
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
            animationDuration={600}
            animationBegin={0}
          />
          <Bar
            dataKey="expense"
            name="Despesas"
            fill="var(--status-err)"
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
            animationDuration={600}
            animationBegin={100}
          />
          <Legend content={<CustomLegend />} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
