import { prisma } from '@/lib/prisma'
import { savingPlanSnapshotRepository } from '@/repositories/saving-plan-snapshot.repository'

export interface SavingPlanSnapshotData {
  month:   number
  year:    number
  balance: string
}

function toData(s: { month: number; year: number; balance: { toString(): string } }): SavingPlanSnapshotData {
  return { month: s.month, year: s.year, balance: s.balance.toString() }
}

/** Mês/ano de `now` em America/Sao_Paulo (BRT) — mesmo padrão de services/dashboard.service.ts */
export function monthYearBRT(now: Date): { month: number; year: number } {
  const [year, month] = now
    .toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    .split('-')
    .map(Number)
  return { month, year }
}

export const savingPlanSnapshotService = {
  async listHistory(userId: string, savingPlanId: string): Promise<SavingPlanSnapshotData[]> {
    const plan = await prisma.savingPlan.findFirst({ where: { id: savingPlanId, userId } })
    if (!plan) throw new Error('Plano não encontrado')

    const snapshots = await savingPlanSnapshotRepository.findHistory(savingPlanId)
    return snapshots.map(toData)
  },

  async upsertCurrentMonth(savingPlanId: string, balance: number, now: Date = new Date()) {
    const { month, year } = monthYearBRT(now)
    return savingPlanSnapshotRepository.upsertForMonth(savingPlanId, month, year, balance)
  },

  async runMonthlySnapshot(now: Date = new Date()) {
    const plans = await savingPlanSnapshotRepository.findActiveSavingPlans()

    let processed = 0
    const errors: string[] = []

    for (const plan of plans) {
      try {
        await this.upsertCurrentMonth(plan.id, Number(plan.currentAmount), now)
        processed++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`[${plan.id}] ${msg}`)
      }
    }

    return { processed, errors, total: plans.length }
  },
}
