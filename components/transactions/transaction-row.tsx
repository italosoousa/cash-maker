'use client'

import { Pencil, Trash2, RotateCcw } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { TransactionData } from '@/types'

function getLucideIcon(name: string): React.ElementType {
  const pascal = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  return (LucideIcons as unknown as Record<string, React.ElementType>)[pascal] ?? LucideIcons.Tag
}

function formatAmount(amount: number, type: 'INCOME' | 'EXPENSE') {
  const fmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (type === 'INCOME' ? '+' : '-') + ' R$ ' + fmt.format(amount)
}

interface TransactionRowProps {
  transaction: TransactionData
  onEdit:   () => void
  onDelete: () => void
}

export function TransactionRow({ transaction, onEdit, onDelete }: TransactionRowProps) {
  const { type, amount, description, date, category, deletedAt } = transaction
  const isDeleted = !!deletedAt
  const isIncome  = type === 'INCOME'
  const Icon      = category ? getLucideIcon(category.icon) : LucideIcons.Tag

  return (
    <div className={`flex items-center gap-3 py-3 px-4 rounded-xl group transition-all
      ${isDeleted ? 'opacity-45' : 'hover:bg-white/40'}`}>

      {/* Ícone da categoria */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={category
          ? { background: category.color + '22', border: `1.5px solid ${category.color}` }
          : { background: 'var(--green-frost)', border: '1.5px solid var(--glass-border)' }
        }
      >
        <Icon size={16} style={{ color: category?.color ?? 'var(--ink-soft)' }} />
      </div>

      {/* Descrição + categoria + data */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isDeleted ? 'line-through' : 'text-[var(--ink-dark)]'}`}>
          {description}
        </p>
        <p className="text-xs text-[var(--ink-ghost)] mt-0.5 truncate">
          {category?.name} · {formatDate(date)}
        </p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 shrink-0">
        {isDeleted && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-[var(--status-err)]">
            Excluída
          </span>
        )}

        {/* Valor */}
        <span className={`font-[var(--font-mono)] font-bold text-sm tabular-nums
          ${isIncome ? 'text-[var(--status-ok)]' : 'text-[var(--status-err)]'}`}>
          {formatAmount(Number(amount), type)}
        </span>

        {/* Ações — sempre visíveis no mobile, hover no desktop */}
        {!isDeleted && (
          <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ml-1">
            <button
              onClick={onEdit}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--ink-ghost)] hover:bg-[var(--green-frost)] hover:text-[var(--green-deep)] transition-colors"
              title="Editar"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={onDelete}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--ink-ghost)] hover:bg-red-50 hover:text-[var(--status-err)] transition-colors"
              title="Excluir"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}

        {isDeleted && (
          <span title="Excluída (soft delete)"><RotateCcw size={13} className="text-[var(--ink-ghost)] ml-1" /></span>
        )}
      </div>
    </div>
  )
}
