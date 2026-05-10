'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, RefreshCw, TrendingUp, TrendingDown,
  Pencil, Trash2, PowerOff, Power, ChevronDown, ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import * as LucideIcons from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FixedExpenseForm } from '@/components/fixed-expenses/fixed-expense-form'
import type { FixedExpenseData } from '@/types'

function getLucideIcon(name: string): React.ElementType {
  const pascal = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  return (LucideIcons as unknown as Record<string, React.ElementType>)[pascal] ?? LucideIcons.Tag
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

const FREQ_LABEL: Record<string, string> = {
  DAILY:   'Diário',
  WEEKLY:  'Semanal',
  MONTHLY: 'Mensal',
  YEARLY:  'Anual',
}

const FREQ_BADGE_COLOR: Record<string, string> = {
  DAILY:   'bg-purple-100 text-purple-700',
  WEEKLY:  'bg-blue-100 text-blue-700',
  MONTHLY: 'bg-[var(--gray-200)] text-[var(--gray-700)]',
  YEARLY:  'bg-amber-100 text-amber-700',
}

export default function FixedExpensesPage() {
  const [items, setItems]           = useState<FixedExpenseData[]>([])
  const [loading, setLoading]       = useState(true)
  const [formOpen, setFormOpen]     = useState(false)
  const [editing, setEditing]       = useState<FixedExpenseData | null>(null)
  const [deleting, setDeleting]     = useState<FixedExpenseData | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [toggleLoading, setToggleLoading] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/fixed-expenses')
      const json = await res.json()
      setItems(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(fe: FixedExpenseData) { setEditing(fe); setFormOpen(true) }

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      const res  = await fetch(`/api/fixed-expenses/${deleting.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Erro ao excluir'); return }
      toast.success('Gasto fixo excluído')
      setDeleting(null)
      load()
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleToggle(fe: FixedExpenseData) {
    setToggleLoading(fe.id)
    try {
      const res  = await fetch(`/api/fixed-expenses/${fe.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !fe.isActive }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Erro ao atualizar'); return }
      toast.success(fe.isActive ? 'Gasto fixo pausado' : 'Gasto fixo ativado')
      load()
    } finally {
      setToggleLoading(null)
    }
  }

  const active   = items.filter(i => i.isActive)
  const inactive = items.filter(i => !i.isActive)

  // Totais mensais estimados dos ativos
  const monthlyExpense = active
    .filter(i => i.type === 'EXPENSE')
    .reduce((s, i) => {
      const multiplier = { DAILY: 30, WEEKLY: 4.33, MONTHLY: 1, YEARLY: 1 / 12 }[i.frequency] ?? 1
      return s + Number(i.amount) * multiplier
    }, 0)

  const monthlyIncome = active
    .filter(i => i.type === 'INCOME')
    .reduce((s, i) => {
      const multiplier = { DAILY: 30, WEEKLY: 4.33, MONTHLY: 1, YEARLY: 1 / 12 }[i.frequency] ?? 1
      return s + Number(i.amount) * multiplier
    }, 0)

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--gray-900)] font-[var(--font-space-grotesk)]">
            Gastos Fixos
          </h1>
          <p className="text-sm text-[var(--gray-500)] mt-0.5">
            {active.length} ativo{active.length !== 1 ? 's' : ''}
            {inactive.length > 0 && ` · ${inactive.length} pausado${inactive.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={openCreate} className="auth-btn px-4 py-2 text-sm gap-1.5 shrink-0">
          <Plus size={16} />
          Novo
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        {[
          {
            label:  'Despesas/mês',
            value:  monthlyExpense,
            icon:   TrendingDown,
            color:  'var(--status-expense)',
            note:   'estimado',
          },
          {
            label:  'Receitas/mês',
            value:  monthlyIncome,
            icon:   TrendingUp,
            color:  'var(--status-income)',
            note:   'estimado',
          },
          {
            label:  'Saldo fixo/mês',
            value:  monthlyIncome - monthlyExpense,
            icon:   RefreshCw,
            color:  monthlyIncome >= monthlyExpense ? 'var(--status-income)' : 'var(--status-expense)',
            note:   'estimado',
          },
        ].map(({ label, value, icon: Icon, color, note }) => (
          <div key={label} className="glass-card px-3 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: color + '22' }}
            >
              <Icon size={16} style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-[var(--gray-500)]">{label}</p>
              <p className="font-[var(--font-mono)] font-bold text-sm sm:text-base truncate" style={{ color }}>
                {formatCurrency(value)}
              </p>
              <p className="text-[9px] text-[var(--gray-400)] leading-none mt-0.5 hidden sm:block">{note}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lista ativos */}
      <div className="glass-card overflow-hidden mb-4">
        {loading ? (
          <div className="divide-y divide-[var(--gray-300)]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-4 px-4">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-36 rounded" />
                  <div className="skeleton h-2.5 w-24 rounded" />
                </div>
                <div className="skeleton h-4 w-20 rounded" />
              </div>
            ))}
          </div>
        ) : active.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-[var(--gray-500)]">
            <RefreshCw size={32} className="opacity-40" />
            <p className="text-sm">Nenhum gasto fixo ativo</p>
            <button onClick={openCreate} className="text-xs text-[var(--gray-700)] hover:underline">
              Criar primeiro gasto fixo
            </button>
          </div>
        ) : (
          <>
            <div className="px-4 py-2.5 border-b border-[var(--gray-300)] bg-[var(--gray-100)]/60">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-500)]">Ativos</p>
            </div>
            <div className="divide-y divide-[var(--gray-300)]">
              {active.map(fe => (
                <FixedExpenseRow
                  key={fe.id}
                  fe={fe}
                  toggleLoading={toggleLoading}
                  onEdit={() => openEdit(fe)}
                  onDelete={() => setDeleting(fe)}
                  onToggle={() => handleToggle(fe)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Lista inativos (colapsável) */}
      {!loading && inactive.length > 0 && (
        <div className="glass-card overflow-hidden">
          <button
            onClick={() => setShowInactive(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[var(--gray-500)] hover:bg-[var(--gray-100)] transition-colors"
          >
            <span className="flex items-center gap-2">
              <PowerOff size={14} />
              Pausados ({inactive.length})
            </span>
            {showInactive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showInactive && (
            <div className="divide-y divide-[var(--gray-300)] border-t border-[var(--gray-300)]">
              {inactive.map(fe => (
                <FixedExpenseRow
                  key={fe.id}
                  fe={fe}
                  toggleLoading={toggleLoading}
                  onEdit={() => openEdit(fe)}
                  onDelete={() => setDeleting(fe)}
                  onToggle={() => handleToggle(fe)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form sheet */}
      <FixedExpenseForm
        open={formOpen}
        onOpenChange={setFormOpen}
        fixedExpense={editing}
        onSuccess={load}
      />

      {/* Confirm delete */}
      <AlertDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <AlertDialogContent className="glass-card border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--gray-900)]">Excluir gasto fixo?</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--gray-500)]">
              <strong>{deleting?.name}</strong> será removido permanentemente.
              As transações já geradas por ele <strong>não serão excluídas</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[var(--gray-300)]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-[var(--status-expense)] hover:bg-red-600 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FAB mobile */}
      <button
        onClick={openCreate}
        className="fixed bottom-20 right-4 md:hidden w-14 h-14 rounded-full bg-[var(--gray-900)] text-white shadow-lg shadow-black/20 flex items-center justify-center hover:bg-[var(--gray-800)] transition-colors z-30"
      >
        <Plus size={24} />
      </button>
    </>
  )
}

// ── Row component ────────────────────────────────────────────────────────────

interface RowProps {
  fe: FixedExpenseData
  toggleLoading: string | null
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}

function FixedExpenseRow({ fe, toggleLoading, onEdit, onDelete, onToggle }: RowProps) {
  const Icon       = fe.category ? getLucideIcon(fe.category.icon) : RefreshCw
  const iconColor  = fe.category?.color ?? 'var(--gray-400)'
  const isIncome   = fe.type === 'INCOME'
  const valueColor = isIncome ? 'var(--status-income)' : 'var(--status-expense)'
  const isLoading  = toggleLoading === fe.id

  return (
    <div className={`flex items-center gap-3 py-3 px-4 hover:bg-[var(--gray-100)] transition-colors ${!fe.isActive ? 'opacity-60' : ''}`}>
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconColor + '22' }}
      >
        <Icon size={18} style={{ color: iconColor }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--gray-900)] truncate">{fe.name}</p>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${FREQ_BADGE_COLOR[fe.frequency]}`}>
            {FREQ_LABEL[fe.frequency]}
          </span>
          {fe.category && (
            <span className="text-[10px] text-[var(--gray-500)]">{fe.category.name}</span>
          )}
          <span className="text-[10px] text-[var(--gray-400)]">
            próx. {formatDate(fe.nextDueDate)}
          </span>
        </div>
      </div>

      {/* Value */}
      <div className="text-right shrink-0 mr-2">
        <p
          className="font-[var(--font-mono)] font-bold text-sm"
          style={{ color: valueColor }}
        >
          {isIncome ? '+' : '-'}{formatCurrency(Number(fe.amount))}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={onToggle}
          disabled={isLoading}
          title={fe.isActive ? 'Pausar' : 'Ativar'}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--gray-400)] hover:text-[var(--gray-700)] hover:bg-[var(--gray-200)] transition-colors disabled:opacity-50"
        >
          {fe.isActive
            ? <PowerOff size={14} />
            : <Power size={14} className="text-[var(--status-income)]" />}
        </button>
        <button
          onClick={onEdit}
          title="Editar"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--gray-400)] hover:text-[var(--gray-700)] hover:bg-[var(--gray-200)] transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          title="Excluir"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--gray-400)] hover:text-[var(--status-expense)] hover:bg-[var(--gray-200)] transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
