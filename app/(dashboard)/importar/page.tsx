'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Upload, FileSpreadsheet, ArrowRight, CreditCard, Landmark, X, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ImportType } from '@/lib/importar/types'

// ── Dados dos bancos ──────────────────────────────────────────────────────────

interface Bank {
  id:          string
  name:        string
  description: string
  brand:       string        // cor principal
  accent:      string        // cor secundária / destaque
  logo:        string        // caminho da imagem em /public
}

const BANKS: Bank[] = [
  {
    id:          'nubank',
    name:        'Nubank',
    description: 'Extrato em CSV',
    brand:       '#820AD1',
    accent:      '#B66AE8',
    logo:        '/banks/nubank.jpg',
  },
  {
    id:          'banco-do-brasil',
    name:        'Banco do Brasil',
    description: 'Extrato em CSV / OFX',
    brand:       '#006BB6',
    accent:      '#FECE00',
    logo:        '/banks/banco-do-brasil.png',
  },
  {
    id:          'picpay',
    name:        'PicPay',
    description: 'Extrato em CSV',
    brand:       '#21C25E',
    accent:      '#16A34A',
    logo:        '/banks/picpay.png',
  },
  {
    id:          'bradesco',
    name:        'Bradesco',
    description: 'Extrato em CSV / OFX',
    brand:       '#CC092F',
    accent:      '#F43F5E',
    logo:        '/banks/bradesco.png',
  },
  {
    id:          'santander',
    name:        'Santander',
    description: 'Extrato em CSV / OFX',
    brand:       '#EC0000',
    accent:      '#FF4444',
    logo:        '/banks/santander.png',
  },
  {
    id:          'c6',
    name:        'C6 Bank',
    description: 'Extrato em CSV',
    brand:       '#1A1A1A',
    accent:      '#F5B100',
    logo:        '/banks/c6.png',
  },
  {
    id:          'caixa',
    name:        'Caixa Econômica',
    description: 'Extrato em CSV / OFX',
    brand:       '#0070AE',
    accent:      '#F37100',
    logo:        '/banks/caixa.jpg',
  },
  {
    id:          'inter',
    name:        'Banco Inter',
    description: 'Extrato em CSV / OFX',
    brand:       '#FF7A00',
    accent:      '#FF9E40',
    logo:        '/banks/inter.jpeg',
  },
]

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: 'Escolha o banco'  },
  { n: 2, label: 'Suba o arquivo'   },
  { n: 3, label: 'Revise e importe' },
]

