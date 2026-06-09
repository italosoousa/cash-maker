'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  List,
  Tag,
  RefreshCw,
  BarChart3,
  Upload,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Eye,
  CreditCard,
  FileText,
  Search,
  X,
  PiggyBank,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Logo icon (inline SVG — visual identity v3) ──────────────────────────────

function LogoIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <g transform="translate(80, 80)">
        <polygon points="0,-66 57,-33 57,33 0,66 -57,33 -57,-33" fill="#E8E8F4" stroke="#C8C8E0" strokeWidth="2"/>
        <polygon points="0,-37 32,-18 32,18 0,37 -32,18 -32,-18" fill="#D8F3DC" stroke="#52B788" strokeWidth="1.5"/>
        <line x1="-21" y1="21" x2="21" y2="-21" stroke="#2D6A4F" strokeWidth="3.8" strokeLinecap="round"/>
        <polyline points="6,-21 21,-21 21,-6" fill="none" stroke="#2D6A4F" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="-21" cy="21" r="4" fill="#52B788"/>
        <polygon points="33,-33 57,-33 57,-10" fill="#C8C8E0" opacity="0.6"/>
        <polygon points="-33,33 -57,33 -57,10" fill="#E8E8F4" opacity="0.8"/>
      </g>
    </svg>
  )
}


// ─── Nav data ─────────────────────────────────────────────────────────────────

interface NavItem {
  href:   string
  label:  string
  icon:   React.ElementType
  soon?:  boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',      label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/transactions',   label: 'Transações',     icon: List },
  { href: '/categories',     label: 'Categorias',     icon: Tag },
  { href: '/fixed-expenses', label: 'Gastos Fixos',   icon: RefreshCw },
  { href: '/saving-plans',   label: 'Poupança',       icon: PiggyBank },
  { href: '/importar',       label: 'Importar',       icon: Upload },
  { href: '/reports',        label: 'Relatórios',     icon: BarChart3, soon: true },
]

const DASHBOARD_SUB: { href: string; view: string; label: string; icon: React.ElementType }[] = [
  { href: '/dashboard',              view: 'all',     label: 'Visão geral',      icon: Eye },
  { href: '/dashboard?view=fatura',  view: 'fatura',  label: 'Cartão de crédito', icon: CreditCard },
  { href: '/dashboard?view=extrato', view: 'extrato', label: 'Extrato bancário',  icon: FileText },
]

// ─── Dashboard sub-nav (needs Suspense for useSearchParams) ──────────────────

function DashboardSubNavInner({ collapsed }: { collapsed: boolean }) {
  const searchParams = useSearchParams()
  const activeView   = searchParams.get('view') ?? 'all'
  if (collapsed) return null

  return (
    <div className="mt-0.5 ml-[46px] pl-3 border-l-2 border-[rgba(200,200,224,0.3)] space-y-0.5 pb-1">
      {DASHBOARD_SUB.map(({ href, view, label, icon: Icon }) => {
        const active = activeView === view
        return (
          <Link
            key={view}
            href={href}
            className={cn(
              'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all',
              active
                ? 'bg-[var(--gray-900)] text-white'
                : 'text-[var(--gray-400)] hover:bg-[rgba(255,255,255,0.5)] hover:text-[var(--gray-700)]'
            )}
          >
            <Icon size={12} className="shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        )
      })}
    </div>
  )
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItemEl({
  item, active, collapsed, isDash, isDashPage,
}: {
  item:       NavItem
  active:     boolean
  collapsed:  boolean
  isDash:     boolean
  isDashPage: boolean
}) {
  const Icon = item.icon

  return (
    <div>
      <Link
        href={item.soon ? '#' : item.href}
        onClick={item.soon ? (e) => e.preventDefault() : undefined}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-[11px] transition-all duration-150',
          active
            ? 'bg-[var(--gray-900)] text-white shadow-[0_9px_20px_-7px_rgba(26,26,46,.5),inset_0_1px_0_rgba(255,255,255,.14)]'
            : 'text-[var(--gray-600)] hover:bg-[rgba(255,255,255,.62)] hover:text-[var(--gray-900)]',
          item.soon && 'opacity-55 cursor-default',
          collapsed && 'justify-center px-2'
        )}
      >
        <Icon
          size={18}
          className="shrink-0 transition-colors duration-150"
          style={{ color: active ? '#fff' : 'var(--gray-500)' }}
        />

        {!collapsed && (
          <>
            <span className={cn(
              'flex-1 text-[13px] whitespace-nowrap transition-colors',
              active ? 'font-semibold' : 'font-medium'
            )}>
              {item.label}
            </span>

            {item.soon ? (
              <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--gray-200)] text-[var(--gray-500)] uppercase tracking-[.08em] flex-shrink-0">
                Breve
              </span>
            ) : active ? (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green-income)] flex-shrink-0 shadow-[0_0_0_3px_rgba(82,183,136,.22)]" />
            ) : null}
          </>
        )}

        {/* Collapsed tooltip */}
        {collapsed && active && (
          <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[var(--gray-900)] text-white text-[11px] font-medium whitespace-nowrap shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
            {item.label}
          </span>
        )}
      </Link>

      {/* Dashboard sub-nav */}
      {isDash && isDashPage && (
        <Suspense fallback={null}>
          <DashboardSubNavInner collapsed={collapsed} />
        </Suspense>
      )}
    </div>
  )
}

// ─── Sidebar props ────────────────────────────────────────────────────────────

