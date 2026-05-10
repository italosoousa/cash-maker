'use client'

import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import {
  User, Mail, Calendar, LayoutList, Tag, RefreshCw,
  Pencil, Lock, LogOut, Check, Loader2, Eye, EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

interface ProfileData {
  id:        string
  name:      string
  email:     string
  createdAt: string
  _count: {
    transactions:  number
    categories:    number
    fixedExpenses: number
  }
}

export default function ProfilePage() {
  const [profile, setProfile]   = useState<ProfileData | null>(null)
  const [loading, setLoading]   = useState(true)

  // ── Edit name ─────────────────────────────────────────────
  const [editingName, setEditingName]   = useState(false)
  const [nameValue, setNameValue]       = useState('')
  const [nameLoading, setNameLoading]   = useState(false)

  // ── Change password ───────────────────────────────────────
  const [pwForm, setPwForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  })
  const [pwErrors, setPwErrors]   = useState<Record<string, string>>({})
  const [pwLoading, setPwLoading] = useState(false)
  const [showPw, setShowPw]       = useState({ current: false, next: false, confirm: false })

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(j => {
        setProfile(j.data)
        setNameValue(j.data?.name ?? '')
      })
      .finally(() => setLoading(false))
  }, [])

  // ── Handlers ──────────────────────────────────────────────
  async function handleNameSave() {
    if (!nameValue.trim() || nameValue.trim() === profile?.name) {
      setEditingName(false)
      return
    }
    setNameLoading(true)
    try {
      const res  = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameValue.trim() }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Erro ao atualizar'); return }
      setProfile(p => p ? { ...p, name: json.data.name } : p)
      setEditingName(false)
      toast.success('Nome atualizado!')
    } finally {
      setNameLoading(false)
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!pwForm.currentPassword)            errs.currentPassword = 'Campo obrigatório'
    if (pwForm.newPassword.length < 8)      errs.newPassword     = 'Mínimo 8 caracteres'
    if (pwForm.newPassword !== pwForm.confirmPassword) errs.confirmPassword = 'As senhas não coincidem'
    setPwErrors(errs)
    if (Object.keys(errs).length) return

    setPwLoading(true)
    try {
      const res  = await fetch('/api/profile/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pwForm),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Erro ao alterar senha'); return }
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Senha alterada com sucesso!')
    } finally {
      setPwLoading(false)
    }
  }

  // ── Initials ──────────────────────────────────────────────
  const initials = (profile?.name ?? 'U')
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const STATS = profile ? [
    { label: 'Transações',    value: profile._count.transactions,  icon: LayoutList, color: 'var(--gray-700)'      },
    { label: 'Categorias',    value: profile._count.categories,    icon: Tag,        color: 'var(--status-income)'  },
    { label: 'Gastos fixos',  value: profile._count.fixedExpenses, icon: RefreshCw,  color: 'var(--status-expense)' },
  ] : []

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-40 rounded-xl" />
        <div className="glass-card p-6 space-y-4">
          <div className="skeleton h-20 w-20 rounded-full mx-auto" />
          <div className="skeleton h-5 w-48 rounded mx-auto" />
          <div className="skeleton h-4 w-36 rounded mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* ── Cabeçalho da página ─────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--gray-900)] font-[var(--font-space-grotesk)]">
          Meu Perfil
        </h1>
        <p className="text-sm text-[var(--gray-500)] mt-0.5">
          Gerencie suas informações e segurança
        </p>
      </div>

      {/* ── Card de identidade ──────────────────────────────── */}
      <div className="glass-card p-6">
        {/* Avatar */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-[var(--gray-800)] text-white flex items-center justify-center text-2xl font-bold font-[var(--font-space-grotesk)] shrink-0 shadow-md">
            {initials}
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            {/* Nome editável */}
            {editingName ? (
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <input
                  autoFocus
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditingName(false) }}
                  className="auth-input py-1.5 text-lg font-bold w-full max-w-xs"
                  maxLength={80}
                  disabled={nameLoading}
                />
                <button
                  onClick={handleNameSave}
                  disabled={nameLoading}
                  className="w-8 h-8 rounded-lg bg-[var(--status-income)] text-white flex items-center justify-center shrink-0"
                >
                  {nameLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h2 className="text-xl font-bold text-[var(--gray-900)] font-[var(--font-space-grotesk)] truncate">
                  {profile?.name}
                </h2>
                <button
                  onClick={() => setEditingName(true)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--gray-400)] hover:text-[var(--gray-700)] hover:bg-[var(--gray-200)] transition-colors shrink-0"
                  title="Editar nome"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}

            {/* E-mail */}
            <div className="flex items-center gap-1.5 mt-1 justify-center sm:justify-start">
              <Mail size={13} className="text-[var(--gray-400)] shrink-0" />
              <p className="text-sm text-[var(--gray-500)] truncate">{profile?.email}</p>
            </div>

            {/* Membro desde */}
            <div className="flex items-center gap-1.5 mt-0.5 justify-center sm:justify-start">
              <Calendar size={13} className="text-[var(--gray-400)] shrink-0" />
              <p className="text-xs text-[var(--gray-400)]">
                Membro desde {profile ? formatDate(profile.createdAt) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Separador */}
        <div className="h-px bg-[var(--gray-200)] my-5" />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {STATS.map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 py-4 rounded-2xl border border-[var(--gray-300)] bg-white/50"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
                <Icon size={16} style={{ color }} />
              </div>
              <p className="text-xl font-bold text-[var(--gray-900)] font-[var(--font-mono)]">{value}</p>
              <p className="text-[11px] text-[var(--gray-500)] text-center leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Alterar nome ────────────────────────────────────── */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-xl bg-[var(--gray-200)] flex items-center justify-center">
            <User size={15} className="text-[var(--gray-700)]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--gray-900)]">Informações pessoais</h3>
            <p className="text-xs text-[var(--gray-500)]">Seu nome de exibição na plataforma</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="auth-label">Nome completo</label>
          <div className="flex gap-2">
            <input
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleNameSave() }}
              className="auth-input flex-1"
              placeholder="Seu nome"
              maxLength={80}
              disabled={nameLoading}
            />
            <button
              onClick={handleNameSave}
              disabled={nameLoading || nameValue.trim() === profile?.name}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--gray-900)] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center gap-1.5"
            >
              {nameLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Salvar
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <label className="auth-label">E-mail</label>
          <div className="auth-input flex items-center gap-2 bg-[var(--gray-100)] cursor-not-allowed text-[var(--gray-500)]">
            <Mail size={14} className="shrink-0" />
            <span className="text-sm">{profile?.email}</span>
          </div>
          <p className="text-xs text-[var(--gray-400)]">O e-mail não pode ser alterado</p>
        </div>
      </div>

      {/* ── Alterar senha ────────────────────────────────────── */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-xl bg-[var(--gray-200)] flex items-center justify-center">
            <Lock size={15} className="text-[var(--gray-700)]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--gray-900)]">Segurança</h3>
            <p className="text-xs text-[var(--gray-500)]">Altere sua senha de acesso</p>
          </div>
        </div>

        <form onSubmit={handlePasswordSave} className="space-y-4" noValidate>
          {/* Senha atual */}
          <div className="space-y-1.5">
            <label className="auth-label">Senha atual</label>
            <div className="relative">
              <input
                type={showPw.current ? 'text' : 'password'}
                value={pwForm.currentPassword}
                onChange={e => { setPwForm(p => ({ ...p, currentPassword: e.target.value })); setPwErrors(p => ({ ...p, currentPassword: '' })) }}
                placeholder="••••••••"
                className="auth-input pr-10"
                disabled={pwLoading}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => ({ ...p, current: !p.current }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)] hover:text-[var(--gray-700)]"
              >
                {showPw.current ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {pwErrors.currentPassword && <p className="text-xs text-[var(--status-expense)]">{pwErrors.currentPassword}</p>}
          </div>

          {/* Nova senha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="auth-label">Nova senha</label>
              <div className="relative">
                <input
                  type={showPw.next ? 'text' : 'password'}
                  value={pwForm.newPassword}
                  onChange={e => { setPwForm(p => ({ ...p, newPassword: e.target.value })); setPwErrors(p => ({ ...p, newPassword: '' })) }}
                  placeholder="Mín. 8 caracteres"
                  className="auth-input pr-10"
                  disabled={pwLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => ({ ...p, next: !p.next }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)] hover:text-[var(--gray-700)]"
                >
                  {showPw.next ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {pwErrors.newPassword && <p className="text-xs text-[var(--status-expense)]">{pwErrors.newPassword}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="auth-label">Confirmar senha</label>
              <div className="relative">
                <input
                  type={showPw.confirm ? 'text' : 'password'}
                  value={pwForm.confirmPassword}
                  onChange={e => { setPwForm(p => ({ ...p, confirmPassword: e.target.value })); setPwErrors(p => ({ ...p, confirmPassword: '' })) }}
                  placeholder="Repita a nova senha"
                  className="auth-input pr-10"
                  disabled={pwLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gray-400)] hover:text-[var(--gray-700)]"
                >
                  {showPw.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {pwErrors.confirmPassword && <p className="text-xs text-[var(--status-expense)]">{pwErrors.confirmPassword}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={pwLoading || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
            className="auth-btn px-5 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pwLoading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
            Alterar senha
          </button>
        </form>
      </div>

      {/* ── Sair da conta ───────────────────────────────────── */}
      <div className="glass-card p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--gray-900)]">Sair da conta</p>
          <p className="text-xs text-[var(--gray-500)] mt-0.5">Encerrar sessão neste dispositivo</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--gray-300)] text-sm font-medium text-[var(--status-expense)] hover:bg-red-50 transition-colors"
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>

      {/* Espaço extra mobile (bottom nav) */}
      <div className="h-4" />
    </div>
  )
}
