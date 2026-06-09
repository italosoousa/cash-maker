'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, ShieldCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CategoryForm } from '@/components/categories/category-form'
import { CategoryCard } from '@/components/categories/category-card'
import { CategoryInsights } from '@/components/categories/category-insights'
import type { CategoryData } from '@/types'
import type { CategoryBreakdownEntry, CategoryKpis } from '@/components/categories/category-insights'
import { cn } from '@/lib/utils'

type Period = 'today' | 'week' | 'month' | 'year'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Hoje'   },
  { key: 'week',  label: 'Semana' },
  { key: 'month', label: 'Mês'    },
  { key: 'year',  label: 'Ano'    },
]

const EMPTY_KPIS: CategoryKpis = {
  totalExpense: 0,
  totalIncome:  0,
  topCategory:  null,
  avgTicket:    0,
}

export default function CategoriesPage() {
  const [categories, setCategories]       = useState<CategoryData[]>([])
  const [breakdown, setBreakdown]         = useState<CategoryBreakdownEntry[]>([])
  const [kpis, setKpis]                   = useState<CategoryKpis>(EMPTY_KPIS)
  const [period, setPeriod]               = useState<Period>('month')
  const [loading, setLoading]             = useState(true)
  const [formOpen, setFormOpen]           = useState(false)
  const [editing, setEditing]             = useState<CategoryData | null>(null)
  const [deleting, setDeleting]           = useState<CategoryData | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async (p: Period) => {
    setLoading(true)
    try {
      const [catsRes, insightsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch(`/api/categories/insights?period=${p}`),
      ])
      const catsJson     = await catsRes.json()
      const insightsJson = await insightsRes.json()

      setCategories(catsJson.data ?? [])

      const ins = insightsJson.data
      if (ins) {
        setBreakdown(ins.categoryBreakdown ?? [])
        setKpis(ins.kpis ?? EMPTY_KPIS)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(period) }, [load, period])

  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(cat: CategoryData) { setEditing(cat); setFormOpen(true) }
  function handleFormSuccess() { setFormOpen(false); load(period) }

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      const res  = await fetch(`/api/categories/${deleting.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Erro ao excluir'); return }
      toast.success('Categoria excluída')
      setDeleting(null)
      load(period)
    } finally {
      setDeleteLoading(false)
    }
  }

  // Enrich categories with insights data
  const insightMap = new Map(breakdown.map(b => [b.categoryId, b]))
  const maxAmount  = breakdown[0]?.total ?? 0

  const defaultCats = categories.filter(c => c.isDefault)
  const customCats  = categories.filter(c => !c.isDefault)

  return (
    <>
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="font-[var(--font-space-grotesk)] font-bold text-[27px] tracking-[-0.02em] text-[var(--gray-900)] leading-tight">
            Categorias
          </h1>
          <p className="text-[13.5px] text-[var(--gray-500)] mt-[3px]">
            Para onde seu dinheiro foi este mês
          </p>
        </div>

        <div className="flex items-center gap-[10px] flex-wrap">
          {/* Segmented period selector */}
          <div className="inline-flex gap-[3px] p-1 rounded-[13px] bg-[rgba(255,255,255,.5)] border border-[rgba(255,255,255,.55)] shadow-[inset_0_1px_0_rgba(255,255,255,.7)]">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={cn(
                  'text-[12px] font-semibold px-3 py-[6px] rounded-[9px] transition-all duration-150',
                  period === key
                    ? 'bg-[var(--gray-900)] text-white shadow-[0_3px_10px_rgba(26,26,46,.25)]'
                    : 'text-[var(--gray-500)] hover:text-[var(--gray-700)]'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Nova categoria */}
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-[7px] bg-[var(--gray-900)] text-white text-[13.5px] font-semibold rounded-[13px] px-4 py-[10px] shadow-[0_4px_14px_rgba(26,26,46,.28)] hover:shadow-[0_8px_22px_rgba(26,26,46,.34)] hover:-translate-y-px transition-all duration-[180ms]"
          >
            <Plus size={16} />
            Nova categoria
          </button>
        </div>
      </div>

      {/* ── V2 top: donut + KPIs ────────────────────────────── */}
      <CategoryInsights
        breakdown={breakdown}
        kpis={kpis}
        period={period}
        loading={loading}
      />

      {/* ── Category grid ───────────────────────────────────── */}
      {loading ? (
        <div className="space-y-6">
          <section>
            <div className="skeleton h-4 w-36 rounded mb-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="glass-card p-[17px] flex flex-col gap-3">
                  <div className="skeleton w-[42px] h-[42px] rounded-[13px]" />
                  <div>
                    <div className="skeleton h-4 w-28 rounded mb-1.5" />
                    <div className="skeleton h-3 w-20 rounded" />
                  </div>
                  <div className="skeleton h-5 w-24 rounded" />
                  <div className="skeleton h-[6px] rounded-full" />
                  <div className="flex justify-between">
                    <div className="skeleton h-3 w-16 rounded" />
                    <div className="skeleton h-5 w-12 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Padrão do sistema */}
          <section>
            <p className="flex items-center gap-[7px] text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--gray-500)] mb-[13px]">
              <ShieldCheck size={13} />
              Padrão do sistema
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {defaultCats.map(cat => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  insight={insightMap.get(cat.id)}
                  maxAmount={maxAmount}
                  onEdit={() => openEdit(cat)}
                />
              ))}
            </div>
          </section>

          {/* Personalizadas */}
          {customCats.length > 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--gray-500)] mb-[13px]">
                Personalizadas
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {customCats.map(cat => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    insight={insightMap.get(cat.id)}
                    maxAmount={maxAmount}
                    onEdit={() => openEdit(cat)}
                    onDelete={() => setDeleting(cat)}
                  />
                ))}
                {/* Card tracejado — Nova categoria */}
                <button
                  onClick={openCreate}
                  className="border-2 border-dashed border-[rgba(170,170,200,.55)] rounded-[22px] flex flex-col items-center justify-center gap-[9px] text-[var(--gray-500)] min-h-[150px] bg-[rgba(255,255,255,.18)] hover:border-[var(--gray-500)] hover:text-[var(--gray-700)] hover:bg-[rgba(255,255,255,.4)] transition-all duration-[180ms]"
                >
                  <div className="w-[42px] h-[42px] rounded-[13px] grid place-items-center bg-[rgba(255,255,255,.6)] border border-[rgba(200,200,224,.5)]">
                    <Plus size={20} />
                  </div>
                  <span className="text-[13px] font-semibold">Nova categoria</span>
                </button>
              </div>
            </section>
          )}

          {customCats.length === 0 && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[var(--gray-500)] mb-[13px]">
                Personalizadas
              </p>
              <button
                onClick={openCreate}
                className="w-full border-2 border-dashed border-[rgba(170,170,200,.55)] rounded-[22px] py-10 flex flex-col items-center gap-[9px] text-[var(--gray-500)] bg-[rgba(255,255,255,.18)] hover:border-[var(--gray-500)] hover:text-[var(--gray-700)] hover:bg-[rgba(255,255,255,.4)] transition-all"
              >
                <div className="w-[42px] h-[42px] rounded-[13px] grid place-items-center bg-[rgba(255,255,255,.6)] border border-[rgba(200,200,224,.5)]">
                  <Plus size={20} />
                </div>
                <span className="text-sm font-semibold">Criar primeira categoria personalizada</span>
              </button>
            </section>
          )}
        </div>
      )}

      {/* ── Dialog form ─────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="glass-card border-0 sm:max-w-md animate-dialog">
          <DialogHeader>
            <DialogTitle className="text-[var(--gray-900)] font-[var(--font-space-grotesk)]">
              {editing ? 'Editar categoria' : 'Nova categoria'}
            </DialogTitle>
          </DialogHeader>
          <CategoryForm
            category={editing}
            onSuccess={handleFormSuccess}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Confirm delete ──────────────────────────────────── */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="glass-card border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--gray-900)]">Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--gray-500)]">
              A categoria <strong>{deleting?.name}</strong> será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[var(--gray-300)]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-[var(--status-expense)] hover:bg-red-600 text-white"
            >
              {deleteLoading ? <Loader2 size={14} className="animate-spin" /> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
