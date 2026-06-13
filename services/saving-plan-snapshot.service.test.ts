import { mockDeep, mockReset, type DeepMockProxy } from 'jest-mock-extended'
import type { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { savingPlanSnapshotService } from '@/services/saving-plan-snapshot.service'

jest.mock('@/lib/prisma', () => ({
  prisma: mockDeep<PrismaClient>(),
}))

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>

beforeEach(() => {
  mockReset(prismaMock)
})

describe('savingPlanSnapshotService.listHistory', () => {
  it('returns snapshots ordered by year then month ASC', async () => {
    prismaMock.savingPlan.findFirst.mockResolvedValue({
      id: 'plan-1', userId: 'user-1',
    } as Awaited<ReturnType<typeof prisma.savingPlan.findFirst>>)

    prismaMock.savingPlanSnapshot.findMany.mockResolvedValue([
      { month: 1, year: 2026, balance: { toString: () => '100.00' } },
      { month: 2, year: 2026, balance: { toString: () => '150.00' } },
    ] as unknown as Awaited<ReturnType<typeof prisma.savingPlanSnapshot.findMany>>)

    const result = await savingPlanSnapshotService.listHistory('user-1', 'plan-1')

    expect(prismaMock.savingPlanSnapshot.findMany).toHaveBeenCalledWith({
      where:   { savingPlanId: 'plan-1' },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    })
    expect(result).toEqual([
      { month: 1, year: 2026, balance: '100.00' },
      { month: 2, year: 2026, balance: '150.00' },
    ])
  })

  it('throws when the plan does not belong to the requesting user (RN03)', async () => {
    prismaMock.savingPlan.findFirst.mockResolvedValue(null)

    await expect(
      savingPlanSnapshotService.listHistory('user-1', 'plan-of-another-user'),
    ).rejects.toThrow('Plano não encontrado')

    expect(prismaMock.savingPlanSnapshot.findMany).not.toHaveBeenCalled()
  })
})

describe('savingPlanSnapshotService.upsertCurrentMonth', () => {
  it('upserts the snapshot for the current month/year in BRT (FR-002)', async () => {
    prismaMock.savingPlanSnapshot.upsert.mockResolvedValue(
      {} as Awaited<ReturnType<typeof prisma.savingPlanSnapshot.upsert>>,
    )

    // 2026-01-15T02:00:00Z → 2026-01-14 23:00 BRT (UTC-3)
    const now = new Date('2026-01-15T02:00:00Z')

    await savingPlanSnapshotService.upsertCurrentMonth('plan-1', 250, now)

    expect(prismaMock.savingPlanSnapshot.upsert).toHaveBeenCalledWith({
      where:  { savingPlanId_month_year: { savingPlanId: 'plan-1', month: 1, year: 2026 } },
      create: { savingPlanId: 'plan-1', month: 1, year: 2026, balance: 250 },
      update: { balance: 250 },
    })
  })

  it('a second call for the same plan/month/year updates instead of duplicating', async () => {
    prismaMock.savingPlanSnapshot.upsert.mockResolvedValue(
      {} as Awaited<ReturnType<typeof prisma.savingPlanSnapshot.upsert>>,
    )

    const now = new Date('2026-01-15T02:00:00Z')

    await savingPlanSnapshotService.upsertCurrentMonth('plan-1', 250, now)
    await savingPlanSnapshotService.upsertCurrentMonth('plan-1', 400, now)

    expect(prismaMock.savingPlanSnapshot.upsert).toHaveBeenCalledTimes(2)
    expect(prismaMock.savingPlanSnapshot.upsert).toHaveBeenLastCalledWith({
      where:  { savingPlanId_month_year: { savingPlanId: 'plan-1', month: 1, year: 2026 } },
      create: { savingPlanId: 'plan-1', month: 1, year: 2026, balance: 400 },
      update: { balance: 400 },
    })
  })
})

describe('savingPlanSnapshotService.runMonthlySnapshot', () => {
  it('upserts a snapshot for every active plan and reports the totals (FR-004/FR-005)', async () => {
    prismaMock.savingPlan.findMany.mockResolvedValue([
      { id: 'plan-1', currentAmount: { toString: () => '100' } },
      { id: 'plan-2', currentAmount: { toString: () => '200' } },
    ] as unknown as Awaited<ReturnType<typeof prisma.savingPlan.findMany>>)

    prismaMock.savingPlanSnapshot.upsert.mockResolvedValue(
      {} as Awaited<ReturnType<typeof prisma.savingPlanSnapshot.upsert>>,
    )

    const now = new Date('2026-02-01T03:01:00Z') // 00:01 BRT, dia 1

    const result = await savingPlanSnapshotService.runMonthlySnapshot(now)

    expect(prismaMock.savingPlan.findMany).toHaveBeenCalledWith({
      where:  { deletedAt: null },
      select: { id: true, currentAmount: true },
    })
    expect(prismaMock.savingPlanSnapshot.upsert).toHaveBeenCalledTimes(2)
    expect(prismaMock.savingPlanSnapshot.upsert).toHaveBeenNthCalledWith(1, {
      where:  { savingPlanId_month_year: { savingPlanId: 'plan-1', month: 2, year: 2026 } },
      create: { savingPlanId: 'plan-1', month: 2, year: 2026, balance: 100 },
      update: { balance: 100 },
    })
    expect(prismaMock.savingPlanSnapshot.upsert).toHaveBeenNthCalledWith(2, {
      where:  { savingPlanId_month_year: { savingPlanId: 'plan-2', month: 2, year: 2026 } },
      create: { savingPlanId: 'plan-2', month: 2, year: 2026, balance: 200 },
      update: { balance: 200 },
    })
    expect(result).toEqual({ processed: 2, errors: [], total: 2 })
  })

  it('only processes plans with deletedAt: null (soft-deleted plans are skipped)', async () => {
    prismaMock.savingPlan.findMany.mockResolvedValue([] as unknown as Awaited<ReturnType<typeof prisma.savingPlan.findMany>>)

    const result = await savingPlanSnapshotService.runMonthlySnapshot(new Date('2026-02-01T03:01:00Z'))

    expect(prismaMock.savingPlan.findMany).toHaveBeenCalledWith({
      where:  { deletedAt: null },
      select: { id: true, currentAmount: true },
    })
    expect(prismaMock.savingPlanSnapshot.upsert).not.toHaveBeenCalled()
    expect(result).toEqual({ processed: 0, errors: [], total: 0 })
  })

  it('is idempotent — re-running for the same month upserts (update) without erroring', async () => {
    prismaMock.savingPlan.findMany.mockResolvedValue([
      { id: 'plan-1', currentAmount: { toString: () => '100' } },
    ] as unknown as Awaited<ReturnType<typeof prisma.savingPlan.findMany>>)

    prismaMock.savingPlanSnapshot.upsert.mockResolvedValue(
      {} as Awaited<ReturnType<typeof prisma.savingPlanSnapshot.upsert>>,
    )

    const now = new Date('2026-02-01T03:01:00Z')

    const first  = await savingPlanSnapshotService.runMonthlySnapshot(now)
    const second = await savingPlanSnapshotService.runMonthlySnapshot(now)

    expect(first).toEqual({ processed: 1, errors: [], total: 1 })
    expect(second).toEqual({ processed: 1, errors: [], total: 1 })
    expect(prismaMock.savingPlanSnapshot.upsert).toHaveBeenCalledTimes(2)
  })
})
