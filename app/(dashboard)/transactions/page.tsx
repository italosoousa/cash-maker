'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Filter, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { TransactionRow }  from '@/components/transactions/transaction-row'
import type { TransactionData, CategoryData } from '@/types'

const TYPE_OPTIONS = [
  { value: 'ALL',     label: 'Todas' },
  { value: 'INCOME',  label: 'Receitas' },
  { value: 'EXPENSE', label: 'Despesas' },
] as const

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

interface PaginatedResult {
  items: TransactionData[]
  total: number
  totalPages: number
  page: number
}

export default function TransactionsPage() {
  const [data, setData]             = useState<PaginatedResult | null>(null)
  const [loading, setLoading]       = useState(true)
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [formOpen, setFormOpen]     = useState(false)
  const [editing, setEditing]       = useState<TransactionData | null>(null)
  const [deleting, setDeleting]     = useState<TransactionData | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Filtros
  const [type, setType]             = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')
  const [categoryId, setCategoryId] = useState('')
  const [startDate, setStartDate]   = useState('')
  const [endDate, setEndDate]       = useState('')
  const [page, setPage]             = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(j => setCategories(j.data ?? []))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (type !== 'ALL') params.set('type', type)
      if (categoryId) params.set('categoryId', categoryId)
      if (startDate)  params.set('startDate', new Date(startDate + 'T00:00:00').toISOString())
      if (endDate)    params.set('endDate',   new Date(endDate   + 'T23:59:59').toISOString())

      const res  = await fetch(`/api/transactions?${params}`)
      const json = await res.json()
      setData(json.data)
    } finally {
      setLoading(false)
    }
  }, [type, categoryId, startDate, endDate, page])

  useEffect(() => { load() }, [load])

  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(tx: TransactionData) { setEditing(tx); setFormOpen(true) }
  function handleFormSuccess() { load() }

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      const res  = await fetch(`/api/transactions/${deleting.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Erro ao excluir'); return }
      toast.success('Transação excluída')
      setDeleting(null)
      load()
    } finally {
      setDeleteLoading(false)
    }
  }

  function clearFilters() {
    setType('ALL'); setCategoryId(''); setStartDate(''); setEndDate(''); setPage(1)
  }

  const hasFilters = type !== 'ALL' || categoryId || startDate || endDate
  const items = data?.items ?? []

  // Totais dos itens carregados
  const totalIncome  = items.filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = items.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--green-deep)] font-[var(--font-space-grotesk)]">
            Transações
          </h1>
          <p className="text-sm text-[var(--ink-soft)] mt-0.5">
            {data ? `${data.total} transação${data.total !== 1 ? 'ões' : ''}` : '...'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors
              ${showFilters || hasFilters
                ? 'bg-[var(--green-frost)] border-[var(--green-mid)] text-[var(--green-deep)]'
                : 'border-[var(--glass-border)] text-[var(--ink-soft)] hover:bg-[var(--green-frost)]'}`}
          >
            <Filter size={15} />
            <span className="hidden xs:inline">Filtros</span>
            {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-[var(--green-mid)]" />}
          </button>
          <button onClick={openCreate} className="auth-btn px-4 py-2 text-sm gap-1.5">
            <Plus size={16} />
            Nova
          </button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
        {[
          { label: 'Receitas',  value: totalIncome,           icon: TrendingUp,   color: 'var(--status-ok)' },
          { label: 'Despesas',  value: totalExpense,          icon: TrendingDown, color: 'var(--status-err)' },
          { label: 'Resultado', value: totalIncome - totalExpense, icon: Wallet, color: totalIncome >= totalExpense ? 'var(--status-ok)' : 'var(--status-err)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card px-3 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '22' }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-[var(--ink-ghost)]">{label}</p>
              <p className="font-[var(--font-mono)] font-bold text-sm sm:text-base truncate" style={{ color }}>
                {formatCurrency(value)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Painel de filtros */}
      {showFilters && (
        <div className="glass-card p-4 mb-4 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-3 animate-dialog">
          {/* Tipo */}
          <div className="space-y-1">
            <label className="auth-label">Tipo</label>
            <div className="flex gap-1">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setType(opt.value); setPage(1) }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${type === opt.value
                      ? 'bg-[var(--green-mid)] text-white'
                      : 'bg-white/50 text-[var(--ink-soft)] hover:bg-[var(--green-frost)]'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Categoria */}
          <div className="space-y-1">
            <label className="auth-label">Categoria</label>
            <select
              value={categoryId}
              onChange={e => { setCategoryId(e.target.value); setPage(1) }}
              className="auth-input py-1.5 text-xs"
            >
              <option value="">Todas</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Data início */}
          <div className="space-y-1">
            <label className="auth-label">De</label>
            <input type="date" value={startDate}
              onChange={e => { setStartDate(e.target.value); setPage(1) }}
              className="auth-input py-1.5 text-xs" />
          </div>

          {/* Data fim */}
          <div className="space-y-1">
            <label className="auth-label">Até</label>
            <input type="date" value={endDate}
              onChange={e => { setEndDate(e.target.value); setPage(1) }}
              className="auth-input py-1.5 text-xs" />
          </div>

          {hasFilters && (
            <button onClick={clearFilters}
              className="col-span-full text-xs text-[var(--status-err)] hover:underline text-left">
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Lista */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[var(--glass-border)]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3 px-4">
                <div className="skeleton w-9 h-9 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-44 rounded" />
                  <div className="skeleton h-2.5 w-28 rounded" />
                </div>
                <div className="skeleton h-4 w-24 rounded" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-[var(--ink-ghost)]">
            <Wallet size={32} className="opacity-40" />
            <p className="text-sm">Nenhuma transação encontrada</p>
            <button onClick={openCreate} className="text-xs text-[var(--green-mid)] hover:underline">
              Criar primeira transação
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--glass-border)]">
            {items.map(tx => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                onEdit={() => openEdit(tx)}
                onDelete={() => setDeleting(tx)}
              />
            ))}
          </div>
        )}

        {/* Paginação */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--glass-border)]">
            <p className="text-xs text-[var(--ink-ghost)]">
              Página {data.page} de {data.totalPages} · {data.total} itens
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--ink-soft)] hover:bg-[var(--green-frost)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--ink-soft)] hover:bg-[var(--green-frost)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form sheet */}
      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
        onSuccess={handleFormSuccess}
      />

      {/* Confirm delete */}
      <AlertDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <AlertDialogContent className="glass-card border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--ink-dark)]">Excluir transação?</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--ink-soft)]">
              <strong>{deleting?.description}</strong> será marcada como excluída.
              Você pode ver o histórico em relatórios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[var(--glass-border)]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-[var(--status-err)] hover:bg-red-600 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FAB mobile */}
      <button
        onClick={openCreate}
        className="fixed bottom-20 right-4 md:hidden w-14 h-14 rounded-full bg-[var(--green-mid)] text-white shadow-lg shadow-green-500/30 flex items-center justify-center hover:bg-[var(--green-deep)] transition-colors z-30"
      >
        <Plus size={24} />
      </button>
    </>
  )
}
