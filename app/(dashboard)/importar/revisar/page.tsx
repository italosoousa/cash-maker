'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, Check, Loader2, Tag, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { PreviewResult, ParsedRow } from '@/lib/importar/types'

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function formatDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

interface CategoryOption { id: string; name: string; color: string }

export default function RevisarPage() {
  const router = useRouter()

  const [preview,    setPreview]    = useState<PreviewResult | null>(null)
  const [rows,       setRows]       = useState<ParsedRow[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [selected,   setSelected]   = useState<Set<number>>(new Set())
  const [importing,  setImporting]  = useState(false)

  // Carrega preview do sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('importar_preview')
    if (!raw) { router.replace('/importar'); return }
    const data: PreviewResult = JSON.parse(raw)
    setPreview(data)

    const expenses = data.rows.filter(r => r.rowType === 'EXPENSE')
    setRows(expenses)
    // Seleciona todas por padrão
    setSelected(new Set(expenses.map((_, i) => i)))
  }, [router])

  // Carrega categorias do usuário
  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(j => setCategories(j.data ?? []))
  }, [])

  function updateCategory(idx: number, categoryId: string) {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r
      const cat = categories.find(c => c.id === categoryId)
      return { ...r, categoryId, categoryName: cat?.name ?? null, confidence: 'high' as const }
    }))
  }

  function toggleRow(idx: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set())
    else setSelected(new Set(rows.map((_, i) => i)))
  }

  async function handleImport() {
    const toImport = rows.filter((_, i) => selected.has(i))

    const withoutCat = toImport.filter(r => !r.categoryId)
    if (withoutCat.length > 0) {
      toast.error(`${withoutCat.length} transação(ões) sem categoria. Defina todas antes de importar.`)
      return
    }

    setImporting(true)
    try {
      const payload = toImport.map(r => ({
        date:        r.date,
        description: r.description,
        amount:      r.amount,
        categoryId:  r.categoryId!,
      }))

      const res  = await fetch('/api/importar/confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rows: payload }),
      })
      const json = await res.json()

      if (!res.ok) { toast.error(json.error ?? 'Erro ao importar'); return }

      sessionStorage.removeItem('importar_preview')
      toast.success(`${json.data.imported} transações importadas com sucesso!`)
      router.push('/transactions')
    } finally {
      setImporting(false)
    }
  }

  if (!preview) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[var(--gray-400)]" />
      </div>
    )
  }

  const expenseRows     = rows
  const selectedRows    = expenseRows.filter((_, i) => selected.has(i))
  const totalSelected   = selectedRows.reduce((s, r) => s + r.amount, 0)
  const uncatCount      = expenseRows.filter(r => !r.categoryId).length
  const bankName        = preview.bank === 'nubank' ? 'Nubank' : preview.bank

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/importar')}
          className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--gray-300)] text-[var(--gray-500)] hover:bg-[var(--gray-100)] transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--gray-900)] font-[var(--font-space-grotesk)]">
            Revisar importação
          </h1>
          <p className="text-sm text-[var(--gray-500)]">
            {bankName} · {preview.importType === 'fatura' ? 'Fatura do cartão' : 'Extrato da conta'}
          </p>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Selecionadas',   value: `${selected.size} de ${expenseRows.length}`, color: 'var(--gray-900)'     },
          { label: 'Total selecionado', value: formatCurrency(totalSelected),             color: 'var(--status-expense)' },
          { label: 'Sem categoria',  value: `${uncatCount}`,                              color: uncatCount > 0 ? 'var(--status-warn)' : 'var(--status-income)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card px-4 py-3 text-center">
            <p className="text-lg font-bold font-[var(--font-mono)]" style={{ color }}>{value}</p>
            <p className="text-xs text-[var(--gray-500)] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Aviso de deduplicação ─────────────────────────────── */}
      {preview.paymentAmount !== null && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Atenção: pagamento da fatura detectado</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-snug">
              Encontramos um pagamento de <strong>{formatCurrency(preview.paymentAmount)}</strong> nesta fatura.
              Ao importar o extrato da sua conta corrente, identifique esta transação como pagamento da fatura para evitar duplicidade.
            </p>
          </div>
        </div>
      )}

      {/* ── Aviso de sem categoria ────────────────────────────── */}
      {uncatCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-[rgba(242,204,143,0.20)] border border-[var(--status-warn)]">
          <Tag size={15} className="text-[var(--status-warn)] shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--gray-700)] leading-snug">
            <strong>{uncatCount} transação(ões)</strong> não foram categorizadas automaticamente.
            Defina a categoria de cada uma abaixo antes de importar.
          </p>
        </div>
      )}

      {/* ── Tabela ───────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--gray-300)] bg-[var(--gray-100)]/60">
          <input
            type="checkbox"
            checked={selected.size === expenseRows.length && expenseRows.length > 0}
            onChange={toggleAll}
            className="w-4 h-4 accent-[var(--gray-900)] cursor-pointer shrink-0"
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-500)] flex-1">Descrição</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-500)] w-28 hidden sm:block">Categoria</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-500)] w-24 text-right">Valor</span>
        </div>

        {/* Linhas */}
        <div className="divide-y divide-[var(--gray-300)]">
          {expenseRows.map((row, idx) => {
            const isSel   = selected.has(idx)
            const needsCat = !row.categoryId
            return (
              <div
                key={idx}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 transition-colors',
                  isSel ? 'bg-white/60' : 'bg-[var(--gray-100)]/40 opacity-60'
                )}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSel}
                  onChange={() => toggleRow(idx)}
                  className="w-4 h-4 accent-[var(--gray-900)] cursor-pointer shrink-0"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--gray-900)] truncate">
                      {row.description}
                    </p>
                    {row.isInstallment && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--gray-200)] text-[var(--gray-500)] shrink-0">
                        {row.installmentInfo}
                      </span>
                    )}
                    {row.confidence === 'high' && (
                      <span className="hidden xs:flex items-center gap-0.5 text-[10px] text-[var(--status-income)] shrink-0">
                        <Check size={10} /> auto
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--gray-400)]">{formatDate(row.date)}</p>
                </div>

                {/* Categoria (select) */}
                <div className="w-28 sm:w-36 shrink-0">
                  <select
                    value={row.categoryId ?? ''}
                    onChange={e => updateCategory(idx, e.target.value)}
                    className={cn(
                      'w-full text-xs py-1.5 px-2 rounded-lg border outline-none bg-white transition-colors',
                      needsCat
                        ? 'border-[var(--status-warn)] text-[var(--gray-500)]'
                        : 'border-[var(--gray-300)] text-[var(--gray-900)]'
                    )}
                  >
                    <option value="">— sem categoria —</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Valor */}
                <p className="w-24 text-right font-[var(--font-mono)] font-bold text-sm text-[var(--status-expense)] shrink-0">
                  {formatCurrency(row.amount)}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Rodapé ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div className="text-xs text-[var(--gray-500)] space-y-0.5">
          <p>{selected.size} transação(ões) selecionada(s) · {formatCurrency(totalSelected)}</p>
          {uncatCount > 0 && (
            <p className="text-[var(--status-warn)] flex items-center gap-1">
              <AlertCircle size={11} /> {uncatCount} sem categoria — defina antes de importar
            </p>
          )}
        </div>

        <button
          onClick={handleImport}
          disabled={importing || selected.size === 0 || uncatCount > 0}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200',
            importing || selected.size === 0 || uncatCount > 0
              ? 'bg-[var(--gray-300)] cursor-not-allowed'
              : 'bg-[var(--gray-900)] hover:bg-[var(--gray-800)] shadow-sm'
          )}
        >
          {importing
            ? <><Loader2 size={15} className="animate-spin" /> Importando…</>
            : <><TrendingDown size={15} /> Importar {selected.size} transação(ões)</>}
        </button>
      </div>

      <div className="h-4" />
    </div>
  )
}
