import { TrendingUp, TrendingDown } from 'lucide-react'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { cn } from '@/lib/utils'

interface SummaryCardProps {
  label:     string
  value:     number
  type:      'income' | 'expense' | 'neutral'
  icon:      React.ElementType
  variation?: number   // percentual vs período anterior
  loading?:  boolean
}

export function SummaryCard({ label, value, type, icon: Icon, variation, loading }: SummaryCardProps) {
  const iconColor = type === 'income' ? 'var(--status-ok)'
    : type === 'expense' ? 'var(--status-err)'
    : value < 0 ? 'var(--status-err)' : 'var(--status-ok)'

  const isNeg = typeof variation === 'number' && variation < 0

  return (
    <div className="glass-card p-5 flex flex-col gap-3 hover:shadow-[0_16px_40px_rgba(45,106,79,0.14)] transition-all duration-200">
      {/* Ícone + label */}
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: iconColor + '22' }}
        >
          <Icon size={20} style={{ color: iconColor }} />
        </div>
        {typeof variation === 'number' && !loading && (
          <span className={cn(
            'flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full',
            isNeg
              ? 'bg-red-50 text-[var(--status-err)]'
              : 'bg-[var(--green-frost)] text-[var(--status-ok)]'
          )}>
            {isNeg ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
            {Math.abs(variation)}%
          </span>
        )}
      </div>

      {/* Valor */}
      {loading ? (
        <>
          <div className="skeleton h-8 w-32 rounded-lg" />
          <div className="skeleton h-3 w-24 rounded" />
        </>
      ) : (
        <>
          <CurrencyDisplay
            value={value}
            type={type === 'neutral' ? (value < 0 ? 'expense' : 'income') : type}
            size="lg"
          />
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ink-ghost)]">
            {label}
          </p>
        </>
      )}
    </div>
  )
}
