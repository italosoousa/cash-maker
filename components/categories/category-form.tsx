'use client'

import { useState, useEffect } from 'react'
import { Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import * as LucideIcons from 'lucide-react'
import type { CategoryData } from '@/types'

const ICON_OPTIONS = [
  'utensils', 'car', 'home', 'heart', 'smile', 'book-open', 'tag',
  'shopping-bag', 'coffee', 'music', 'film', 'globe', 'plane',
  'briefcase', 'trending-up', 'gift', 'zap', 'shield', 'star',
  'dollar-sign', 'credit-card', 'piggy-bank', 'wallet', 'bar-chart-2',
] as const

const COLOR_OPTIONS = [
  '#52B788', '#74C69D', '#2D6A4F', '#E07A5F', '#F2CC8F',
  '#81B29A', '#9DC4AD', '#3D405B', '#F4A261', '#E9C46A',
  '#264653', '#2A9D8F', '#E76F51', '#A8DADC', '#457B9D',
]

function getLucideIcon(name: string): React.ElementType | null {
  const pascalName = name
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
  return (LucideIcons as unknown as Record<string, React.ElementType>)[pascalName] ?? null
}

interface CategoryFormProps {
  category?: CategoryData | null
  onSuccess: () => void
  onCancel: () => void
}

export function CategoryForm({ category, onSuccess, onCancel }: CategoryFormProps) {
  const isEdit = !!category
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name:  category?.name  ?? '',
    icon:  category?.icon  ?? 'tag',
    color: category?.color ?? '#52B788',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (category) setForm({ name: category.name, icon: category.icon, color: category.color })
  }, [category])

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    if (form.name.length > 50) e.name = 'Máximo 50 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const url    = isEdit ? `/api/categories/${category!.id}` : '/api/categories'
      const method = isEdit ? 'PATCH' : 'POST'

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error ?? 'Erro ao salvar categoria')
        return
      }

      toast.success(isEdit ? 'Categoria atualizada!' : 'Categoria criada!')
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  const PreviewIcon = getLucideIcon(form.icon)

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Preview */}
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-[var(--gray-300)] bg-white/40">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: form.color + '22', border: `2px solid ${form.color}` }}
        >
          {PreviewIcon && <PreviewIcon size={22} style={{ color: form.color }} />}
        </div>
        <div>
          <p className="font-semibold text-[var(--gray-900)]">{form.name || 'Nome da categoria'}</p>
          <p className="text-xs text-[var(--gray-500)]">Prévia</p>
        </div>
      </div>

      {/* Nome */}
      <div className="space-y-1.5">
        <label className="auth-label">Nome</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: '' })) }}
          placeholder="Ex: Alimentação"
          className="auth-input"
          disabled={loading}
          maxLength={50}
        />
        {errors.name && <p className="text-xs text-[var(--status-expense)]">{errors.name}</p>}
      </div>

      {/* Ícone */}
      <div className="space-y-2">
        <label className="auth-label">Ícone</label>
        <div className="grid grid-cols-8 gap-1.5">
          {ICON_OPTIONS.map((iconName) => {
            const Icon = getLucideIcon(iconName)
            if (!Icon) return null
            const active = form.icon === iconName
            return (
              <button
                key={iconName}
                type="button"
                onClick={() => setForm(p => ({ ...p, icon: iconName }))}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all relative"
                style={{
                  background: active ? form.color + '22' : 'rgba(255,255,255,0.5)',
                  border: active ? `2px solid ${form.color}` : '1px solid var(--gray-300)',
                }}
                title={iconName}
              >
                <Icon size={16} style={{ color: active ? form.color : 'var(--gray-500)' }} />
                {active && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: form.color }}>
                    <Check size={8} color="white" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Cor */}
      <div className="space-y-2">
        <label className="auth-label">Cor</label>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setForm(p => ({ ...p, color }))}
              className="w-7 h-7 rounded-full transition-transform hover:scale-110 relative"
              style={{
                background: color,
                outline: form.color === color ? `3px solid ${color}` : 'none',
                outlineOffset: '2px',
              }}
              title={color}
            >
              {form.color === color && (
                <Check size={12} color="white" className="absolute inset-0 m-auto" />
              )}
            </button>
          ))}
          {/* Input cor customizada */}
          <label className="w-7 h-7 rounded-full border-2 border-dashed border-[var(--gray-300)] flex items-center justify-center cursor-pointer hover:border-[var(--gray-500)] transition-colors overflow-hidden" title="Cor personalizada">
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm(p => ({ ...p, color: e.target.value }))}
              className="opacity-0 absolute w-0 h-0"
            />
            <span className="text-[10px] text-[var(--gray-500)]">+</span>
          </label>
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl border border-[var(--gray-300)] text-sm font-medium text-[var(--gray-700)] hover:bg-[var(--gray-100)] transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 auth-btn py-2.5"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : isEdit ? 'Salvar' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
