'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, ArrowRight, Check, X } from 'lucide-react'
import { toast } from 'sonner'

// ── Google icon ────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}

// ── Password rules ─────────────────────────────────────────────────────────────
interface PasswordRule { label: string; test: (v: string) => boolean }

const PASSWORD_RULES: PasswordRule[] = [
  { label: 'Mínimo 8 caracteres',  test: v => v.length >= 8 },
  { label: 'Uma letra maiúscula',  test: v => /[A-Z]/.test(v) },
  { label: 'Um número',            test: v => /[0-9]/.test(v) },
]

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name || form.name.length < 2) e.name = 'Nome deve ter pelo menos 2 caracteres'
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'E-mail inválido'
    if (!PASSWORD_RULES.every(r => r.test(form.password))) e.password = 'Senha não atende aos requisitos'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'As senhas não coincidem'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const res  = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error || 'Erro ao criar conta')
        if (json.error?.includes('E-mail')) setErrors({ email: json.error })
        return
      }

      toast.success('Conta criada! Fazendo login...')
      await signIn('credentials', { email: form.email, password: form.password, redirect: false })
      router.push('/dashboard')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      await signIn('google', { callbackUrl: '/dashboard' })
    } catch {
      toast.error('Erro ao entrar com Google')
      setGoogleLoading(false)
    }
  }

  const field = (key: keyof typeof form) => ({
    value:    form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(p => ({ ...p, [key]: e.target.value }))
      setErrors(p => ({ ...p, [key]: '' }))
    },
    disabled: loading,
  })

  return (
    <div className="min-h-screen flex overflow-hidden bg-white">

      {/* ── Left panel — photo (position reversed vs login) ───────────── */}
      <div className="hidden lg:block w-[42%] xl:w-[46%] relative h-screen sticky top-0 auth-anim-right">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/register.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/40" />

        {/* Logo top-left over photo */}
        <div className="absolute top-9 left-10 flex items-center gap-2.5">
          <Image src="/logo-icone.svg" alt="cashmaker" width={32} height={32} />
          <span className="text-[15px] font-light text-white tracking-tight font-[var(--font-space-grotesk)]">
            cashmaker
          </span>
        </div>

        {/* Quote at bottom */}
        <div className="absolute bottom-10 left-10 right-10">
          <p className="text-white/90 text-xl font-light leading-snug tracking-tight">
            Comece agora.<br />
            <span className="font-semibold">É gratuito para sempre.</span>
          </p>
          <p className="text-white/50 text-sm mt-2">
            Sem cartão de crédito. Sem pegadinhas.
          </p>
        </div>
      </div>

      {/* ── Right panel — form ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen auth-anim-left">

        {/* Logo mobile only */}
        <div className="lg:hidden px-8 pt-8 auth-anim-fade auth-delay-1">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image src="/logo-icone.svg" alt="cashmaker" width={30} height={30} />
            <span className="text-[15px] font-light text-[#1B3A2D] tracking-tight font-[var(--font-space-grotesk)]">
              cashmaker
            </span>
          </Link>
        </div>

        {/* Scrollable form area */}
        <div className="flex-1 flex items-center justify-center px-8 sm:px-14 py-10 overflow-y-auto">
          <div className="w-full max-w-[380px]">

            {/* Heading */}
            <div className="mb-7 auth-anim-up auth-delay-1">
              <h1 className="text-[28px] font-bold text-[#111] tracking-tight leading-tight">
                Criar conta
              </h1>
              <p className="text-sm text-[#888] mt-1.5">
                Gratuito para sempre. Sem cartão de crédito.
              </p>
            </div>

            {/* Google first */}
            <div className="auth-anim-up auth-delay-2">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="auth-google-btn"
              >
                {googleLoading ? (
                  <Loader2 size={16} className="animate-spin text-[#555]" />
                ) : (
                  <GoogleIcon />
                )}
                Continuar com Google
              </button>
            </div>

            <div className="auth-divider my-5 auth-anim-up auth-delay-3">OU</div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* Nome */}
              <div className="space-y-1.5 auth-anim-up auth-delay-3">
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
              <div className="space-y-1.5 auth-anim-up auth-delay-4">
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
              <div className="space-y-1.5 auth-anim-up auth-delay-5">
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
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#555] transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password strength rules */}
                {form.password.length > 0 && (
                  <div className="space-y-1 pt-0.5">
                    {PASSWORD_RULES.map(rule => {
                      const ok = rule.test(form.password)
                      return (
                        <div key={rule.label} className="flex items-center gap-1.5">
                          {ok
                            ? <Check size={11} className="text-[var(--status-income)] shrink-0" />
                            : <X     size={11} className="text-[var(--status-expense)] shrink-0" />
                          }
                          <span className={`text-xs ${ok ? 'text-[var(--status-income)]' : 'text-[#aaa]'}`}>
                            {rule.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
                {errors.password && <p className="text-xs text-[var(--status-expense)]">{errors.password}</p>}
              </div>

              {/* Confirmar senha */}
              <div className="space-y-1.5 auth-anim-up auth-delay-6">
                <label htmlFor="confirmPassword" className="auth-label">Confirmar senha</label>
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
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#555] transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-[var(--status-expense)]">{errors.confirmPassword}</p>}
              </div>

              {/* Submit */}
              <div className="auth-anim-up auth-delay-7">
                <button
                  type="submit"
                  disabled={loading}
                  className="auth-btn w-full"
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
              </div>
            </form>

            {/* Login link */}
            <p className="text-center text-sm text-[#888] mt-6 auth-anim-up auth-delay-7">
              Já tem conta?{' '}
              <Link
                href="/login"
                className="text-[#111] font-semibold hover:underline underline-offset-2 transition-colors"
              >
                Entrar
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-[#bbb] pb-8 auth-anim-fade auth-delay-7">
          cashmaker · organize. controle. cresça.
        </p>
      </div>

    </div>
  )
}
