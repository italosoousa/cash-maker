'use client'

import { useState } from 'react'
import { Upload, FileSpreadsheet, ChevronRight, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Dados dos bancos ──────────────────────────────────────────────────────────

interface Bank {
  id:          string
  name:        string
  description: string
  brand:       string        // cor principal
  accent:      string        // cor secundária / destaque
  logo:        React.ReactNode
}

function NubankLogo() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect width="48" height="48" rx="14" fill="#820AD1" />
      <text x="24" y="31" textAnchor="middle" fill="white" fontSize="20" fontWeight="800" fontFamily="system-ui">Nu</text>
    </svg>
  )
}

function BBLogo() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect width="48" height="48" rx="14" fill="#006BB6" />
      <circle cx="24" cy="24" r="13" stroke="#FECE00" strokeWidth="3" fill="none" />
      <text x="24" y="30" textAnchor="middle" fill="#FECE00" fontSize="14" fontWeight="900" fontFamily="system-ui">BB</text>
    </svg>
  )
}

function PicPayLogo() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect width="48" height="48" rx="14" fill="#21C25E" />
      <text x="24" y="21" textAnchor="middle" fill="white" fontSize="11" fontWeight="900" fontFamily="system-ui">Pic</text>
      <text x="24" y="34" textAnchor="middle" fill="white" fontSize="11" fontWeight="900" fontFamily="system-ui">Pay</text>
    </svg>
  )
}

function BradescaLogo() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect width="48" height="48" rx="14" fill="#CC092F" />
      <circle cx="24" cy="20" r="7" fill="white" opacity="0.15" />
      <circle cx="24" cy="20" r="4" fill="white" />
      <rect x="10" y="29" width="28" height="3" rx="1.5" fill="white" opacity="0.4" />
      <rect x="14" y="34" width="20" height="3" rx="1.5" fill="white" opacity="0.25" />
    </svg>
  )
}

function SantanderLogo() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect width="48" height="48" rx="14" fill="#EC0000" />
      {/* Simplified flame/spark symbol */}
      <ellipse cx="24" cy="28" rx="10" ry="7" fill="white" opacity="0.20" />
      <ellipse cx="24" cy="28" rx="6"  ry="4" fill="white" opacity="0.30" />
      <path d="M24 14 C20 19 17 22 18 27 C19 31 24 33 24 33 C24 33 29 31 30 27 C31 22 28 19 24 14Z" fill="white" />
    </svg>
  )
}

function C6Logo() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect width="48" height="48" rx="14" fill="#1A1A1A" />
      <text x="24" y="31" textAnchor="middle" fill="#F5B100" fontSize="20" fontWeight="900" fontFamily="system-ui" letterSpacing="-1">C6</text>
    </svg>
  )
}

function SicoobLogo() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect width="48" height="48" rx="14" fill="#009640" />
      <path d="M12 24 C12 17.4 17.4 12 24 12 C30.6 12 36 17.4 36 24" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M16 29 C16 24.6 19.6 21 24 21 C28.4 21 32 24.6 32 29" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />
      <circle cx="24" cy="34" r="3" fill="white" />
    </svg>
  )
}

