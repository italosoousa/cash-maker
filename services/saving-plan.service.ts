import { prisma } from '@/lib/prisma'
import type { Decimal } from '@prisma/client/runtime/library'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlanStatus = 'IN_PROGRESS' | 'COMPLETED' | 'BEHIND_SCHEDULE'

export interface SavingPlanData {
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

export interface CreateSavingPlanInput {
  name:          string
  icon:          string
  color:         string
  targetAmount:  number
  currentAmount: number
  dueDate?:      string | null
  notes?:        string | null
}

export interface UpdateSavingPlanInput {
  name?:          string
  icon?:          string
  color?:         string
  targetAmount?:  number
  currentAmount?: number
  dueDate?:       string | null
  notes?:         string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeStatus(
  currentAmount: number,
  targetAmount:  number,
  dueDate:       Date | null,
): PlanStatus {
  const pct = targetAmount > 0 ? currentAmount / targetAmount : 0
  if (pct >= 1) return 'COMPLETED'
  if (dueDate) {
    const now    = new Date()
    const total  = dueDate.getTime() - (new Date(now.getFullYear(), now.getMonth(), 1)).getTime()
    const elapsed = now.getTime() - (new Date(now.getFullYear(), now.getMonth(), 1)).getTime()
    const timeProgress = total > 0 ? elapsed / total : 0
    if (timeProgress > pct + 0.15) return 'BEHIND_SCHEDULE'
  }
  return 'IN_PROGRESS'
}

function remainingDays(dueDate: Date | null): number | null {
  if (!dueDate) return null
  const diff = dueDate.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function toData(p: {
  id: string; name: string; icon: string; color: string
  targetAmount: Decimal; currentAmount: Decimal
  dueDate: Date | null; notes: string | null; createdAt: Date
}): SavingPlanData {
  const target  = Number(p.targetAmount)
  const current = Number(p.currentAmount)
  const pct     = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return {
    id:            p.id,
    name:          p.name,
    icon:          p.icon,
    color:         p.color,
    targetAmount:  target,
    currentAmount: current,
    percentage:    pct,
    status:        computeStatus(current, target, p.dueDate),
    dueDate:       p.dueDate ? p.dueDate.toISOString().slice(0, 10) : null,
    remainingDays: remainingDays(p.dueDate),
    notes:         p.notes,
    createdAt:     p.createdAt.toISOString(),
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const savingPlanService = {
  async list(userId: string): Promise<SavingPlanData[]> {
    const plans = await prisma.savingPlan.findMany({
      where:   { userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    })
    return plans.map(toData)
  },

  async getSummary(userId: string) {
    const plans = await prisma.savingPlan.findMany({
      where:  { userId, deletedAt: null },
      select: { targetAmount: true, currentAmount: true },
    })
    const totalSavings = plans.reduce((s, p) => s + Number(p.currentAmount), 0)
    const totalTarget  = plans.reduce((s, p) => s + Number(p.targetAmount),  0)
    return { totalSavings, totalTarget, totalPlans: plans.length }
  },

  async create(userId: string, data: CreateSavingPlanInput): Promise<SavingPlanData> {
    const plan = await prisma.savingPlan.create({
      data: {
        userId,
        name:          data.name,
        icon:          data.icon,
        color:         data.color,
        targetAmount:  data.targetAmount,
        currentAmount: data.currentAmount,
        dueDate:       data.dueDate ? new Date(data.dueDate) : null,
        notes:         data.notes ?? null,
      },
    })
    return toData(plan)
  },

  async update(userId: string, id: string, data: UpdateSavingPlanInput): Promise<SavingPlanData> {
    const existing = await prisma.savingPlan.findFirst({ where: { id, userId, deletedAt: null } })
    if (!existing) throw new Error('Plano não encontrado')

    const plan = await prisma.savingPlan.update({
      where: { id },
      data: {
        ...(data.name          !== undefined && { name:          data.name }),
        ...(data.icon          !== undefined && { icon:          data.icon }),
        ...(data.color         !== undefined && { color:         data.color }),
        ...(data.targetAmount  !== undefined && { targetAmount:  data.targetAmount }),
        ...(data.currentAmount !== undefined && { currentAmount: data.currentAmount }),
        ...(data.dueDate       !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
        ...(data.notes         !== undefined && { notes:         data.notes }),
      },
    })
    return toData(plan)
  },

  async delete(userId: string, id: string): Promise<void> {
    const existing = await prisma.savingPlan.findFirst({ where: { id, userId, deletedAt: null } })
    if (!existing) throw new Error('Plano não encontrado')
    await prisma.savingPlan.update({
      where: { id },
      data:  { deletedAt: new Date() },
    })
  },
}
