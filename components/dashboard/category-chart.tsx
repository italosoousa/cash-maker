'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import * as LucideIcons from 'lucide-react'

interface CategoryItem {
  categoryId:  string | null
  name:        string
  icon:        string
  color:       string
  total:       number
  percentage:  number
}

interface CategoryChartProps {
  data: CategoryItem[]
}

function getLucideIcon(name: string): React.ElementType {
  const pascal = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  return (LucideIcons as unknown as Record<string, React.ElementType>)[pascal] ?? LucideIcons.Tag
}

function formatBRL(value: number) {
  return 'R$ ' + new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function CustomTooltip({ active, payload }: {
  active?:  boolean
  payload?: { name: string; value: number; payload: CategoryItem }[]
}) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload

  return (
    <div className="glass-card px-3 py-2 text-xs shadow-[0_16px_40px_rgba(45,106,79,0.14)]">
      <p className="font-semibold text-[var(--ink-dark)]">{item.name}</p>
      <p className="font-[var(--font-mono)] font-bold mt-0.5" style={{ color: item.color }}>
        {formatBRL(item.total)}
      </p>
      <p className="text-[var(--ink-ghost)]">{item.percentage}% do total</p>
    </div>
  )
}

export function CategoryChart({ data }: CategoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="glass-card p-5 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--ink-dark)]">Despesas por Categoria</h3>
          <p className="text-xs text-[var(--ink-ghost)] mt-0.5">No período selecionado</p>
        </div>
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <LucideIcons.PieChart size={32} className="text-[var(--ink-ghost)]" strokeWidth={1.5} />
          <p className="text-xs text-[var(--ink-ghost)]">Nenhuma despesa no período</p>
        </div>
      </div>
    )
  }

  const top = data.slice(0, 5)

  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--ink-dark)]">Despesas por Categoria</h3>
        <p className="text-xs text-[var(--ink-ghost)] mt-0.5">No período selecionado</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="shrink-0">
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie
                data={top}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={64}
                paddingAngle={3}
                dataKey="total"
                animationDuration={500}
                animationBegin={0}
              >
                {top.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <ul className="flex flex-col gap-2 flex-1 min-w-0">
          {top.map(item => {
            const Icon = getLucideIcon(item.icon)
            return (
              <li key={item.categoryId ?? item.name} className="flex items-center gap-2 min-w-0">
                <div
                  className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center"
                  style={{ background: item.color + '22' }}
                >
                  <Icon size={12} style={{ color: item.color }} />
                </div>
                <span className="text-xs text-[var(--ink-mid)] truncate flex-1">{item.name}</span>
                <div className="text-right shrink-0">
                  <p className="text-xs font-[var(--font-mono)] font-semibold text-[var(--ink-dark)]">
                    {formatBRL(item.total)}
                  </p>
                  <p className="text-[10px] text-[var(--ink-ghost)]">{item.percentage}%</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