const BANKS: Bank[] = [
  {
    id:          'nubank',
    name:        'Nubank',
    description: 'Extrato em CSV',
    brand:       '#820AD1',
    accent:      '#B66AE8',
    logo:        <NubankLogo />,
  },
  {
    id:          'banco-do-brasil',
    name:        'Banco do Brasil',
    description: 'Extrato em CSV / OFX',
    brand:       '#006BB6',
    accent:      '#FECE00',
    logo:        <BBLogo />,
  },
  {
    id:          'picpay',
    name:        'PicPay',
    description: 'Extrato em CSV',
    brand:       '#21C25E',
    accent:      '#16A34A',
    logo:        <PicPayLogo />,
  },
  {
    id:          'bradesco',
    name:        'Bradesco',
    description: 'Extrato em CSV / OFX',
    brand:       '#CC092F',
    accent:      '#F43F5E',
    logo:        <BradescaLogo />,
  },
  {
    id:          'santander',
    name:        'Santander',
    description: 'Extrato em CSV / OFX',
    brand:       '#EC0000',
    accent:      '#FF4444',
    logo:        <SantanderLogo />,
  },
  {
    id:          'c6',
    name:        'C6 Bank',
    description: 'Extrato em CSV',
    brand:       '#1A1A1A',
    accent:      '#F5B100',
    logo:        <C6Logo />,
  },
  {
    id:          'sicoob',
    name:        'Sicoob',
    description: 'Extrato em CSV / OFX',
    brand:       '#009640',
    accent:      '#4ADE80',
    logo:        <SicoobLogo />,
  },
]

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: 'Escolha o banco'    },
  { n: 2, label: 'Suba o arquivo'     },
  { n: 3, label: 'Revise e importe'   },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ImportarPage() {
  const [selected, setSelected] = useState<string | null>(null)

  const selectedBank = BANKS.find(b => b.id === selected)

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Header ───────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--gray-900)] font-[var(--font-space-grotesk)]">
          Subir planilha
        </h1>
        <p className="text-sm text-[var(--gray-500)] mt-0.5">
          Importe seu extrato bancário e registre tudo automaticamente
        </p>
      </div>

      {/* ── Steps ────────────────────────────────────────────── */}
      <div className="glass-card px-6 py-4">
        <div className="flex items-center gap-0">
          {STEPS.map((step, i) => {
            const isActive   = step.n === 1
            const isDone     = false
            const isLast     = i === STEPS.length - 1
            return (
              <div key={step.n} className="flex items-center gap-0 flex-1 min-w-0">
                {/* Step pill */}
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                      isActive || isDone
                        ? 'bg-[var(--gray-900)] text-white'
                        : 'bg-[var(--gray-200)] text-[var(--gray-500)]'
                    )}
                  >
                    {step.n}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium hidden sm:block whitespace-nowrap',
                      isActive ? 'text-[var(--gray-900)]' : 'text-[var(--gray-400)]'
                    )}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector */}
                {!isLast && (
                  <div className="flex-1 mx-3 h-px bg-[var(--gray-200)] min-w-4" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Bank grid ────────────────────────────────────────── */}
      <div>
        <p className="text-sm font-semibold text-[var(--gray-700)] mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[var(--gray-900)] text-white text-[10px] flex items-center justify-center font-bold">1</span>
          Selecione seu banco
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {BANKS.map(bank => {
            const isSelected = selected === bank.id
            return (
              <button
                key={bank.id}
                type="button"
                onClick={() => setSelected(isSelected ? null : bank.id)}
                className={cn(
                  'group relative flex flex-col items-center gap-3 px-4 py-5 rounded-2xl border text-left transition-all duration-200',
                  isSelected
                    ? 'scale-[1.02] shadow-lg'
                    : 'bg-white/50 border-[var(--gray-300)] hover:bg-white/80 hover:border-[var(--gray-400)] hover:shadow-md'
                )}
                style={isSelected ? {
                  background:   bank.brand + '10',
                  borderColor:  bank.brand + '60',
                  boxShadow:    `0 8px 32px ${bank.brand}22, inset 0 1px 0 rgba(255,255,255,0.8)`,
                } : {}}
              >
                {/* Selected ring indicator */}
                {isSelected && (
                  <div
                    className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: bank.brand }}
                  >
                    <svg viewBox="0 0 12 12" className="w-2.5 h-2.5">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                )}

                {/* Logo */}
                <div
                  className="w-14 h-14 rounded-2xl overflow-hidden shadow-sm transition-transform duration-200 group-hover:scale-105"
                  style={isSelected ? { boxShadow: `0 4px 16px ${bank.brand}44` } : {}}
                >
                  {bank.logo}
                </div>

                {/* Info */}
                <div className="text-center w-full">
                  <p
                    className="text-sm font-bold leading-tight"
                    style={{ color: isSelected ? bank.brand : 'var(--gray-900)' }}
                  >
                    {bank.name}
                  </p>
                  <p className="text-[10px] text-[var(--gray-400)] mt-0.5">{bank.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Upload area (locked) ──────────────────────────────── */}
      <div
        className={cn(
          'rounded-2xl border-2 border-dashed transition-all duration-300',
          selected
            ? 'border-[var(--gray-300)] bg-white/40'
            : 'border-[var(--gray-200)] bg-[var(--gray-100)]/40 opacity-50 pointer-events-none'
        )}
      >
        <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
          <div
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300',
              selected ? 'bg-[var(--gray-900)]' : 'bg-[var(--gray-200)]'
            )}
          >
            <FileSpreadsheet size={24} className={selected ? 'text-white' : 'text-[var(--gray-400)]'} />
          </div>

          {selected ? (
            <>
              <div>
                <p className="text-sm font-semibold text-[var(--gray-900)]">
                  Arraste o extrato do {selectedBank?.name} aqui
                </p>
                <p className="text-xs text-[var(--gray-500)] mt-0.5">
                  ou clique para selecionar — {selectedBank?.description}
                </p>
              </div>
              <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-[var(--gray-200)] text-[var(--gray-500)]">
                Disponível em breve
              </span>
            </>
          ) : (
            <div>
              <p className="text-sm font-semibold text-[var(--gray-400)]">
                Selecione um banco primeiro
              </p>
              <p className="text-xs text-[var(--gray-400)] mt-0.5">
                O campo de upload será liberado após a seleção
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-[var(--gray-400)]">
          {selected
            ? `Banco selecionado: ${selectedBank?.name}`
            : 'Nenhum banco selecionado'}
        </p>

        <button
          disabled={!selected}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200',
            selected
              ? 'bg-[var(--gray-900)] text-white shadow-sm hover:bg-[var(--gray-800)]'
              : 'bg-[var(--gray-200)] text-[var(--gray-400)] cursor-not-allowed'
          )}
        >
          Continuar
          <ArrowRight size={15} />
        </button>
      </div>

      <div className="h-4" />
    </div>
  )
}
