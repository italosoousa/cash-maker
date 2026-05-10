'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import * as LucideIcons from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { FixedExpenseData, CategoryData } from '@/types'

function getLucideIcon(name: string): React.ElementType {
  const pascal = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  return (LucideIcons as unknown as Record<string, React.ElementType>)[pascal] ?? LucideIcons.Tag
}

function toDateInput(iso: string) {
  return iso.split('T')[0]
}

const FREQUENCY_OPTS = [
  { value: 'DAILY',   label: 'Diário'   },
  { value: 'WEEKLY',  label: 'Semanal'  },
  { value: 'MONTHLY', label: 'Mensal'   },
  { value: 'YEARLY',  label: 'Anual'    },
] as const

interface FixedExpenseFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  fixedExpense?: FixedExpenseData | null
  onSuccess: () => void
}

export function FixedExpenseForm({ open, onOpenChange, fixedExpense, onSuccess }: FixedExpenseFormProps) {
  const isEdit = !!fixedExpense

  const [loading, setLoading]       = useState(false)
  const [categories, setCategories] = useState<CategoryData[]>([])

  const [form, setForm] = useState({
    type:       'EXPENSE' as 'INCOME' | 'EXPENSE',
    name:       '',
    amount:     '',
    frequency:  'MONTHLY' as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY',
    startDate:  new Date().toISOString().split('T')[0],
    endDate:    '',
    categoryId: '',
    notes:      '',
    isActive:   true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(j => setCategories(j.data ?? []))
  }, [])

  useEffect(() => {
    if (fixedExpense) {
      setForm({
        type:       fixedExpense.type,
        name:       fixedExpense.name,
        amount:     String(fixedExpense.amount),
        frequency:  fixedExpense.frequency,
        startDate:  toDateInput(fixedExpense.startDate),
        endDate:    fixedExpense.endDate ? toDateInput(fixedExpense.endDate) : '',
        categoryId: fixedExpense.categoryId,
        notes:      fixedExpense.notes ?? '',
        isActive:   fixedExpense.isActive,
      })
    } else {
      setForm({
        type: 'EXPENSE', name: '', amount: '', frequency: 'MONTHLY',
        startDate: new Date().toISOString().split('T')[0], endDate: '',
        categoryId: '', notes: '', isActive: true,
      })
    }
    setErrors({})
  }, [fixedExpense, open])

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(p => ({ ...p, [key]: value }))
    setErrors(p => ({ ...p, [key]: '' }))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim())                                          e.name       = 'Nome obrigatório'
    const amt = parseFloat(form.amount.replace(',', '.'))
    if (!form.amount || isNaN(amt) || amt <= 0)                    e.amount     = 'Informe um valor válido'
    if (!form.startDate)                                            e.startDate  = 'Data de início obrigatória'
    if (form.endDate && form.endDate <= form.startDate)             e.endDate    = 'Data final deve ser após o início'
    if (!form.categoryId)                                           e.categoryId = 'Selecione uma categoria'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const payload = {
        type:       form.type,
        name:       form.name.trim(),
        amount:     parseFloat(form.amount.replace(',', '.')),
        frequency:  form.frequency,
        startDate:  new Date(form.startDate + 'T12:00:00').toISOString(),
        endDate:    form.endDate ? new Date(form.endDate + 'T23:59:59').toISOString() : null,
        categoryId: form.categoryId,
        notes:      form.notes.trim() || null,
        ...(isEdit && { isActive: form.isActive }),
      }

      const url    = isEdit ? `/api/fixed-expenses/${fixedExpense!.id}` : '/api/fixed-expenses'
      const method = isEdit ? 'PATCH' : 'POST'

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (!res.ok) { toast.error(json.error ?? 'Erro ao salvar'); return }

      toast.success(isEdit ? 'Gasto fixo atualizado!' : 'Gasto fixo criado!')
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
        className="w-full sm:max-w-md glass-card border-l border-[var(--gray-300)] overflow-y-auto"
      >
        <SheetHeader className="mb-6">
          <SheetTitle className="text-[var(--gray-900)] font-[var(--font-space-grotesk)]">
            {isEdit ? 'Editar gasto fixo' : 'Novo gasto fixo'}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Toggle Receita / Despesa */}
          <div className="flex rounded-xl overflow-hidden border border-[var(--gray-300)]">
            {(['EXPENSE', 'INCOME'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set('type', t)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all',
                  form.type === t
                    ? t === 'INCOME'
                      ? 'bg-[var(--status-income)] text-white'
                      : 'bg-[var(--status-expense)] text-white'
                    : 'bg-[var(--gray-100)] text-[var(--gray-500)] hover:bg-[var(--gray-200)]'
                )}
              >
                {t === 'INCOME'
                  ? <><TrendingUp size={16} /> Receita</>
                  : <><TrendingDown size={16} /> Despesa</>}
              </button>
            ))}
          </div>

          {/* Nome */}
          <div className="space-y-1.5">
            <label className="auth-label">Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ex: Aluguel, Netflix, Salário..."
              className="auth-input"
              disabled={loading}
              maxLength={100}
            />
            {errors.name && <p className="text-xs text-[var(--status-expense)]">{errors.name}</p>}
          </div>

          {/* Valor */}
          <div className="space-y-1.5">
            <label className="auth-label">Valor (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--gray-500)]">
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
                  isIncome ? 'text-[var(--status-income)]' : 'text-[var(--status-expense)]'
                )}
                disabled={loading}
              />
            </div>
            {errors.amount && <p className="text-xs text-[var(--status-expense)]">{errors.amount}</p>}
          </div>

          {/* Frequência */}
          <div className="space-y-1.5">
            <label className="auth-label">Frequência</label>
            <div className="grid grid-cols-4 gap-1 rounded-xl overflow-hidden border border-[var(--gray-300)]">
              {FREQUENCY_OPTS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('frequency', opt.value)}
                  className={cn(
                    'py-2.5 text-xs font-semibold transition-all',
                    form.frequency === opt.value
                      ? 'bg-[var(--gray-900)] text-white'
                      : 'bg-[var(--gray-100)] text-[var(--gray-500)] hover:bg-[var(--gray-200)]'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="auth-label">Início</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
                className="auth-input"
                disabled={loading}
              />
              {errors.startDate && <p className="text-xs text-[var(--status-expense)]">{errors.startDate}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="auth-label">Fim (opcional)</label>
              <input
                type="date"
                value={form.endDate}
                onChange={e => set('endDate', e.target.value)}
                min={form.startDate}
                className="auth-input"
                disabled={loading}
              />
              {errors.endDate && <p className="text-xs text-[var(--status-expense)]">{errors.endDate}</p>}
            </div>
          </div>

          {/* Categoria */}
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

          {/* Preview categoria */}
          {form.categoryId && (() => {
            const cat = categories.find(c => c.id === form.categoryId)
            if (!cat) return null
            const Icon = getLucideIcon(cat.icon)
            return (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 border border-[var(--gray-300)]">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: cat.color + '22' }}>
                  <Icon size={13} style={{ color: cat.color }} />
                </div>
                <span className="text-xs text-[var(--gray-700)]">{cat.name}</span>
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

          {/* Toggle ativo (só no edit) */}
          {isEdit && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--gray-300)] bg-white/40">
              <div>
                <p className="text-sm font-medium text-[var(--gray-900)]">Ativo</p>
                <p className="text-xs text-[var(--gray-500)]">
                  {form.isActive ? 'Gerando transações automaticamente' : 'Pausado — não gera transações'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => set('isActive', !form.isActive)}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                  form.isActive ? 'bg-[var(--status-income)]' : 'bg-[var(--gray-300)]'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                    form.isActive ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          )}

          {/* Botão */}
          <button type="submit" disabled={loading} className="auth-btn w-full">
            {loading
              ? <Loader2 size={18} className="animate-spin" />
              : isEdit
                ? 'Salvar alterações'
                : isIncome
                  ? '+ Criar receita fixa'
                  : '+ Criar despesa fixa'}
          </button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
