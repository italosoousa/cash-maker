'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, ArrowRight, Check, X } from 'lucide-react'
import { toast } from 'sonner'

interface PasswordRule {
  label: string
  test: (v: string) => boolean
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: 'Mínimo 8 caracteres', test: (v) => v.length >= 8 },
  { label: 'Uma letra maiúscula', test: (v) => /[A-Z]/.test(v) },
  { label: 'Um número', test: (v) => /[0-9]/.test(v) },
]

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name || form.name.length < 2) e.name = 'Nome deve ter pelo menos 2 caracteres'
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'E-mail inválido'
    if (!PASSWORD_RULES.every((r) => r.test(form.password)))
      e.password = 'Senha não atende aos requisitos'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'As senhas não coincidem'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || 'Erro ao criar conta')
        if (json.error?.includes('E-mail')) setErrors({ email: json.error })
        return
      }

      toast.success('Conta criada! Fazendo login...')

      await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      })

      router.push('/dashboard')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((p) => ({ ...p, [key]: e.target.value }))
      setErrors((p) => ({ ...p, [key]: '' }))
    },
    disabled: loading,
  })

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center p-4">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo-vertical.svg"
            alt="Cash Maker"
            width={160}
            height={172}
            priority
          />
        </div>

        <div className="glass-card p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--gray-900)] font-[var(--font-space-grotesk)]">
              Criar conta
            </h1>
            <p className="text-sm text-[var(--gray-500)] mt-1">
              Gratuito para sempre. Sem cartão de crédito.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Nome */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="auth-label">Nome</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Seu nome completo"
                className="auth-input"
                {...field('name')}
              />
              {errors.name && <p className="text-xs text-[var(--status-expense)]">{errors.name}</p>}
            </div>

            {/* E-mail */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="auth-label">E-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                className="auth-input"
                {...field('email')}
              />
              {errors.email && <p className="text-xs text-[var(--status-expense)]">{errors.email}</p>}
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="auth-label">Senha</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="auth-input pr-10"
                  {...field('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gray-500)] hover:text-[var(--gray-500)] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Regras de senha */}
              {form.password.length > 0 && (
                <div className="space-y-1 pt-1">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(form.password)
                    return (
                      <div key={rule.label} className="flex items-center gap-1.5">
                        {ok ? (
                          <Check size={12} className="text-[var(--status-income)]" />
                        ) : (
                          <X size={12} className="text-[var(--status-expense)]" />
                        )}
                        <span
                          className={`text-xs ${ok ? 'text-[var(--status-income)]' : 'text-[var(--gray-500)]'}`}
                        >
                          {rule.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {errors.password && (
                <p className="text-xs text-[var(--status-expense)]">{errors.password}</p>
              )}
            </div>

            {/* Confirmar senha */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="auth-label">
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="auth-input pr-10"
                  {...field('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gray-500)] hover:text-[var(--gray-500)] transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-[var(--status-expense)]">{errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-btn w-full mt-2"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Criar conta
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--gray-500)] mt-6">
            Já tem conta?{' '}
            <Link
              href="/login"
              className="text-[var(--gray-700)] font-medium hover:text-[var(--gray-900)] transition-colors"
            >
              Entrar
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-[var(--gray-500)] mt-6">
          Cash Maker · Organize. Controle. Cresça.
        </p>
      </div>
    </div>
  )
}
