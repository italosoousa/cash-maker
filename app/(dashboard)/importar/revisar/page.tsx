'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, Check, Loader2, Tag, TrendingDown, TrendingUp, PiggyBank } from 'lucide-react'
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

// Índice único para cada linha (tipo + índice original no array filtrado)
interface IndexedRow { row: ParsedRow; key: string }

export default function RevisarPage() {
  const router = useRouter()

  const [preview,    setPreview]    = useState<PreviewResult | null>(null)
  const [expenses,   setExpenses]   = useState<IndexedRow[]>([])
  const [incomes,    setIncomes]    = useState<IndexedRow[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [importing,  setImporting]  = useState(false)

  // Carrega preview do sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('importar_preview')
    if (!raw) { router.replace('/importar'); return }
    const data: PreviewResult = JSON.parse(raw)
    setPreview(data)

    const exp = data.rows
      .filter(r => r.rowType === 'EXPENSE')
      .map((r, i): IndexedRow => ({ row: r, key: `exp-${i}` }))

    const inc = data.rows
      .filter(r => r.rowType === 'INCOME')
      .map((r, i): IndexedRow => ({ row: r, key: `inc-${i}` }))

    setExpenses(exp)
    setIncomes(inc)
    // Seleciona todas por padrão
    setSelected(new Set([...exp.map(r => r.key), ...inc.map(r => r.key)]))
  }, [router])

  // Carrega categorias do usuário
  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(j => setCategories(j.data ?? []))
  }, [])

  function updateCategory(key: string, categoryId: string) {
    const cat = categories.find(c => c.id === categoryId)
    const updater = (prev: IndexedRow[]): IndexedRow[] =>
      prev.map(item => {
        if (item.key !== key) return item
        return {
          ...item,
          row: { ...item.row, categoryId, categoryName: cat?.name ?? null, confidence: 'high' as const },
        }
      })
    setExpenses(updater)
    setIncomes(updater)
  }

  function toggleRow(key: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function toggleSection(items: IndexedRow[]) {
    const keys    = items.map(i => i.key)
    const allSel  = keys.every(k => selected.has(k))
    setSelected(prev => {
      const next = new Set(prev)
      if (allSel) keys.forEach(k => next.delete(k))
      else        keys.forEach(k => next.add(k))
      return next
    })
  }

  async function handleImport() {
    const allRows = [...expenses, ...incomes]
    const toImport = allRows.filter(r => selected.has(r.key))

    // Só despesas precisam de categoria
    const withoutCat = toImport.filter(r => r.row.rowType === 'EXPENSE' && !r.row.categoryId)
    if (withoutCat.length > 0) {
      toast.error(`${withoutCat.length} despesa(s) sem categoria. Defina todas antes de importar.`)
      return
    }

    setImporting(true)
    try {
      const payload = toImport.map(r => ({
        date:        r.row.date,
        description: r.row.description,
        amount:      r.row.amount,
        categoryId:  r.row.categoryId!,
        type:        r.row.rowType as 'EXPENSE' | 'INCOME',
      }))

      const res  = await fetch('/api/importar/confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          rows:       payload,
          importFrom: preview?.importType, // 'fatura' | 'extrato'
        }),
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

  const bankName   = preview.bank === 'nubank' ? 'Nubank' : preview.bank
  const isExtrato  = preview.importType === 'extrato'

  const selExpenses = expenses.filter(r => selected.has(r.key))
  const selIncomes  = incomes.filter(r => selected.has(r.key))
  const totalSelExp = selExpenses.reduce((s, r) => s + r.row.amount, 0)
  const totalSelInc = selIncomes.reduce((s, r) =>  s + r.row.amount, 0)
  const totalSelected = selected.size

  const uncatCount = expenses.filter(r => selected.has(r.key) && !r.row.categoryId).length

  const expAllSel = expenses.length > 0 && expenses.every(r => selected.has(r.key))
  const incAllSel = incomes.length  > 0 && incomes.every(r =>  selected.has(r.key))

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
            {bankName} · {isExtrato ? 'Extrato da conta' : 'Fatura do cartão'}
          </p>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className={cn('grid gap-3', isExtrato ? 'grid-cols-4' : 'grid-cols-3')}>
        {[
          {
            label: 'Selecionadas',
            value: `${totalSelected} de ${expenses.length + incomes.length}`,
            color: 'var(--gray-900)',
          },
          {
            label: 'Despesas',
            value: formatCurrency(totalSelExp),
            color: 'var(--status-expense)',
          },
          ...(isExtrato ? [{
            label: 'Receitas',
            value: formatCurrency(totalSelInc),
            color: 'var(--status-income)',
          }] : []),
          {
            label: 'Sem categoria',
            value: `${uncatCount}`,
            color: uncatCount > 0 ? 'var(--status-warn)' : 'var(--status-income)',
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card px-4 py-3 text-center">
            <p className="text-lg font-bold font-[var(--font-mono)]" style={{ color }}>{value}</p>
            <p className="text-xs text-[var(--gray-500)] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Aviso de deduplicação (fatura) ────────────────────── */}
      {preview.paymentAmount !== null && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {isExtrato ? 'Pagamento de fatura detectado' : 'Atenção: pagamento da fatura detectado'}
            </p>
            <p className="text-xs text-amber-700 mt-0.5 leading-snug">
              {isExtrato
                ? <>Encontramos um <strong>Pagamento de fatura</strong> de <strong>{formatCurrency(preview.paymentAmount)}</strong> no extrato. Esta transação foi excluída para evitar duplicidade com a fatura do cartão.</>
                : <>Encontramos um pagamento de <strong>{formatCurrency(preview.paymentAmount)}</strong> nesta fatura. Ao importar o extrato, identifique esta transação como pagamento da fatura para evitar duplicidade.</>
              }
            </p>
          </div>
        </div>
      )}

      {/* ── Aviso de investimentos (extrato) ──────────────────── */}
      {(preview.investmentCount ?? 0) > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-[var(--gray-100)] border border-[var(--gray-300)]">
          <PiggyBank size={16} className="text-[var(--gray-500)] shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--gray-700)] leading-snug">
            <strong>{preview.investmentCount} aplicação(ões) em RDB</strong> foram excluídas automaticamente — aplicações em investimentos não são importadas como despesas.
          </p>
        </div>
      )}

      {/* ── Aviso de sem categoria ────────────────────────────── */}
      {uncatCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-[rgba(242,204,143,0.20)] border border-[var(--status-warn)]">
          <Tag size={15} className="text-[var(--status-warn)] shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--gray-700)] leading-snug">
            <strong>{uncatCount} despesa(s)</strong> não foram categorizadas automaticamente.
            Defina a categoria de cada uma abaixo antes de importar.
          </p>
        </div>
      )}

      {/* ── Tabela de DESPESAS ───────────────────────────────── */}
      {expenses.length > 0 && (
        <RowSection
          title="Despesas"
          icon={<TrendingDown size={14} className="text-[var(--status-expense)]" />}
          accentColor="var(--status-expense)"
          items={expenses}
          categories={categories}
          selected={selected}
          allSelected={expAllSel}
          onToggleAll={() => toggleSection(expenses)}
          onToggleRow={toggleRow}
          onUpdateCategory={updateCategory}
          rowType="EXPENSE"
        />
      )}

      {/* ── Tabela de RECEITAS ───────────────────────────────── */}
      {incomes.length > 0 && (
        <RowSection
          title="Receitas"
          icon={<TrendingUp size={14} className="text-[var(--status-income)]" />}
          accentColor="var(--status-income)"
          items={incomes}
          categories={categories}
          selected={selected}
          allSelected={incAllSel}
          onToggleAll={() => toggleSection(incomes)}
          onToggleRow={toggleRow}
          onUpdateCategory={updateCategory}
          rowType="INCOME"
        />
      )}

      {/* ── Rodapé ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div className="text-xs text-[var(--gray-500)] space-y-0.5">
          <p>{totalSelected} transação(ões) selecionada(s)</p>
          {selExpenses.length > 0 && (
            <p className="text-[var(--status-expense)]">
              <span className="font-semibold">{selExpenses.length} despesa(s)</span> · {formatCurrency(totalSelExp)}
            </p>
          )}
          {selIncomes.length > 0 && (
            <p className="text-[var(--status-income)]">
              <span className="font-semibold">{selIncomes.length} receita(s)</span> · {formatCurrency(totalSelInc)}
            </p>
          )}
          {uncatCount > 0 && (
            <p className="text-[var(--status-warn)] flex items-center gap-1">
              <AlertCircle size={11} /> {uncatCount} sem categoria — defina antes de importar
            </p>
          )}
        </div>

        <button
          onClick={handleImport}
          disabled={importing || totalSelected === 0 || uncatCount > 0}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200',
            importing || totalSelected === 0 || uncatCount > 0
              ? 'bg-[var(--gray-300)] cursor-not-allowed'
              : 'bg-[var(--gray-900)] hover:bg-[var(--gray-800)] shadow-sm'
          )}
        >
          {importing
            ? <><Loader2 size={15} className="animate-spin" /> Importando…</>
            : <><TrendingDown size={15} /> Importar {totalSelected} transação(ões)</>}
        </button>
      </div>

      <div className="h-4" />
    </div>
  )
}

// ── Componente de seção de tabela ─────────────────────────────────────────────

interface RowSectionProps {
  title:            string
  icon:             React.ReactNode
  accentColor:      string
  items:            IndexedRow[]
  categories:       CategoryOption[]
  selected:         Set<string>
  allSelected:      boolean
  onToggleAll:      () => void
  onToggleRow:      (key: string) => void
  onUpdateCategory: (key: string, catId: string) => void
  rowType:          'EXPENSE' | 'INCOME'
}

function RowSection({
  title, icon, accentColor, items, categories,
  selected, allSelected, onToggleAll, onToggleRow, onUpdateCategory,
  rowType,
}: RowSectionProps) {
  const isExpense = rowType === 'EXPENSE'

  return (
    <div className="glass-card overflow-hidden">

      {/* Cabeçalho da seção */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--gray-300)]"
        style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 8%, transparent)` }}
      >
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onToggleAll}
          className="w-4 h-4 accent-[var(--gray-900)] cursor-pointer shrink-0"
        />
        <div className="flex items-center gap-1.5 flex-1">
          {icon}
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>
            {title}
          </span>
          <span className="text-[11px] text-[var(--gray-400)] ml-1">{items.length} transações</span>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-500)] w-28 hidden sm:block">Categoria</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--gray-500)] w-24 text-right">Valor</span>
      </div>

      {/* Linhas */}
      <div className="divide-y divide-[var(--gray-300)]">
        {items.map(({ row, key }) => {
          const isSel    = selected.has(key)
          const needsCat = isExpense && !row.categoryId

          return (
            <div
              key={key}
              className={cn(
                'flex items-center gap-3 px-4 py-3 transition-colors',
                isSel ? 'bg-white/60' : 'bg-[var(--gray-100)]/40 opacity-60'
              )}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isSel}
                onChange={() => onToggleRow(key)}
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
                  {row.confidence === 'high' && isExpense && (
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
                  onChange={e => onUpdateCategory(key, e.target.value)}
                  className={cn(
                    'w-full text-xs py-1.5 px-2 rounded-lg border outline-none bg-white transition-colors',
                    needsCat
                      ? 'border-[var(--status-warn)] text-[var(--gray-500)]'
                      : 'border-[var(--gray-300)] text-[var(--gray-900)]'
                  )}
                >
                  {isExpense && <option value="">— sem categoria —</option>}
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Valor */}
              <p
                className="w-24 text-right font-[var(--font-mono)] font-bold text-sm shrink-0"
                style={{ color: accentColor }}
              >
                {isExpense ? '' : '+'}{formatCurrency(row.amount)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
