'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Filter, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Wallet, Search, X, Download,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { TransactionRow }  from '@/components/transactions/transaction-row'
import type { TransactionData, CategoryData } from '@/types'

// ── Tipos ────────────────────────────────────────────────────────────────────

type TxType   = 'ALL' | 'INCOME' | 'EXPENSE'
type TxSource = '' | 'MANUAL' | 'AUTO' | 'IMPORT'
type Preset   = '' | 'this_month' | 'last_month' | 'last_30' | 'custom'

interface PaginatedResult {
  items:         TransactionData[]
  total:         number
  totalPages:    number
  page:          number
  totalIncome:   number
  totalExpense:  number
}

// ── Utilitários ───────────────────────────────────────────────────────────────

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function toISO(dateStr: string, eod = false) {
  return new Date(dateStr + (eod ? 'T23:59:59' : 'T00:00:00')).toISOString()
}

function presetRange(preset: Preset): { start: string; end: string } | null {
  if (!preset || preset === 'custom') return null
  const now   = new Date()
  const y     = now.getFullYear()
  const m     = now.getMonth()
  const pad   = (n: number) => String(n).padStart(2, '0')

  if (preset === 'this_month') {
    const start = `${y}-${pad(m + 1)}-01`
    const end   = `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`
    return { start, end }
  }
  if (preset === 'last_month') {
    const pm    = m === 0 ? 11 : m - 1
    const py    = m === 0 ? y - 1 : y
    const start = `${py}-${pad(pm + 1)}-01`
    const end   = `${py}-${pad(pm + 1)}-${pad(new Date(py, pm + 1, 0).getDate())}`
    return { start, end }
  }
  if (preset === 'last_30') {
    const d30   = new Date(now); d30.setDate(d30.getDate() - 30)
    const start = d30.toISOString().slice(0, 10)
    const end   = now.toISOString().slice(0, 10)
    return { start, end }
  }
  return null
}

const PRESET_LABELS: Record<Exclude<Preset, '' | 'custom'>, string> = {
  this_month: 'Este mês',
  last_month: 'Mês passado',
  last_30:    'Últimos 30 dias',
}