interface SidebarProps {
  userName:  string
  userEmail: string
}

export function Sidebar({ userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  function toggleCollapse() {
    setCollapsed(v => {
      localStorage.setItem('sidebar-collapsed', String(!v))
      return !v
    })
  }

  const initials = userName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const isDashPage = pathname === '/dashboard'
  const router     = useRouter()
  const [query, setQuery]                 = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    router.push(`/transactions?search=${encodeURIComponent(q)}`)
  }

  function handleCollapsedSearchClick() {
    if (collapsed) {
      setCollapsed(false)
      localStorage.setItem('sidebar-collapsed', 'false')
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }

  return (
    <aside
      className="sidebar-shell"
      data-collapsed={collapsed ? 'true' : 'false'}
    >
      {/* ── Inner card — glass neutro ──────────────────────────── */}
      <div className={cn(
        'flex flex-col flex-1 min-h-0 mx-2 my-2 rounded-2xl overflow-hidden',
        'transition-all duration-300',
        'bg-[rgba(244,244,250,0.80)] backdrop-blur-[20px]',
        'border border-[rgba(200,200,224,0.55)]',
        'shadow-[0_8px_32px_rgba(26,26,46,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]'
      )}>

        {/* ── Lockup de logo + collapse btn ───────────────────── */}
        <div className={cn(
          'flex items-center px-[15px] pt-[18px] pb-[15px] shrink-0',
          collapsed ? 'flex-col gap-2.5 px-2' : 'justify-between gap-2'
        )}>
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            {/* Mark/chip */}
            <div className={cn(
              'w-[38px] h-[38px] rounded-[11px] grid place-items-center flex-shrink-0',
              'bg-gradient-to-br from-white to-[rgba(238,238,247,.72)]',
              'border border-[rgba(200,200,224,.65)]',
              'shadow-[0_3px_10px_-2px_rgba(26,26,46,.16),inset_0_1px_0_#fff]'
            )}>
              <LogoIcon size={26} />
            </div>

            {/* Wordmark */}
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-[var(--font-space-grotesk)] font-bold text-[16px] text-[var(--gray-900)] tracking-[-0.025em] leading-[1.05]">
                  CashMaker
                </span>
                <span className="text-[8.5px] font-semibold uppercase tracking-[.1em] text-[var(--gray-500)] whitespace-nowrap mt-[3px]">
                  Finanças Pessoais
                </span>
              </div>
            )}
          </div>

          <button
            onClick={toggleCollapse}
            className="w-7 h-7 rounded-lg bg-white/60 hover:bg-white/90 flex items-center justify-center text-[var(--gray-400)] hover:text-[var(--gray-700)] transition-all shrink-0 border border-[rgba(200,200,224,0.4)]"
            title={collapsed ? 'Expandir' : 'Recolher'}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        {/* Thin divider */}
        <div className="mx-3 h-px bg-[rgba(200,200,224,0.35)] shrink-0" />

        {/* ── Search bar ───────────────────────────────────────── */}
        <div className="px-3 pt-3 pb-1 shrink-0">
          {collapsed ? (
            <button
              onClick={handleCollapsedSearchClick}
              title="Buscar transações"
              className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl bg-white/60 hover:bg-white/90 text-[var(--gray-400)] hover:text-[var(--gray-700)] border border-[rgba(200,200,224,0.3)] transition-all"
            >
              <Search size={14} />
            </button>
          ) : (
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className={cn(
                'flex items-center gap-2 rounded-xl px-3 py-2.5 transition-all',
                'bg-white/50 border border-[rgba(200,200,224,.4)]',
                searchFocused
                  ? 'bg-white/80 border-[rgba(130,130,200,0.45)] shadow-[0_0_0_3px_rgba(82,183,136,0.10)]'
                  : 'hover:bg-white/70'
              )}>
                <Search size={14} className="shrink-0 text-[var(--gray-400)]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Buscar despesas…"
                  className="flex-1 bg-transparent outline-none text-[12px] text-[var(--gray-700)] placeholder:text-[var(--gray-400)] min-w-0"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => { setQuery(''); inputRef.current?.focus() }}
                    className="text-[var(--gray-300)] hover:text-[var(--gray-500)] transition-colors shrink-0"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* ── Nav ──────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-[10px] py-2 space-y-[1px]">
          {!collapsed && (
            <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[var(--gray-400)] px-2 pt-2 pb-[6px]">
              Menu
            </p>
          )}

          {NAV_ITEMS.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <NavItemEl
                key={item.href}
                item={item}
                active={active}
                collapsed={collapsed}
                isDash={item.href === '/dashboard'}
                isDashPage={isDashPage}
              />
            )
          })}
        </nav>

        {/* Thin divider */}
        <div className="mx-3 h-px bg-[rgba(200,200,224,0.35)] shrink-0" />

        {/* ── Footer: user ─────────────────────────────────────── */}
        <div className={cn(
          'flex items-center gap-[10px] px-[14px] pt-3 pb-4 shrink-0',
          collapsed && 'justify-center px-2'
        )}>
          <div className="w-8 h-8 rounded-full bg-[var(--gray-900)] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
            {initials}
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[var(--gray-900)] truncate leading-tight">{userName}</p>
                <p className="text-[10px] text-[var(--gray-400)] truncate leading-tight">Conta pessoal</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-[var(--gray-300)] hover:text-[var(--status-expense)] transition-colors p-1 rounded-lg shrink-0"
                title="Sair"
              >
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>

      </div>
    </aside>
  )
}
