'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import * as LucideIcons from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { TransactionData, CategoryData } from '@/types'

function getLucideIcon(name: string): React.ElementType {
  const pascal = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  return (LucideIcons as unknown as Record<string, React.ElementType>)[pascal] ?? LucideIcons.Tag
}

function formatDateLocal(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface TransactionFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  transaction?: TransactionData | null
  onSuccess: () => void
}

export function TransactionForm({ open, onOpenChange, transaction, onSuccess }: TransactionFormProps) {
  const isEdit = !!transaction
  const [loading, setLoading]       = useState(false)
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [form, setForm] = useState({
    type:        'EXPENSE' as 'INCOME' | 'EXPENSE',
    amount:      '',
    description: '',
    date:        formatDateLocal(new Date()),
    categoryId:  '',
    notes:       '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(j => setCategories(j.data ?? []))
  }, [])

  useEffect(() => {
    if (transaction) {
      setForm({
        type:        transaction.type,
        amount:      String(transaction.amount),
        description: transaction.description,
        date:        formatDateLocal(new Date(transaction.date)),
        categoryId:  transaction.categoryId,
        notes:       transaction.notes ?? '',
      })
    } else {
      setForm({
        type: 'EXPENSE', amount: '', description: '',
        date: formatDateLocal(new Date()), categoryId: '', notes: '',
      })
    }
    setErrors({})
  }, [transaction, open])

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(p => ({ ...p, [key]: value }))
    setErrors(p => ({ ...p, [key]: '' }))
  }

  function validate() {
    const e: Record<string, string> = {}
    const amount = parseFloat(form.amount.replace(',', '.'))
    if (!form.amount || isNaN(amount) || amount <= 0) e.amount      = 'Informe um valor válido'
    if (!form.description.trim())                     e.description  = 'Descrição obrigatória'
    if (!form.date)                                   e.date         = 'Data obrigatória'
    if (!form.categoryId)                             e.categoryId   = 'Selecione uma categoria'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount.replace(',', '.')),
        date:   new Date(form.date + 'T12:00:00').toISOString(),
      }
      const url    = isEdit ? `/api/transactions/${transaction!.id}` : '/api/transactions'
      const method = isEdit ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Erro ao salvar'); return }
      toast.success(isEdit ? 'Transação atualizada!' : 'Transação criada!')
      onOpenChange(false)
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  const isIncome    = form.type === 'INCOME'
  const accentColor = isIncome ? 'var(--status-income)' : 'var(--status-expense)'
  const accentBg    = isIncome ? 'rgba(82,183,136,0.08)' : 'rgba(224,122,95,0.07)'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[420px] bg-[var(--gray-50)] border-l border-[var(--gray-300)] p-0 flex flex-col overflow-hidden"
      >
        {/* ── Topo colorido com título + toggle ─────────────────── */}
        <div
          className="px-6 pt-6 pb-5 border-b border-[var(--gray-300)] shrink-0 transition-colors duration-300"
          style={{ background: accentBg }}
        >
          <SheetHeader className="mb-5 text-left">
            <SheetTitle className="text-lg font-bold text-[var(--gray-900)] font-[var(--font-space-grotesk)]">
              {isEdit ? 'Editar transação' : 'Nova transação'}
            </SheetTitle>
          </SheetHeader>

          {/* Toggle Receita / Despesa */}
          <div className="flex rounded-xl overflow-hidden border border-[var(--gray-300)] bg-white/60">
            {(['EXPENSE', 'INCOME'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('type', t)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all duration-200',
                  form.type === t
                    ? t === 'INCOME'
                      ? 'bg-[var(--status-income)] text-white shadow-sm'
                      : 'bg-[var(--status-expense)] text-white shadow-sm'
                    : 'text-[var(--gray-500)]'
                )}
              >
                {t === 'INCOME'
                  ? <><TrendingUp size={15} /> Receita</>
                  : <><TrendingDown size={15} /> Despesa</>}
              </button>
            ))}
          </div>
        </div>

        {/* ── Corpo com scroll ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <form id="tx-form" onSubmit={handleSubmit} className="px-6 py-5 space-y-4" noValidate>

            {/* Valor — hero */}
            <div
              className="rounded-2xl border px-4 py-4 transition-colors duration-200"
              style={{
                borderColor: errors.amount ? 'var(--status-expense)' : accentColor + '55',
                background: 'white',
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: accentColor }}>
                Valor
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-medium text-[var(--gray-500)]">R$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={e => set('amount', e.target.value)}
                  placeholder="0,00"
                  className="flex-1 bg-transparent outline-none text-4xl font-bold font-[var(--font-mono)] placeholder:text-[var(--gray-300)] min-w-0"
                  style={{ color: accentColor }}
                  disabled={loading}
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-[var(--status-expense)] mt-1.5">{errors.amount}</p>
              )}
            </div>

            {/* Separador visual */}
            <div className="h-px bg-[var(--gray-200)]" />

            {/* Descrição */}
            <div className="space-y-1.5">
              <label className="auth-label">Descrição</label>
              <input
                type="text"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Ex: Almoço, Salário, Netflix..."
                className="auth-input"
                disabled={loading}
                maxLength={200}
              />
              {errors.description && <p className="text-xs text-[var(--status-expense)]">{errors.description}</p>}
            </div>

            {/* Data + Categoria */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="auth-label">Data</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => set('date', e.target.value)}
                  className="auth-input"
                  disabled={loading}
                />
                {errors.date && <p className="text-xs text-[var(--status-expense)]">{errors.date}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="auth-label">Categoria</label>
                <select
                  value={form.categoryId}
                  onChange={e => set('categoryId', e.target.value)}
                  className="auth-input"
                  disabled={loading}
                >
                  <option value="">Selecione</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.categoryId && <p className="text-xs text-[var(--status-expense)]">{errors.categoryId}</p>}
              </div>
            </div>

            {/* Preview categoria */}
            {form.categoryId && (() => {
              const cat = categories.find(c => c.id === form.categoryId)
              if (!cat) return null
              const Icon = getLucideIcon(cat.icon)
              return (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[var(--gray-200)]">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: cat.color + '22' }}>
                    <Icon size={13} style={{ color: cat.color }} />
                  </div>
                  <span className="text-xs font-medium text-[var(--gray-700)]">{cat.name}</span>
                </div>
              )
            })()}

            {/* Notas */}
            <div className="space-y-1.5">
              <label className="auth-label">Notas <span className="font-normal text-[var(--gray-400)]">(opcional)</span></label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Observações adicionais..."
                rows={2}
                className="auth-input resize-none"
                disabled={loading}
                maxLength={500}
              />
            </div>
          </form>
        </div>

        {/* ── Rodapé fixo com botão ─────────────────────────────── */}
        <div className="shrink-0 px-6 pb-6 pt-3 border-t border-[var(--gray-200)] bg-[var(--gray-50)]">
          <button
            type="submit"
            form="tx-form"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:opacity-60"
            style={{ background: accentColor }}
          >
            {loading
              ? <Loader2 size={18} className="animate-spin" />
              : isEdit
                ? 'Salvar alterações'
                : isIncome
                  ? '+ Registrar receita'
                  : '+ Registrar despesa'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