const SOURCE_LABELS: Record<Exclude<TxSource, ''>, string> = {
  MANUAL: 'Manual',
  AUTO:   'Automático',
  IMPORT: 'Importado',
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function TransactionsPage() {
  const [data, setData]             = useState<PaginatedResult | null>(null)
  const [loading, setLoading]       = useState(true)
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [formOpen, setFormOpen]     = useState(false)
  const [editing, setEditing]       = useState<TransactionData | null>(null)
  const [deleting, setDeleting]     = useState<TransactionData | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showFilters, setShowFilters]     = useState(false)

  // Filtros
  const [search,     setSearch]     = useState('')
  const [type,       setType]       = useState<TxType>('ALL')
  const [categoryId, setCategoryId] = useState('')
  const [source,     setSource]     = useState<TxSource>('')
  const [preset,     setPreset]     = useState<Preset>('this_month')
  const [startDate,  setStartDate]  = useState(() => presetRange('this_month')!.start)
  const [endDate,    setEndDate]    = useState(() => presetRange('this_month')!.end)
  const [page,       setPage]       = useState(1)

  // Search debounce
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(j => setCategories(j.data ?? []))
  }, [])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 350)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (type !== 'ALL')   params.set('type', type)
      if (categoryId)       params.set('categoryId', categoryId)
      if (source)           params.set('source', source)
      if (debouncedSearch)  params.set('search', debouncedSearch)
      if (startDate)        params.set('startDate', toISO(startDate))
      if (endDate)          params.set('endDate',   toISO(endDate, true))

      const res  = await fetch(`/api/transactions?${params}`)
      const json = await res.json()
      setData(json.data)
    } finally {
      setLoading(false)
    }
  }, [type, categoryId, source, debouncedSearch, startDate, endDate, page])

  useEffect(() => { load() }, [load])

  // ── Handlers de preset ───────────────────────────────────────────────────────
  function applyPreset(p: Preset) {
    setPreset(p)
    const range = presetRange(p)
    if (range) { setStartDate(range.start); setEndDate(range.end) }
    else if (p === '') { setStartDate(''); setEndDate('') }
    setPage(1)
  }

  function handleStartDate(val: string) {
    setStartDate(val); setPreset('custom'); setPage(1)
  }
  function handleEndDate(val: string) {
    setEndDate(val); setPreset('custom'); setPage(1)
  }

  // ── CRUD handlers ────────────────────────────────────────────────────────────
  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(tx: TransactionData) { setEditing(tx); setFormOpen(true) }

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
    setSearch(''); setDebouncedSearch(''); setType('ALL')
    setCategoryId(''); setSource('')
    applyPreset('this_month')
  }

  // ── Chips de filtros ativos ──────────────────────────────────────────────────
  const activeChips: { label: string; onRemove: () => void }[] = []

  if (type !== 'ALL') activeChips.push({
    label: type === 'INCOME' ? 'Receitas' : 'Despesas',
    onRemove: () => { setType('ALL'); setPage(1) },
  })
  if (source) activeChips.push({
    label: SOURCE_LABELS[source],
    onRemove: () => { setSource(''); setPage(1) },
  })
  if (categoryId) {
    const cat = categories.find(c => c.id === categoryId)
    activeChips.push({
      label: cat?.name ?? 'Categoria',
      onRemove: () => { setCategoryId(''); setPage(1) },
    })
  }
  if (preset && preset !== 'custom') activeChips.push({
    label: PRESET_LABELS[preset as keyof typeof PRESET_LABELS],
    onRemove: () => applyPreset(''),
  })
  if (preset === 'custom' && (startDate || endDate)) activeChips.push({
    label: [startDate && `De ${startDate.split('-').reverse().join('/')}`,
            endDate   && `Até ${endDate.split('-').reverse().join('/')}`]
            .filter(Boolean).join(' '),
    onRemove: () => { setStartDate(''); setEndDate(''); setPreset(''); setPage(1) },
  })
  if (debouncedSearch) activeChips.push({
    label: `"${debouncedSearch}"`,
    onRemove: () => { setSearch(''); setDebouncedSearch(''); setPage(1) },
  })

  const hasFilters = activeChips.length > 0
  const items = data?.items ?? []

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--gray-900)] font-[var(--font-space-grotesk)]">
            Transações
          </h1>
          <p className="text-sm text-[var(--gray-500)] mt-0.5">
            {data ? `${data.total} transação${data.total !== 1 ? 'ões' : ''}` : '…'}
            {hasFilters && <span className="ml-1 text-[var(--gray-400)]">com filtros aplicados</span>}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors',
              showFilters || hasFilters
                ? 'bg-[var(--gray-100)] border-[var(--gray-500)] text-[var(--gray-900)]'
                : 'border-[var(--gray-300)] text-[var(--gray-500)] hover:bg-[var(--gray-100)]'
            )}
          >
            <Filter size={14} />
            <span className="hidden xs:inline">Filtros</span>
            {hasFilters && (
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[var(--gray-900)] text-white text-[9px] font-bold">
                {activeChips.length}
              </span>
            )}
          </button>

          <button onClick={openCreate} className="auth-btn px-4 py-2 text-sm gap-1.5">
            <Plus size={16} />
            Nova
          </button>
        </div>
      </div>

      {/* ── Barra de busca ──────────────────────────────────────────────────── */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)] pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por descrição…"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-[var(--gray-300)] bg-white/80 text-sm text-[var(--gray-900)] placeholder:text-[var(--gray-400)] outline-none focus:border-[var(--gray-500)] transition-colors"
        />
        {search && (
          <button
            onClick={() => { setSearch(''); setDebouncedSearch(''); setPage(1) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)] hover:text-[var(--gray-700)]"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Painel de filtros avançados ──────────────────────────────────────── */}
      {showFilters && (
        <div className="glass-card p-4 mb-4 space-y-4 animate-dialog">

          {/* Linha 1: Tipo */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-400)]">Tipo</p>
            <div className="flex gap-1.5">
              {(['ALL', 'INCOME', 'EXPENSE'] as TxType[]).map(opt => (
                <button
                  key={opt}
                  onClick={() => { setType(opt); setPage(1) }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    type === opt
                      ? 'bg-[var(--gray-900)] text-white'
                      : 'bg-[var(--gray-100)] text-[var(--gray-500)] hover:bg-[var(--gray-200)]'
                  )}
                >
                  {opt === 'ALL' ? 'Todas' : opt === 'INCOME' ? 'Receitas' : 'Despesas'}
                </button>
              ))}
            </div>
          </div>

          {/* Linha 2: Período */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-400)]">Período</p>
            <div className="flex flex-wrap gap-1.5">
              {(['this_month', 'last_month', 'last_30'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => applyPreset(p)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    preset === p
                      ? 'bg-[var(--gray-900)] text-white'
                      : 'bg-[var(--gray-100)] text-[var(--gray-500)] hover:bg-[var(--gray-200)]'
                  )}
                >
                  {PRESET_LABELS[p]}
                </button>
              ))}
              <button
                onClick={() => applyPreset('')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  preset === ''
                    ? 'bg-[var(--gray-900)] text-white'
                    : 'bg-[var(--gray-100)] text-[var(--gray-500)] hover:bg-[var(--gray-200)]'
                )}
              >
                Todo período
              </button>
            </div>

            {/* Datas customizadas */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div className="space-y-1">
                <label className="auth-label">De</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => handleStartDate(e.target.value)}
                  className="auth-input py-1.5 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="auth-label">Até</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => handleEndDate(e.target.value)}
                  className="auth-input py-1.5 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Linha 3: Categoria + Origem */}
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-400)]">Categoria</p>
              <select
                value={categoryId}
                onChange={e => { setCategoryId(e.target.value); setPage(1) }}
                className="auth-input py-1.5 text-xs"
              >
                <option value="">Todas as categorias</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-400)]">Origem</p>
              <select
                value={source}
                onChange={e => { setSource(e.target.value as TxSource); setPage(1) }}
                className="auth-input py-1.5 text-xs"
              >
                <option value="">Todas as origens</option>
                <option value="MANUAL">Manual</option>
                <option value="IMPORT">Importado</option>
                <option value="AUTO">Automático (gasto fixo)</option>
              </select>
            </div>
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-[var(--status-expense)] hover:underline"
            >
              Limpar todos os filtros
            </button>
          )}
        </div>
      )}

      {/* ── Chips de filtros ativos ──────────────────────────────────────────── */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {activeChips.map(chip => (
            <span
              key={chip.label}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--gray-200)] text-[var(--gray-700)] text-xs font-medium"
            >
              {chip.label}
              <button onClick={chip.onRemove} className="hover:text-[var(--gray-900)] ml-0.5">
                <X size={11} />
              </button>
            </span>
          ))}
          {activeChips.length > 1 && (
            <button
              onClick={clearFilters}
              className="px-2.5 py-1 rounded-full text-xs font-medium text-[var(--gray-400)] hover:text-[var(--status-expense)] transition-colors"
            >
              Limpar tudo
            </button>
          )}
        </div>
      )}

      {/* ── Cards de resumo (totais do filtro inteiro) ───────────────────────── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
        {[
          {
            label: 'Receitas',
            value: data?.totalIncome  ?? 0,
            icon:  TrendingUp,
            color: 'var(--status-income)',
          },
          {
            label: 'Despesas',
            value: data?.totalExpense ?? 0,
            icon:  TrendingDown,
            color: 'var(--status-expense)',
          },
          {
            label: 'Resultado',
            value: (data?.totalIncome ?? 0) - (data?.totalExpense ?? 0),
            icon:  Wallet,
            color: (data?.totalIncome ?? 0) >= (data?.totalExpense ?? 0)
              ? 'var(--status-income)'
              : 'var(--status-expense)',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card px-3 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: color + '22' }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-[var(--gray-500)]">{label}</p>
              <p className="font-[var(--font-mono)] font-bold text-sm sm:text-base truncate" style={{ color }}>
                {formatCurrency(value)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Lista ───────────────────────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">

        {/* Cabeçalho da tabela */}
        {!loading && items.length > 0 && (
          <div className="hidden sm:flex items-center gap-3 px-4 py-2.5 border-b border-[var(--gray-300)] bg-[var(--gray-100)]/60">
            <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-400)]">Descrição</span>
            <span className="w-28 text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-400)]">Categoria</span>
            <span className="w-20 text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-400)]">Origem</span>
            <span className="w-28 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-400)]">Valor</span>
            <span className="w-8" />
          </div>
        )}

        {loading ? (
          <div className="divide-y divide-[var(--gray-300)]">
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
          <div className="py-16 flex flex-col items-center gap-3 text-[var(--gray-500)]">
            <Wallet size={32} className="opacity-40" />
            <p className="text-sm">
              {hasFilters ? 'Nenhuma transação encontrada para esses filtros' : 'Nenhuma transação'}
            </p>
            {hasFilters ? (
              <button onClick={clearFilters} className="text-xs text-[var(--gray-700)] hover:underline">
                Limpar filtros
              </button>
            ) : (
              <button onClick={openCreate} className="text-xs text-[var(--gray-700)] hover:underline">
                Criar primeira transação
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--gray-300)]">
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--gray-300)]">
            <p className="text-xs text-[var(--gray-500)]">
              Página {data.page} de {data.totalPages} · {data.total} transações
            </p>
            <div className="flex gap-1">
              {/* Números de página (máx 5 visíveis) */}
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--gray-500)] hover:bg-[var(--gray-100)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                const half  = 2
                let start   = Math.max(1, page - half)
                const end   = Math.min(data.totalPages, start + 4)
                start       = Math.max(1, end - 4)
                const num   = start + i
                if (num > data.totalPages) return null
                return (
                  <button
                    key={num}
                    onClick={() => setPage(num)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-medium transition-colors',
                      num === page
                        ? 'bg-[var(--gray-900)] text-white'
                        : 'text-[var(--gray-500)] hover:bg-[var(--gray-100)]'
                    )}
                  >
                    {num}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--gray-500)] hover:bg-[var(--gray-100)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Form sheet ──────────────────────────────────────────────────────── */}
      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
        onSuccess={load}
      />

      {/* ── Confirm delete ──────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}>
        <AlertDialogContent className="glass-card border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--gray-900)]">Excluir transação?</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--gray-500)]">
              <strong>{deleting?.description}</strong> será marcada como excluída.
              Você pode ver o histórico em relatórios.
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

      {/* ── FAB mobile ──────────────────────────────────────────────────────── */}
      <button
        onClick={openCreate}
        className="fixed bottom-20 right-4 md:hidden w-14 h-14 rounded-full bg-[var(--gray-900)] text-white shadow-lg shadow-black/20 flex items-center justify-center hover:bg-[var(--gray-800)] transition-colors z-30"
      >
        <Plus size={24} />
      </button>
    </>
  )
}
