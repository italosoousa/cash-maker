'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, List, Plus, Tag, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard',    label: 'Início',       icon: LayoutDashboard },
  { href: '/transactions', label: 'Transações',   icon: List },
  { href: '/categories',   label: 'Categorias',   icon: Tag },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav-shell">
      {NAV.slice(0, 2).map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link key={href} href={href} className={cn('bottom-nav-item', active && 'bottom-nav-item-active')}>
            <Icon size={20} />
            <span className="text-[10px] font-medium mt-0.5">{label}</span>
          </Link>
        )
      })}

      {/* Botão central + */}
      <Link
        href="/transactions?new=1"
        className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-[var(--gray-900)] text-white shadow-lg shadow-black/20 -mt-5 hover:bg-[var(--gray-800)] transition-colors"
      >
        <Plus size={22} />
      </Link>

      {NAV.slice(2).map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link key={href} href={href} className={cn('bottom-nav-item', active && 'bottom-nav-item-active')}>
            <Icon size={20} />
            <span className="text-[10px] font-medium mt-0.5">{label}</span>
          </Link>
        )
      })}

      <Link href="/profile" className={cn('bottom-nav-item', pathname === '/profile' && 'bottom-nav-item-active')}>
        <User size={20} />
        <span className="text-[10px] font-medium mt-0.5">Perfil</span>
      </Link>
    </nav>
  )
}
