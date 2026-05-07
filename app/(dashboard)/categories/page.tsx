'use client'

import { useState, useEffect, useCallback } from 'react'
import * as LucideIcons from 'lucide-react'
import { Plus, Pencil, Trash2, ShieldCheck, Loader2 } from 'lucide-react'
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
import type { CategoryData } from '@/types'

function getLucideIcon(name: string): React.ElementType {
  const pascal = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')
  return (LucideIcons as unknown as Record<string, React.ElementType>)[pascal] ?? LucideIcons.Tag
}

export default function CategoriesPage() {
  const [categories, setCategories]       = useState<CategoryData[]>([])
  const [loading, setLoading]             = useState(true)
  const [formOpen, setFormOpen]           = useState(false)
  const [editing, setEditing]             = useState<CategoryData | null>(null)
  const [deleting, setDeleting]           = useState<CategoryData | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/categories')
      const json = await res.json()
      setCategories(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(cat: CategoryData) { setEditing(cat); setFormOpen(true) }
  function handleFormSuccess() { setFormOpen(false); load() }

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      const res  = await fetch(`/api/categories/${deleting.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Erro ao excluir'); return }
      toast.success('Categoria excluída')
      setDeleting(null)
      load()
    } finally {
      setDeleteLoading(false)
    }
  }

  const defaultCats = categories.filter(c => c.isDefault)
  const customCats  = categories.filter(c => !c.isDefault)

  return (
    <>
      {/* Header da página */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--green-deep)] font-[var(--font-space-grotesk)]">
            Categorias
          </h1>
          <p className="text-sm text-[var(--ink-soft)] mt-0.5">
            Organize suas transações por categoria
          </p>
        </div>
        <button onClick={openCreate} className="auth-btn px-4 py-2 text-sm gap-1.5 shrink-0">
          <Plus size={16} />
          <span className="hidden xs:inline">Nova </span>categoria
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card p-5">
              <div className="skeleton w-10 h-10 rounded-xl mb-3" />
              <div className="skeleton h-4 w-28 rounded mb-2" />
              <div className="skeleton h-3 w-20 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Padrão */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ink-ghost)] mb-3 flex items-center gap-2">
              <ShieldCheck size={13} />
              Padrão do sistema
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {defaultCats.map(cat => (
                <CategoryCard key={cat.id} category={cat} onEdit={() => openEdit(cat)} />
              ))}
            </div>
          </section>

          {/* Personalizadas */}
          {customCats.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ink-ghost)] mb-3">
                Personalizadas
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {customCats.map(cat => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    onEdit={() => openEdit(cat)}
                    onDelete={() => setDeleting(cat)}
                  />
                ))}
              </div>
            </section>
          )}

          {customCats.length === 0 && (
            <button
              onClick={openCreate}
              className="w-full border-2 border-dashed border-[var(--glass-border)] rounded-2xl py-10 flex flex-col items-center gap-2 text-[var(--ink-ghost)] hover:border-[var(--green-mid)] hover:text-[var(--green-mid)] transition-colors"
            >
              <Plus size={24} />
              <span className="text-sm font-medium">Criar primeira categoria personalizada</span>
            </button>
          )}
        </div>
      )}

      {/* Dialog form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="glass-card border-0 sm:max-w-md animate-dialog">
          <DialogHeader>
            <DialogTitle className="text-[var(--green-deep)] font-[var(--font-space-grotesk)]">
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

      {/* Confirm delete */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="glass-card border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--ink-dark)]">Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--ink-soft)]">
              A categoria <strong>{deleting?.name}</strong> será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[var(--glass-border)]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-[var(--status-err)] hover:bg-red-600 text-white"
            >
              {deleteLoading ? <Loader2 size={14} className="animate-spin" /> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function CategoryCard({
  category, onEdit, onDelete,
}: {
  category: CategoryData
  onEdit: () => void
  onDelete?: () => void
}) {
  const Icon  = getLucideIcon(category.icon)
  const count = category._count?.transactions ?? 0

  return (
    <div className="glass-card p-5 flex flex-col gap-3 group">
      <div className="flex items-start justify-between">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: category.color + '22', border: `1.5px solid ${category.color}` }}
        >
          <Icon size={20} style={{ color: category.color }} />
        </div>

        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--ink-ghost)] hover:bg-[var(--green-frost)] hover:text-[var(--green-deep)] transition-colors"
            title="Editar"
          >
            <Pencil size={13} />
          </button>
          {!category.isDefault && onDelete && (
            <button
              onClick={onDelete}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--ink-ghost)] hover:bg-red-50 hover:text-[var(--status-err)] transition-colors"
              title="Excluir"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="font-semibold text-[var(--ink-dark)] text-sm">{category.name}</p>
        <p className="text-xs text-[var(--ink-ghost)] mt-0.5">
          {count} {count === 1 ? 'transação' : 'transações'}
        </p>
      </div>

      {category.isDefault && (
        <span className="self-start text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--green-frost)] text-[var(--green-deep)]">
          Padrão
        </span>
      )}
    </div>
  )
}
