'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
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

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
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

  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      await signIn('google', { callbackUrl: '/dashboard' })
    } catch {
      toast.error('Erro ao entrar com Google')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-white">

      {/* ── Left panel — form ──────────────────────────────────────── */}
      <div className="w-full lg:w-[48%] xl:w-[44%] flex flex-col min-h-screen auth-anim-right">

        {/* Logo top-left */}
        <div className="px-10 pt-9 auth-anim-fade auth-delay-1">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image src="/logo-icone.svg" alt="cashmaker" width={32} height={32} priority />
            <span className="text-[15px] font-light text-[#1B3A2D] tracking-tight font-[var(--font-space-grotesk)]">
              cashmaker
            </span>
          </Link>
        </div>

        {/* Form centered */}
        <div className="flex-1 flex items-center justify-center px-8 sm:px-14 py-10">
          <div className="w-full max-w-[380px]">

            {/* Heading */}
            <div className="mb-8 auth-anim-up auth-delay-2">
              <h1 className="text-[28px] font-bold text-[#111] tracking-tight leading-tight">
                Entrar na conta
              </h1>
              <p className="text-sm text-[#888] mt-1.5">
                Bem-vindo de volta. Insira suas credenciais.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* E-mail */}
              <div className="space-y-1.5 auth-anim-up auth-delay-3">
                <label htmlFor="email" className="auth-label">E-mail</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm(p => ({ ...p, email: e.target.value }))
                    setErrors(p => ({ ...p, email: '' }))
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
              <div className="space-y-1.5 auth-anim-up auth-delay-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="auth-label">Senha</label>
                  <Link
                    href="#"
                    className="text-xs text-[#888] hover:text-[#333] transition-colors underline underline-offset-2"
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
                      setForm(p => ({ ...p, password: e.target.value }))
                      setErrors(p => ({ ...p, password: '' }))
                    }}
                    placeholder="••••••••"
                    className="auth-input pr-10"
                    disabled={loading}
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
                {errors.password && (
                  <p className="text-xs text-[var(--status-expense)]">{errors.password}</p>
                )}
              </div>

              {/* Sign in button */}
              <div className="auth-anim-up auth-delay-5">
                <button
                  type="submit"
                  disabled={loading}
                  className="auth-btn w-full"
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
              </div>
            </form>

            {/* OR divider */}
            <div className="auth-divider my-5 auth-anim-up auth-delay-5">OU</div>

            {/* Google button */}
            <div className="auth-anim-up auth-delay-6">
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

            {/* Register link */}
            <p className="text-center text-sm text-[#888] mt-7 auth-anim-up auth-delay-7">
              Não tem conta?{' '}
              <Link
                href="/register"
                className="text-[#111] font-semibold hover:underline underline-offset-2 transition-colors"
              >
                Criar conta gratuita
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-[#bbb] pb-8 auth-anim-fade auth-delay-7">
          cashmaker · organize. controle. cresça.
        </p>
      </div>

      {/* ── Right panel — photo ──────────────────────────────────────── */}
      <div className="hidden lg:block flex-1 relative h-screen sticky top-0 auth-anim-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/login.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark gradient overlay at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        {/* Quote at bottom */}
        <div className="absolute bottom-10 left-10 right-10">
          <p className="text-white/90 text-xl font-light leading-snug tracking-tight">
            Seu dinheiro,<br />
            <span className="font-semibold">seu controle.</span>
          </p>
          <p className="text-white/50 text-sm mt-2">
            Organize suas finanças em minutos.
          </p>
        </div>
      </div>

    </div>
  )
}
