import { prisma } from '@/lib/prisma'

export const savingPlanSnapshotRepository = {
  findHistory(savingPlanId: string) {
    return prisma.savingPlanSnapshot.findMany({
      where:   { savingPlanId },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    })
  },

  upsertForMonth(savingPlanId: string, month: number, year: number, balance: number) {
    return prisma.savingPlanSnapshot.upsert({
      where:  { savingPlanId_month_year: { savingPlanId, month, year } },
      create: { savingPlanId, month, year, balance },
      update: { balance },
    })
  },

  findActiveSavingPlans() {
    return prisma.savingPlan.findMany({
      where:  { deletedAt: null },
      select: { id: true, currentAmount: true },
    })
  },
}
