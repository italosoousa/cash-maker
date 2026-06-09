'use client'

import { useState, useEffect, useCallback } from 'react'
import * as LucideIcons from 'lucide-react'
import {
  Plus, Trash2, X, ChevronRight, PiggyBank, Target,
  Layers, Pencil, Check, AlertTriangle, TrendingUp,
  Lightbulb, Calendar, Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────

type PlanStatus = 'IN_PROGRESS' | 'COMPLETED' | 'BEHIND_SCHEDULE'

interface SavingPlanData {
  id:            string
  name:          string
  icon:          string
  color:         string
  targetAmount:  number
  currentAmount: number
  percentage:    number
  status:        PlanStatus
  dueDate:       string | null
  remainingDays: number | null
  notes:         string | null
  createdAt:     string
}

interface Summary {
  totalSavings: number
  totalTarget:  number
  totalPlans:   number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ICON_OPTIONS = [
  { name: 'PiggyBank',     label: 'Poupança'    },
  { name: 'Shield',        label: 'Emergência'  },
  { name: 'Plane',         label: 'Viagem'      },
  { name: 'Home',          label: 'Moradia'     },
  { name: 'GraduationCap', label: 'Educação'    },
  { name: 'Car',           label: 'Veículo'     },
  { name: 'Heart',         label: 'Saúde'       },
  { name: 'Star',          label: 'Sonho'       },
  { name: 'Briefcase',     label: 'Negócio'     },
  { name: 'Gift',          label: 'Presente'    },
  { name: 'Laptop',        label: 'Tecnologia'  },
  { name: 'Baby',          label: 'Família'     },
]

const COLOR_OPTIONS = [
  '#52B788', '#2D6A4F', '#74C69D', '#1B4332',
  '#6B9E82', '#40916C', '#95D5B2', '#081C15',
  '#E07A5F', '#F2CC8F', '#81B29A', '#3D405B',
]

const SAVING_TIPS: Record<string, string[]> = {
  PiggyBank:     ['Separe 20% da sua renda todo mês.', 'Automatize sua poupança.', 'Evite retiradas desnecessárias.'],
  Shield:        ['Mantenha 3–6 meses de despesas.', 'Deixe em conta de fácil acesso.', 'Não use para outros fins.'],
  Plane:         ['Pesquise passagens com antecedência.', 'Economize R$21/dia por 95 dias.', 'Use cashback para ajudar.'],
  Home:          ['Consulte programas habitacionais.', 'Separe pelo menos 20% do valor.', 'Evite FGTS para outros fins.'],
  GraduationCap: ['Invista em cursos online primeiro.', 'Busque bolsas e financiamentos.', 'Separe pequenas quantias semanais.'],
  Car:           ['Pesquise consórcios sem juros.', 'Dê entrada maior para parcelas menores.', 'Considere carros seminovos.'],
  default:       ['Defina um valor fixo mensal.', 'Revise suas metas a cada trimestre.', 'Comemore cada marco atingido.'],
}

const STATUS_CONFIG: Record<PlanStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  IN_PROGRESS:    { label: 'Em Progresso',  color: '#52B788', bg: 'rgba(82,183,136,0.12)',  icon: TrendingUp    },
  COMPLETED:      { label: 'Concluído',     color: '#2D6A4F', bg: 'rgba(45,106,79,0.12)',   icon: Check         },
  BEHIND_SCHEDULE:{ label: 'Atrasado',      color: '#E07A5F', bg: 'rgba(224,122,95,0.12)',  icon: AlertTriangle },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function getLucideIcon(name: string): React.ElementType {
  const pascal = name.charAt(0).toUpperCase() + name.slice(1)
  return (LucideIcons as unknown as Record<string, React.ElementType>)[pascal] ?? PiggyBank
}

function mockMonthlyData(plan: SavingPlanData) {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const now    = new Date()
  const curM   = now.getMonth()
  const step   = plan.currentAmount / Math.max(curM + 1, 1)
  return months.slice(0, curM + 1).map((label, i) => ({
    label,
    value: Math.round(step * (i + 1) * (0.85 + Math.random() * 0.3)),
  }))
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string
}) {
  return (
    <div className="glass-card flex items-center justify-between p-5">
      <div>
        <p className="text-[12px] text-[var(--ink-soft)] font-medium mb-1">{label}</p>
        <p className="text-[22px] font-bold font-[JetBrains_Mono] text-[var(--ink-dark)]">{value}</p>
        {sub && (
          <p className="text-[11px] text-[var(--green-mid)] font-medium mt-0.5">{sub}</p>
        )}
      </div>
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        <Icon size={20} color={color} />
      </div>
    </div>
  )
}

function ProgressBar({ pct, color, height = 6 }: { pct: number; color: string; height?: number }) {
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height, background: 'rgba(200,200,224,0.25)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width:      `${Math.min(100, pct)}%`,
          background: pct >= 100
            ? 'linear-gradient(90deg,#2D6A4F,#52B788)'
            : `linear-gradient(90deg,${color}cc,${color})`,
        }}
      />
    </div>
  )
}

