import { cn } from '@/lib/utils'

interface CurrencyDisplayProps {
  value: number
  type?: 'income' | 'expense' | 'neutral'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showSign?: boolean
  showSymbol?: boolean
  className?: string
}

const SIZE_MAP = {
  sm: { value: 'text-base',   symbol: 'text-xs',  decimal: 'text-xs'  },
  md: { value: 'text-xl',     symbol: 'text-sm',  decimal: 'text-sm'  },
  lg: { value: 'text-2xl',    symbol: 'text-base', decimal: 'text-base' },
  xl: { value: 'text-4xl',    symbol: 'text-xl',  decimal: 'text-xl'  },
}

const COLOR_MAP = {
  income:  'text-[var(--status-ok)]',
  expense: 'text-[var(--status-err)]',
  neutral: 'text-[var(--ink-dark)]',
}

export function CurrencyDisplay({
  value,
  type = 'neutral',
  size = 'md',
  showSign = false,
  showSymbol = true,
  className,
}: CurrencyDisplayProps) {
  const abs     = Math.abs(value)
  const integer = Math.floor(abs).toLocaleString('pt-BR')
  const decimal = (abs % 1).toFixed(2).slice(1) // ",00"
  const sign    = showSign ? (value >= 0 ? '+' : '−') : value < 0 ? '−' : ''
  const sizes   = SIZE_MAP[size]
  const color   = COLOR_MAP[type]

  return (
    <span className={cn('font-[var(--font-mono)] font-bold tabular-nums inline-flex items-baseline gap-0.5', color, className)}>
      {sign && <span className={sizes.symbol}>{sign}</span>}
      {showSymbol && (
        <span className={cn(sizes.symbol, 'font-[var(--font-inter)] font-normal opacity-70')}>R$</span>
      )}
      <span className={sizes.value}>{integer}</span>
      <span className={sizes.decimal}>{decimal}</span>
    </span>
  )
}
