'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  List,
  Tag,
  RefreshCw,
  BarChart3,
  Upload,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  soon?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',       label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/transactions',    label: 'Transações',    icon: List },
  { href: '/categories',      label: 'Categorias',    icon: Tag },
  { href: '/fixed-expenses',  label: 'Gastos Fixos',  icon: RefreshCw },
  { href: '/importar',        label: 'Subir planilha', icon: Upload },
  { href: '/reports',         label: 'Relatórios',    icon: BarChart3, soon: true },
]

interface SidebarProps {
  userName: string
  userEmail: string
}

export function Sidebar({ userName, userEmail }: SidebarProps) {
  const pathname = usePathname()

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <aside className="sidebar-shell">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image src="/logo-icone.svg" alt="Cash Maker" width={36} height={36} />
          <div>
            <span className="text-base font-bold text-[var(--green-brand)] font-[var(--font-space-grotesk)] leading-none block">
              Cash Maker
            </span>
            <span className="text-[10px] tracking-widest text-[var(--gray-500)] leading-none">
              ORGANIZE · CRESÇA
            </span>
          </div>
        </Link>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--gray-500)] px-2 mb-2">
          Menu
        </p>

        {NAV_ITEMS.map(({ href, label, icon: Icon, soon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={soon ? '#' : href}
              onClick={soon ? (e) => e.preventDefault() : undefined}
              className={cn(
                'nav-item',
                active && 'nav-item-active',
                soon && 'opacity-50 cursor-default'
              )}
            >
              <Icon size={18} className="shrink-0" />
              <span className="flex-1 text-sm font-medium">{label}</span>
              {soon && (
                <span className="text-[10px] font-semibold bg-[var(--gray-200)] text-[var(--gray-500)] px-1.5 py-0.5 rounded-full">
                  Em breve
                </span>
              )}
              {active && !soon && (
                <ChevronRight size={14} className="text-[var(--gray-500)] opacity-60" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Usuário + logout */}
      <div className="px-3 pb-5 pt-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/60 border border-[var(--gray-300)] shadow-sm">
          <Link href="/profile" className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-[var(--gray-800)] text-white flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--gray-900)] truncate">{userName}</p>
              <p className="text-xs text-[var(--gray-500)] truncate">{userEmail}</p>
            </div>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-[var(--gray-500)] hover:text-[var(--status-expense)] transition-colors p-1 rounded-lg"
            title="Sair"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