function PlanCard({
  plan, active, onClick, onDelete,
}: {
  plan:     SavingPlanData
  active:   boolean
  onClick:  () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const Icon   = getLucideIcon(plan.icon)
  const status = STATUS_CONFIG[plan.status]

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border',
        active
          ? 'bg-[var(--green-frost)] border-[var(--green-mist)] shadow-[0_2px_12px_rgba(45,106,79,0.10)]'
          : 'bg-white/50 border-transparent hover:bg-white/80 hover:border-[rgba(200,200,224,0.35)]'
      )}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${plan.color}18`, border: `1px solid ${plan.color}30` }}
      >
        <Icon size={16} color={plan.color} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-[13px] font-semibold text-[var(--ink-dark)] truncate">{plan.name}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="text-[11px] font-bold"
              style={{ color: status.color }}
            >
              {plan.percentage}%
            </span>
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap"
              style={{ color: status.color, background: status.bg }}
            >
              {status.label}
            </span>
          </div>
        </div>
        <ProgressBar pct={plan.percentage} color={plan.color} height={5} />
        <p className="text-[10px] text-[var(--ink-soft)] mt-1.5">
          {fmt(plan.currentAmount)} <span className="text-[var(--ink-ghost)]">/ {fmt(plan.targetAmount)}</span>
        </p>
      </div>

      {/* Delete btn */}
      <button
        onClick={onDelete}
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-[var(--ink-ghost)] hover:text-[var(--status-err)] hover:bg-red-50 transition-all"
      >
        <Trash2 size={11} />
      </button>
    </div>
  )
}

function DetailPanel({ plan }: { plan: SavingPlanData }) {
  const Icon   = getLucideIcon(plan.icon)
  const status = STATUS_CONFIG[plan.status]
  const StatusIcon = status.icon
  const tips   = SAVING_TIPS[plan.icon] ?? SAVING_TIPS.default
  const chartData = mockMonthlyData(plan)

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ── Plan Detail Card ─────────────────────────────────────── */}
      <div className="glass-card p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: `${plan.color}18`, border: `1px solid ${plan.color}30` }}
          >
            <Icon size={22} color={plan.color} />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[var(--ink-dark)]">{plan.name}</h2>
            <div
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5"
              style={{ color: status.color, background: status.bg }}
            >
              <StatusIcon size={9} />
              {status.label}
            </div>
          </div>
        </div>

        {/* Amounts */}
        <div className="mb-3">
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-[28px] font-bold font-[JetBrains_Mono] text-[var(--ink-dark)]">
              {fmt(plan.currentAmount)}
            </span>
            <span className="text-[14px] text-[var(--ink-ghost)] font-[JetBrains_Mono]">
              / {fmt(plan.targetAmount)}
            </span>
          </div>
          <ProgressBar pct={plan.percentage} color={plan.color} height={10} />
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px] text-[var(--ink-soft)]">{plan.percentage}% atingido</span>
            <span className="text-[11px] text-[var(--ink-soft)]">
              Faltam {fmt(Math.max(0, plan.targetAmount - plan.currentAmount))}
            </span>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex gap-4 pt-3 border-t border-[rgba(200,200,224,0.3)]">
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-[var(--ink-ghost)]" />
            <div>
              <p className="text-[9px] text-[var(--ink-ghost)] uppercase tracking-wider">Prazo</p>
              <p className="text-[12px] font-semibold text-[var(--ink-dark)]">{fmtDate(plan.dueDate)}</p>
            </div>
          </div>
          {plan.remainingDays !== null && (
            <div className="flex items-center gap-2">
              <Clock size={13} className="text-[var(--ink-ghost)]" />
              <div>
                <p className="text-[9px] text-[var(--ink-ghost)] uppercase tracking-wider">Restam</p>
                <p className="text-[12px] font-semibold text-[var(--ink-dark)]">{plan.remainingDays} dias</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Saving Tips ──────────────────────────────────────────── */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={14} color="#F2CC8F" />
          <h3 className="text-[13px] font-semibold text-[var(--ink-dark)]">Dicas de Poupança</h3>
        </div>
        <ul className="space-y-2">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                style={{ background: plan.color }}
              />
              <p className="text-[12px] text-[var(--ink-mid)]">{tip}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Balance Chart ─────────────────────────────────────────── */}
      <div className="glass-card p-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-[var(--ink-dark)]">Evolução</h3>
          <span className="text-[10px] text-[var(--ink-ghost)] bg-[rgba(200,200,224,0.25)] px-2 py-0.5 rounded-full">
            Este ano
          </span>
        </div>
        {chartData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,200,224,0.3)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--ink-ghost)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'var(--ink-ghost)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(244,244,250,0.96)',
                  border: '1px solid rgba(200,200,224,0.5)',
                  borderRadius: 10,
                  fontSize: 11,
                  boxShadow: '0 4px 16px rgba(26,26,46,0.10)',
                }}
                formatter={(v) => [fmt(Number(v ?? 0)), 'Poupado']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={plan.color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: plan.color }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[120px] flex items-center justify-center">
            <p className="text-[12px] text-[var(--ink-ghost)]">Dados insuficientes para o gráfico</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

interface FormState {
  name:          string
  icon:          string
  color:         string
  targetAmount:  string
  currentAmount: string
  dueDate:       string
  notes:         string
}

const EMPTY_FORM: FormState = {
  name: '', icon: 'PiggyBank', color: '#52B788',
  targetAmount: '', currentAmount: '0', dueDate: '', notes: '',
}

function PlanModal({
  open, onClose, onSave, loading, initial,
}: {
  open:    boolean
  onClose: () => void
  onSave:  (f: FormState) => void
  loading: boolean
  initial?: SavingPlanData | null
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              name:          initial.name,
              icon:          initial.icon,
              color:         initial.color,
              targetAmount:  String(initial.targetAmount),
              currentAmount: String(initial.currentAmount),
              dueDate:       initial.dueDate ?? '',
              notes:         initial.notes ?? '',
            }
          : EMPTY_FORM
      )
    }
  }, [open, initial])

  if (!open) return null

  function set(k: keyof FormState, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  const SelectedIcon = getLucideIcon(form.icon)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative w-full max-w-md rounded-3xl p-6 z-10',
        'bg-[rgba(244,244,250,0.97)] backdrop-blur-[20px]',
        'border border-[rgba(200,200,224,0.55)]',
        'shadow-[0_32px_80px_rgba(26,26,46,0.20)]',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-bold text-[var(--ink-dark)]">
            {initial ? 'Editar Plano' : 'Novo Plano de Poupança'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/60 hover:bg-white/90 flex items-center justify-center text-[var(--ink-ghost)] hover:text-[var(--ink-dark)] border border-[rgba(200,200,224,0.4)] transition-all"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--ink-soft)] uppercase tracking-wider mb-1.5">
              Nome do Plano
            </label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Ex: Fundo de Emergência"
              className="w-full rounded-xl px-3.5 py-2.5 text-[13px] bg-white/70 border border-[rgba(200,200,224,0.5)] outline-none focus:border-[var(--green-mid)] focus:shadow-[0_0_0_3px_rgba(82,183,136,0.10)] text-[var(--ink-dark)] placeholder:text-[var(--ink-ghost)] transition-all"
            />
          </div>

          {/* Icon picker */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--ink-soft)] uppercase tracking-wider mb-1.5">
              Ícone
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {ICON_OPTIONS.map(opt => {
                const Ic = getLucideIcon(opt.name)
                return (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => set('icon', opt.name)}
                    title={opt.label}
                    className={cn(
                      'w-full aspect-square rounded-xl flex items-center justify-center transition-all border',
                      form.icon === opt.name
                        ? 'border-[var(--green-mid)] bg-[var(--green-frost)]'
                        : 'border-[rgba(200,200,224,0.4)] bg-white/50 hover:bg-white/90'
                    )}
                  >
                    <Ic size={16} color={form.icon === opt.name ? form.color : '#AAA'} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--ink-soft)] uppercase tracking-wider mb-1.5">
              Cor
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{
                    background:   c,
                    borderColor:  form.color === c ? '#1A1A2E' : 'transparent',
                    boxShadow:    form.color === c ? '0 0 0 2px white, 0 0 0 4px ' + c : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--ink-soft)] uppercase tracking-wider mb-1.5">
                Meta (R$)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.targetAmount}
                onChange={e => set('targetAmount', e.target.value)}
                placeholder="10.000,00"
                className="w-full rounded-xl px-3.5 py-2.5 text-[13px] bg-white/70 border border-[rgba(200,200,224,0.5)] outline-none focus:border-[var(--green-mid)] focus:shadow-[0_0_0_3px_rgba(82,183,136,0.10)] text-[var(--ink-dark)] placeholder:text-[var(--ink-ghost)] transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--ink-soft)] uppercase tracking-wider mb-1.5">
                Já Guardado (R$)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.currentAmount}
                onChange={e => set('currentAmount', e.target.value)}
                placeholder="0,00"
                className="w-full rounded-xl px-3.5 py-2.5 text-[13px] bg-white/70 border border-[rgba(200,200,224,0.5)] outline-none focus:border-[var(--green-mid)] focus:shadow-[0_0_0_3px_rgba(82,183,136,0.10)] text-[var(--ink-dark)] placeholder:text-[var(--ink-ghost)] transition-all"
              />
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--ink-soft)] uppercase tracking-wider mb-1.5">
              Prazo (opcional)
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={e => set('dueDate', e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-[13px] bg-white/70 border border-[rgba(200,200,224,0.5)] outline-none focus:border-[var(--green-mid)] focus:shadow-[0_0_0_3px_rgba(82,183,136,0.10)] text-[var(--ink-dark)] transition-all [color-scheme:light]"
            />
          </div>

          {/* Preview */}
          <div
            className="flex items-center gap-3 p-3 rounded-2xl border"
            style={{ background: `${form.color}0D`, borderColor: `${form.color}30` }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${form.color}20` }}
            >
              <SelectedIcon size={18} color={form.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[var(--ink-dark)] truncate">
                {form.name || 'Nome do plano'}
              </p>
              <p className="text-[11px] text-[var(--ink-ghost)]">
                {form.currentAmount || '0'} / {form.targetAmount || '0'} •{' '}
                {form.targetAmount
                  ? Math.min(100, Math.round((parseFloat(form.currentAmount || '0') / parseFloat(form.targetAmount)) * 100)) + '%'
                  : '0%'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[rgba(200,200,224,0.5)] text-[13px] font-medium text-[var(--ink-soft)] hover:bg-white/60 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={loading || !form.name || !form.targetAmount}
            className="flex-1 py-2.5 rounded-xl bg-[var(--green-deep)] text-white text-[13px] font-semibold hover:bg-[#1B4332] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Salvando...' : initial ? 'Salvar' : 'Criar Plano'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SavingPlansPage() {
  const [plans,      setPlans]      = useState<SavingPlanData[]>([])
  const [summary,    setSummary]    = useState<Summary>({ totalSavings: 0, totalTarget: 0, totalPlans: 0 })
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState<SavingPlanData | null>(null)
  const [formOpen,   setFormOpen]   = useState(false)
  const [editing,    setEditing]    = useState<SavingPlanData | null>(null)
  const [deleteId,   setDeleteId]   = useState<string | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [delLoading,  setDelLoading]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/saving-plans')
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.data) {
        toast.error(json?.error ?? 'Erro ao carregar planos')
        return
      }
      setPlans(json.data.plans ?? [])
      setSummary(json.data.summary ?? { totalSavings: 0, totalTarget: 0, totalPlans: 0 })
      setSelected(prev => {
        if (prev) return json.data.plans.find((p: SavingPlanData) => p.id === prev.id) ?? json.data.plans[0] ?? null
        return json.data.plans[0] ?? null
      })
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  async function handleSave(form: FormState) {
    const target  = parseFloat(form.targetAmount)
    const current = parseFloat(form.currentAmount || '0')
    if (isNaN(target) || target <= 0) { toast.error('Informe um valor de meta válido'); return }
    if (isNaN(current) || current < 0) { toast.error('Valor guardado inválido'); return }

    setSaveLoading(true)
    try {
      const body = {
        name:          form.name,
        icon:          form.icon,
        color:         form.color,
        targetAmount:  target,
        currentAmount: current,
        dueDate:       form.dueDate || null,
        notes:         form.notes   || null,
      }

      if (editing) {
        const res  = await fetch(`/api/saving-plans/${editing.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          toast.error((json as { error?: string }).error ?? 'Erro ao salvar'); return
        }
        const json = await res.json()
        toast.success('Plano atualizado!')
        setSelected(json.data)
      } else {
        const res  = await fetch('/api/saving-plans', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          toast.error((json as { error?: string }).error ?? 'Erro ao criar'); return
        }
        const json = await res.json()
        toast.success('Plano criado!')
        setSelected(json.data)
      }

      setFormOpen(false)
      setEditing(null)
      await load()
    } finally {
      setSaveLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDelLoading(true)
    try {
      const res = await fetch(`/api/saving-plans/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Erro ao excluir'); return }
      toast.success('Plano removido')
      setDeleteId(null)
      if (selected?.id === deleteId) setSelected(null)
      await load()
    } finally {
      setDelLoading(false)
    }
  }

  const totalPct = summary.totalTarget > 0
    ? Math.min(100, Math.round((summary.totalSavings / summary.totalTarget) * 100))
    : 0

  return (
    <>
      <div className="flex flex-col gap-5 p-4 md:p-6 h-full">

        {/* ── Page header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-[var(--ink-dark)] font-[var(--font-space-grotesk)]">
              Planos de Poupança
            </h1>
            <p className="text-[13px] text-[var(--ink-soft)] mt-0.5">
              Organize suas metas financeiras e acompanhe o progresso
            </p>
          </div>
          <button
            onClick={() => { setEditing(null); setFormOpen(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--green-deep)] text-white text-[13px] font-semibold hover:bg-[#1B4332] transition-all shadow-[0_4px_16px_rgba(45,106,79,0.25)]"
          >
            <Plus size={15} />
            Novo Plano
          </button>
        </div>

        {/* ── Summary cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            icon={PiggyBank}
            label="Total Guardado"
            value={fmt(summary.totalSavings)}
            sub={`${totalPct}% da meta total`}
            color="#52B788"
          />
          <SummaryCard
            icon={Target}
            label="Meta Total"
            value={fmt(summary.totalTarget)}
            sub={summary.totalPlans > 0 ? `em ${summary.totalPlans} plano${summary.totalPlans > 1 ? 's' : ''}` : undefined}
            color="#E07A5F"
          />
          <SummaryCard
            icon={Layers}
            label="Total de Planos"
            value={String(summary.totalPlans)}
            sub={plans.filter(p => p.status === 'COMPLETED').length + ' concluído(s)'}
            color="#81B29A"
          />
        </div>

        {/* ── Main content: list + detail ──────────────────────────── */}
        <div className="flex gap-4 flex-1 min-h-0">

          {/* ── Left: plan list ──────────────────────────── */}
          <div className="flex flex-col w-[340px] shrink-0">
            <div className="glass-card flex flex-col flex-1 min-h-0 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-semibold text-[var(--ink-dark)]">Meus Planos</h2>
                <span className="text-[10px] text-[var(--ink-ghost)] bg-[rgba(200,200,224,0.25)] px-2 py-0.5 rounded-full">
                  {plans.length} planos
                </span>
              </div>

              {/* Plan list */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-2xl bg-[rgba(200,200,224,0.25)] animate-pulse" />
                  ))
                ) : plans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <PiggyBank size={36} className="text-[var(--ink-ghost)] mb-3" />
                    <p className="text-[13px] font-medium text-[var(--ink-soft)]">Nenhum plano criado</p>
                    <p className="text-[12px] text-[var(--ink-ghost)] mt-1">
                      Crie seu primeiro plano de poupança
                    </p>
                  </div>
                ) : (
                  plans.map(plan => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      active={selected?.id === plan.id}
                      onClick={() => setSelected(plan)}
                      onDelete={e => { e.stopPropagation(); setDeleteId(plan.id) }}
                    />
                  ))
                )}
              </div>

              {/* Add plan button */}
              <button
                onClick={() => { setEditing(null); setFormOpen(true) }}
                className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl border-2 border-dashed border-[rgba(82,183,136,0.35)] text-[12px] font-medium text-[var(--green-mid)] hover:border-[var(--green-mid)] hover:bg-[var(--green-frost)] transition-all"
              >
                <Plus size={13} />
                Adicionar Plano
              </button>
            </div>
          </div>

          {/* ── Right: detail ──────────────────────────────── */}
          <div className="flex-1 min-w-0 min-h-0 overflow-y-auto">
            {selected ? (
              <div className="relative">
                {/* Edit button */}
                <button
                  onClick={() => { setEditing(selected); setFormOpen(true) }}
                  className="absolute top-0 right-0 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 border border-[rgba(200,200,224,0.4)] text-[11px] font-medium text-[var(--ink-soft)] hover:bg-white/90 transition-all"
                >
                  <Pencil size={11} />
                  Editar
                </button>
                <DetailPanel plan={selected} />
              </div>
            ) : (
              <div className="glass-card h-full flex flex-col items-center justify-center text-center p-12">
                <div className="w-16 h-16 rounded-3xl bg-[var(--green-frost)] flex items-center justify-center mb-4">
                  <ChevronRight size={28} className="text-[var(--green-mid)]" />
                </div>
                <p className="text-[15px] font-semibold text-[var(--ink-dark)] mb-1">
                  Selecione um plano
                </p>
                <p className="text-[13px] text-[var(--ink-ghost)]">
                  Clique em um plano à esquerda para ver os detalhes
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      <PlanModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        onSave={handleSave}
        loading={saveLoading}
        initial={editing}
      />

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl border border-[rgba(200,200,224,0.5)] bg-[rgba(244,244,250,0.97)] backdrop-blur-[20px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[var(--ink-dark)]">Excluir plano?</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--ink-soft)]">
              Esta ação não pode ser desfeita. O plano e seus dados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={delLoading}
              className="rounded-xl bg-[var(--status-err)] hover:bg-[#c0614a] text-white border-0"
            >
              {delLoading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
