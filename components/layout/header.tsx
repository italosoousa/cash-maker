'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { Bell, LogOut, User, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  userName: string
  userEmail: string
  pageTitle?: string
}

export function Header({ userName, userEmail, pageTitle }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="header-shell">
      {/* Título da página */}
      <div className="flex-1 flex items-center gap-4 min-w-0">
        {pageTitle && (
          <h1 className="text-base font-semibold text-[var(--gray-900)] truncate">
            {pageTitle}
          </h1>
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notificações */}
        <button className="relative w-9 h-9 rounded-xl flex items-center justify-center text-[var(--gray-500)] bg-white/70 border border-[var(--gray-300)] shadow-sm hover:bg-white transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--status-expense)] rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl bg-white/70 border border-[var(--gray-300)] shadow-sm"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--gray-800)] text-white flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <span className="hidden md:block text-sm font-medium text-[var(--gray-900)] max-w-[120px] truncate">
              {userName.split(' ')[0]}
            </span>
            <ChevronDown
              size={14}
              className={cn(
                'hidden md:block text-[var(--gray-500)] transition-transform',
                menuOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-[var(--gray-300)] bg-white/[0.97] backdrop-blur-3xl shadow-[0_16px_48px_rgba(26,26,46,0.18)] p-2 z-20 animate-dialog">
                <div className="px-3 py-2 border-b border-[var(--gray-300)] mb-1">
                  <p className="text-sm font-semibold text-[var(--gray-900)] truncate">{userName}</p>
                  <p className="text-xs text-[var(--gray-500)] truncate">{userEmail}</p>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--gray-700)] hover:bg-[var(--gray-100)] rounded-lg transition-colors"
                >
                  <User size={14} />
                  Meu perfil
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--status-expense)] hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut size={14} />
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
