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

  // Carrega categorias
  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(j => setCategories(j.data ?? []))
  }, [])

  // Preenche form ao editar
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
    if (!form.amount || isNaN(amount) || amount <= 0) e.amount = 'Informe um valor válido'
    if (!form.description.trim()) e.description = 'Descrição obrigatória'
    if (!form.date) e.date = 'Data obrigatória'
    if (!form.categoryId) e.categoryId = 'Selecione uma categoria'
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

      const res  = await fetch(url, {
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

  const isIncome = form.type === 'INCOME'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md glass-card border-l border-[var(--glass-border)] overflow-y-auto"
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="text-[var(--green-deep)] font-[var(--font-space-grotesk)]">
            {isEdit ? 'Editar transação' : 'Nova transação'}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Toggle Receita / Despesa */}
          <div className="flex rounded-xl overflow-hidden border border-[var(--glass-border)]">
            {(['EXPENSE', 'INCOME'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('type', t)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all',
                  form.type === t
                    ? t === 'INCOME'
                      ? 'bg-[var(--status-ok)] text-white'
                      : 'bg-[var(--status-err)] text-white'
                    : 'bg-white/40 text-[var(--ink-soft)] hover:bg-white/60'
                )}
              >
                {t === 'INCOME'
                  ? <><TrendingUp size={16} /> Receita</>
                  : <><TrendingDown size={16} /> Despesa</>}
              </button>
            ))}
          </div>

          {/* Valor — destaque máximo */}
          <div className="space-y-1.5">
            <label className="auth-label">Valor (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--ink-ghost)]">
                R$
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="0,00"
                className={cn(
                  'auth-input pl-9 font-[var(--font-mono)] text-lg font-bold',
                  isIncome ? 'text-[var(--status-ok)]' : 'text-[var(--status-err)]'
                )}
                disabled={loading}
              />
            </div>
            {errors.amount && <p className="text-xs text-[var(--status-err)]">{errors.amount}</p>}
          </div>

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
            {errors.description && <p className="text-xs text-[var(--status-err)]">{errors.description}</p>}
          </div>

          {/* Data + Categoria lado a lado */}
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
              {errors.date && <p className="text-xs text-[var(--status-err)]">{errors.date}</p>}
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
              {errors.categoryId && <p className="text-xs text-[var(--status-err)]">{errors.categoryId}</p>}
            </div>
          </div>

          {/* Preview categoria */}
          {form.categoryId && (() => {
            const cat = categories.find(c => c.id === form.categoryId)
            if (!cat) return null
            const Icon = getLucideIcon(cat.icon)
            return (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/40 border border-[var(--glass-border)]">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: cat.color + '22' }}>
                  <Icon size={13} style={{ color: cat.color }} />
                </div>
                <span className="text-xs text-[var(--ink-mid)]">{cat.name}</span>
              </div>
            )
          })()}

          {/* Notas */}
          <div className="space-y-1.5">
            <label className="auth-label">Notas (opcional)</label>
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

          {/* Botão */}
          <button type="submit" disabled={loading} className="auth-btn w-full">
            {loading
              ? <Loader2 size={18} className="animate-spin" />
              : isEdit ? 'Salvar alterações' : isIncome ? '+ Registrar receita' : '+ Registrar despesa'}
          </button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
