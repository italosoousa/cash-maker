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
  const isNeg = typeof variation === 'number' && variation < 0

  const cardClass =
    type === 'income'  ? 'glass-card-income' :
    type === 'expense' ? 'glass-card-expense' :
    'glass-card'

  const iconColor =
    type === 'income'  ? 'var(--status-income)'  :
    type === 'expense' ? 'var(--status-expense)' :
    value < 0          ? 'var(--status-expense)' : 'var(--status-income)'

  return (
    <div className={cn(
      cardClass,
      'p-5 flex flex-col gap-3 transition-all duration-200 hover:shadow-[0_16px_40px_rgba(26,26,46,0.12)]'
    )}>
      {/* Ícone + variação */}
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
              ? 'bg-[rgba(244,230,226,0.8)] text-[var(--status-expense)]'
              : 'bg-[var(--green-frost)] text-[var(--status-income)]'
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
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--gray-500)]">
            {label}
          </p>
        </>
      )}
    </div>
  )
}
