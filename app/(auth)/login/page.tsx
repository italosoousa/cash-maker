'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!form.email) e.email = 'E-mail obrigatório'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'E-mail inválido'
    if (!form.password) e.password = 'Senha obrigatória'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error('E-mail ou senha incorretos')
        setErrors({ password: 'Credenciais inválidas' })
      } else {
        toast.success('Bem-vindo de volta!')
        router.push('/dashboard')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center p-4">
      {/* Orbs de fundo */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo-vertical.svg"
            alt="Cash Maker"
            width={180}
            height={194}
            priority
          />
        </div>

        {/* Card glass */}
        <div className="glass-card p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--gray-900)] font-[var(--font-space-grotesk)]">
              Entrar na conta
            </h1>
            <p className="text-sm text-[var(--gray-500)] mt-1">
              Bem-vindo de volta. Insira suas credenciais.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* E-mail */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-wide text-[var(--gray-500)]"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => {
                  setForm((p) => ({ ...p, email: e.target.value }))
                  setErrors((p) => ({ ...p, email: '' }))
                }}
                placeholder="seu@email.com"
                className="auth-input"
                disabled={loading}
              />
              {errors.email && (
                <p className="text-xs text-[var(--status-expense)]">{errors.email}</p>
              )}
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-medium uppercase tracking-wide text-[var(--gray-500)]"
                >
                  Senha
                </label>
                <Link
                  href="#"
                  className="text-xs text-[var(--gray-500)] hover:text-[var(--gray-700)] transition-colors"
                >
                  Esqueci a senha
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, password: e.target.value }))
                    setErrors((p) => ({ ...p, password: '' }))
                  }}
                  placeholder="••••••••"
                  className="auth-input pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gray-500)] hover:text-[var(--gray-700)] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-[var(--status-expense)]">{errors.password}</p>
              )}
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="auth-btn w-full mt-2"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--gray-500)] mt-6">
            Não tem conta?{' '}
            <Link
              href="/register"
              className="text-[var(--gray-900)] font-medium hover:text-[var(--gray-700)] transition-colors"
            >
              Criar conta gratuita
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
