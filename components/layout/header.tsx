'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { Search, Bell, LogOut, User, ChevronDown } from 'lucide-react'
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
      {/* Título da página (mobile) / Search (desktop) */}
      <div className="flex-1 flex items-center gap-4 min-w-0">
        {pageTitle && (
          <h1 className="text-base font-semibold text-[var(--ink-dark)] md:hidden truncate">
            {pageTitle}
          </h1>
        )}

        {/* Barra de busca — desktop */}
        <div className="hidden md:flex flex-1 max-w-sm items-center gap-2 bg-white/60 backdrop-blur-sm border border-[var(--glass-border)] rounded-xl px-3 py-2 text-sm text-[var(--ink-ghost)] group focus-within:border-[var(--green-mid)] focus-within:shadow-[0_0_0_3px_rgba(82,183,136,0.12)] transition-all">
          <Search size={15} className="shrink-0 text-[var(--ink-ghost)]" />
          <input
            type="search"
            placeholder="Buscar transações..."
            className="flex-1 bg-transparent outline-none text-[var(--ink-dark)] placeholder:text-[var(--ink-ghost)] text-sm"
          />
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notificações */}
        <button className="relative w-9 h-9 rounded-xl flex items-center justify-center text-[var(--ink-soft)] hover:bg-[var(--green-frost)] transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--status-err)] rounded-full" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-[var(--green-frost)] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--green-mid)] text-white flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <span className="hidden md:block text-sm font-medium text-[var(--ink-dark)] max-w-[120px] truncate">
              {userName.split(' ')[0]}
            </span>
            <ChevronDown
              size={14}
              className={cn(
                'hidden md:block text-[var(--ink-ghost)] transition-transform',
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
              <div className="absolute right-0 top-full mt-2 w-52 glass-card p-2 z-20 animate-dialog">
                <div className="px-3 py-2 border-b border-[var(--glass-border)] mb-1">
                  <p className="text-sm font-semibold text-[var(--ink-dark)] truncate">{userName}</p>
                  <p className="text-xs text-[var(--ink-ghost)] truncate">{userEmail}</p>
                </div>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--ink-mid)] hover:bg-[var(--green-frost)] rounded-lg transition-colors">
                  <User size={14} />
                  Meu perfil
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--status-err)] hover:bg-red-50 rounded-lg transition-colors"
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