const IMPORT_TYPES: { id: ImportType; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'fatura',  label: 'Fatura do cartão',  desc: 'Compras e lançamentos do cartão de crédito', icon: CreditCard },
  { id: 'extrato', label: 'Extrato da conta',   desc: 'Movimentações da conta corrente ou poupança', icon: Landmark  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ImportarPage() {
  const router = useRouter()

  const [bankId,     setBankId]     = useState<string | null>(null)
  const [importType, setImportType] = useState<ImportType | null>(null)
  const [file,       setFile]       = useState<File | null>(null)
  const [dragOver,   setDragOver]   = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  const selectedBank = BANKS.find(b => b.id === bankId)
  const step = !bankId ? 1 : !importType ? 2 : 3
  const canAnalyze = !!bankId && !!importType && !!file && !uploading

  function handleFile(f: File) {
    if (!f.name.endsWith('.csv')) { setError('Apenas arquivos .csv são aceitos'); return }
    setFile(f)
    setError(null)
  }

  async function handleAnalyze() {
    if (!canAnalyze) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bank', bankId!)
      fd.append('importType', importType!)

      const res  = await fetch('/api/importar/preview', { method: 'POST', body: fd })
      const json = await res.json()

      if (!res.ok) { setError(json.error ?? 'Erro ao processar arquivo'); return }

      sessionStorage.setItem('importar_preview', JSON.stringify(json.data))
      router.push('/importar/revisar')
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

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
        <div className="flex items-center">
          {STEPS.map(({ n, label }, i) => {
            const isActive = n === step
            const isDone   = n < step
            const isLast   = i === STEPS.length - 1
            return (
              <div key={n} className="flex items-center flex-1 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    isDone   ? 'bg-[var(--status-income)] text-white' :
                    isActive ? 'bg-[var(--gray-900)] text-white' :
                               'bg-[var(--gray-200)] text-[var(--gray-500)]'
                  )}>
                    {isDone
                      ? <svg viewBox="0 0 12 12" className="w-3 h-3"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                      : n}
                  </div>
                  <span className={cn(
                    'text-xs font-medium hidden sm:block whitespace-nowrap',
                    isActive ? 'text-[var(--gray-900)]' : 'text-[var(--gray-400)]'
                  )}>
                    {label}
                  </span>
                </div>
                {!isLast && <div className="flex-1 mx-3 h-px bg-[var(--gray-200)] min-w-4" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Passo 1: Banco ───────────────────────────────────── */}
      <div>
        <StepLabel n={1} done={!!bankId} label="Selecione seu banco" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {BANKS.map(bank => {
            const isSel = bankId === bank.id
            return (
              <button
                key={bank.id}
                type="button"
                onClick={() => { setBankId(isSel ? null : bank.id); setFile(null); setError(null) }}
                className={cn(
                  'group relative flex flex-col items-center gap-3 px-4 py-5 rounded-2xl border transition-all duration-200',
                  isSel ? 'scale-[1.02] shadow-lg' : 'bg-white/50 border-[var(--gray-300)] hover:bg-white/80 hover:shadow-md'
                )}
                style={isSel ? {
                  background:  bank.brand + '10',
                  borderColor: bank.brand + '60',
                  boxShadow:   `0 8px 32px ${bank.brand}22, inset 0 1px 0 rgba(255,255,255,0.8)`,
                } : {}}
              >
                {isSel && (
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: bank.brand }}>
                    <svg viewBox="0 0 12 12" className="w-2.5 h-2.5"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                  </div>
                )}
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-sm transition-transform duration-200 group-hover:scale-105"
                  style={isSel ? { boxShadow: `0 4px 16px ${bank.brand}44` } : {}}>
                  <Image src={bank.logo} alt={bank.name} fill className="object-cover" />
                </div>
                <div className="text-center w-full">
                  <p className="text-sm font-bold leading-tight" style={{ color: isSel ? bank.brand : 'var(--gray-900)' }}>
                    {bank.name}
                  </p>
                  <p className="text-[10px] text-[var(--gray-400)] mt-0.5">{bank.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Passo 2: Tipo de arquivo ─────────────────────────── */}
      <div className={cn('transition-all duration-300', !bankId && 'opacity-40 pointer-events-none')}>
        <StepLabel n={2} done={!!importType} label="Tipo de arquivo" />
        <div className="grid grid-cols-2 gap-3">
          {IMPORT_TYPES.map(({ id, label, desc, icon: Icon }) => {
            const isSel = importType === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => { setImportType(isSel ? null : id); setFile(null); setError(null) }}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-2xl border text-left transition-all duration-200',
                  isSel
                    ? 'bg-[var(--gray-900)] border-[var(--gray-900)] text-white shadow-md'
                    : 'bg-white/50 border-[var(--gray-300)] hover:bg-white/80 hover:shadow-sm'
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                  isSel ? 'bg-white/20' : 'bg-[var(--gray-200)]'
                )}>
                  <Icon size={17} className={isSel ? 'text-white' : 'text-[var(--gray-700)]'} />
                </div>
                <div>
                  <p className={cn('text-sm font-bold', isSel ? 'text-white' : 'text-[var(--gray-900)]')}>
                    {label}
                  </p>
                  <p className={cn('text-xs mt-0.5 leading-snug', isSel ? 'text-white/70' : 'text-[var(--gray-500)]')}>
                    {desc}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Aviso de deduplicação quando fatura selecionada */}
        {importType === 'fatura' && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
            <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-snug">
              Ao importar também o extrato da conta, o sistema identificará automaticamente o pagamento desta fatura para evitar duplicidade.
            </p>
          </div>
        )}
      </div>

      {/* ── Passo 3: Upload ──────────────────────────────────── */}
      <div className={cn('transition-all duration-300', (!bankId || !importType) && 'opacity-40 pointer-events-none')}>
        <StepLabel n={3} done={!!file} label="Selecione o arquivo CSV" />

        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />

        {file ? (
          /* Arquivo selecionado */
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-[var(--status-income)] bg-[rgba(82,183,136,0.06)]">
            <div className="w-10 h-10 rounded-xl bg-[var(--status-income)] flex items-center justify-center shrink-0">
              <FileSpreadsheet size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--gray-900)] truncate">{file.name}</p>
              <p className="text-xs text-[var(--gray-500)]">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = '' }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--gray-400)] hover:bg-[var(--gray-200)] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          /* Dropzone */
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true)  }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex flex-col items-center gap-3 py-10 px-6 text-center rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200',
              dragOver
                ? 'border-[var(--gray-700)] bg-[var(--gray-100)]'
                : 'border-[var(--gray-300)] bg-white/30 hover:border-[var(--gray-500)] hover:bg-white/50'
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
              dragOver ? 'bg-[var(--gray-900)]' : 'bg-[var(--gray-200)]'
            )}>
              <Upload size={20} className={dragOver ? 'text-white' : 'text-[var(--gray-500)]'} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--gray-700)]">
                {dragOver ? 'Solte o arquivo aqui' : 'Arraste ou clique para selecionar'}
              </p>
              <p className="text-xs text-[var(--gray-400)] mt-0.5">
                {selectedBank ? `Extrato ${importType === 'fatura' ? 'da fatura' : 'da conta'} — ${selectedBank.name} (.csv)` : 'Arquivo .csv'}
              </p>
            </div>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="mt-2 flex items-center gap-2 text-xs text-[var(--status-expense)]">
            <AlertCircle size={13} />
            {error}
          </div>
        )}
      </div>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-[var(--gray-400)]">
          {bankId && importType
            ? `${selectedBank?.name} · ${importType === 'fatura' ? 'Fatura do cartão' : 'Extrato da conta'}`
            : 'Preencha os campos acima'}
        </p>
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200',
            canAnalyze
              ? 'bg-[var(--gray-900)] text-white shadow-sm hover:bg-[var(--gray-800)]'
              : 'bg-[var(--gray-200)] text-[var(--gray-400)] cursor-not-allowed'
          )}
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
          {uploading ? 'Analisando…' : 'Analisar'}
        </button>
      </div>

      <div className="h-4" />
    </div>
  )
}

// ── Helper ────────────────────────────────────────────────────────────────────

function StepLabel({ n, done, label }: { n: number; done: boolean; label: string }) {
  return (
    <p className="text-sm font-semibold text-[var(--gray-700)] mb-3 flex items-center gap-2">
      <span className={cn(
        'w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold transition-colors',
        done ? 'bg-[var(--status-income)] text-white' : 'bg-[var(--gray-900)] text-white'
      )}>
        {done
          ? <svg viewBox="0 0 12 12" className="w-2.5 h-2.5"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
          : n}
      </span>
      {label}
    </p>
  )
}
