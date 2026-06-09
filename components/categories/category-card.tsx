'use client'

import * as LucideIcons from 'lucide-react'
import { Pencil, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { cn } from '@/lib/utils'
import type { CategoryData } from '@/types'

function getLucideIcon(name: string): React.ElementType {
  const pascal = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  return (LucideIcons as unknown as Record<string, React.ElementType>)[pascal] ?? LucideIcons.Tag
}

interface CategoryInsight {
  total:      number
  percentage: number
  count:      number
  trend:      number | null
}

interface CategoryCardProps {
  category:   CategoryData
  insight?:   CategoryInsight
  maxAmount:  number
  onEdit:     () => void
  onDelete?:  () => void
}

function TrendBadge({ trend }: { trend: number | null }) {
  if (trend === null || trend === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[rgba(136,136,170,.14)] text-[var(--gray-500)]">
        —
      </span>
    )
  }
  const up = trend > 0
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full',
      up
        ? 'bg-[rgba(82,183,136,.14)] text-[var(--status-income)]'
        : 'bg-[rgba(244,230,226,.8)] text-[var(--status-expense)]'
    )}>
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {up ? '+' : ''}{trend}%
    </span>
  )
}

export function CategoryCard({ category, insight, maxAmount, onEdit, onDelete }: CategoryCardProps) {
  const Icon    = getLucideIcon(category.icon)
  const total   = insight?.total      ?? 0
  const pct     = insight?.percentage ?? 0
  const count   = insight?.count      ?? category._count?.transactions ?? 0
  const trend   = insight?.trend      ?? null
  const barW    = maxAmount > 0 ? Math.round((total / maxAmount) * 100) : 0

  return (
    <div
      className="glass-card p-[17px] flex flex-col gap-3 group transition-all duration-200 hover:shadow-[0_22px_46px_-18px_rgba(26,26,46,.30)]"
      style={{ transform: 'translateY(0)' }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      {/* Row 1: icon-tile + action buttons */}
      <div className="flex items-start justify-between">
        <div
          className="w-[42px] h-[42px] rounded-[13px] grid place-items-center flex-shrink-0"
          style={{
            background: category.color + '1f',
            border:     `1.5px solid ${category.color}`,
          }}
        >
          <Icon size={20} style={{ color: category.color }} />
        </div>

        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-[180ms]">
          <button
            onClick={onEdit}
            className="w-7 h-7 rounded-[9px] grid place-items-center text-[var(--gray-500)] bg-[rgba(255,255,255,.5)] border border-[rgba(200,200,224,.4)] hover:bg-white hover:text-[var(--gray-900)] transition-colors"
            title="Editar"
          >
            <Pencil size={13} />
          </button>
          {!category.isDefault && onDelete && (
            <button
              onClick={onDelete}
              className="w-7 h-7 rounded-[9px] grid place-items-center text-[var(--gray-500)] bg-[rgba(255,255,255,.5)] border border-[rgba(200,200,224,.4)] hover:bg-[rgba(224,122,95,.12)] hover:text-[var(--status-expense)] transition-colors"
              title="Excluir"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: name + count */}
      <div>
        <p className="text-[14.5px] font-semibold text-[var(--gray-900)]">{category.name}</p>
        <p className="text-[11.5px] text-[var(--gray-500)] mt-[2px]">
          {count} {count === 1 ? 'transação' : 'transações'}
        </p>
      </div>

      {/* Row 3: amount */}
      <CurrencyDisplay value={total} type="expense" size="md" showSymbol />

      {/* Row 4: progress bar */}
      <div className="h-[6px] rounded-full bg-[rgba(26,26,46,.07)] overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-[1.1s] cubic-bezier(.22,1,.36,1)"
          style={{ width: `${barW}%`, background: category.color }}
        />
      </div>

      {/* Row 5: footer */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-[var(--gray-700)] font-[var(--font-mono)]">
          {pct}% do total
        </span>
        <TrendBadge trend={trend} />
      </div>
    </div>
  )
}
