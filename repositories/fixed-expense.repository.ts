import { prisma } from '@/lib/prisma'
import type { FixedExpenseInput, UpdateFixedExpenseInput } from '@/lib/validations/fixed-expense'

const CATEGORY_SELECT = {
  id: true, name: true, icon: true, color: true, isDefault: true,
} as const

export const fixedExpenseRepository = {
  // ── Leitura ──────────────────────────────────────────────────────────────

  findAllByUser(userId: string) {
    return prisma.fixedExpense.findMany({
      where:   { userId },
      include: { category: { select: CATEGORY_SELECT } },
      orderBy: [{ isActive: 'desc' }, { nextDueDate: 'asc' }],
    })
  },

  findById(id: string, userId: string) {
    return prisma.fixedExpense.findFirst({
      where:   { id, userId },
      include: { category: { select: CATEGORY_SELECT } },
    })
  },

  // ── Usado pelo cron: busca todos ativos com nextDueDate vencida ──────────

  findDue(now: Date) {
    return prisma.fixedExpense.findMany({
      where: {
        isActive:    true,
        nextDueDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
      include: { category: { select: CATEGORY_SELECT } },
    })
  },

  // ── Escrita ──────────────────────────────────────────────────────────────

  create(data: FixedExpenseInput & { userId: string; nextDueDate: Date }) {
    return prisma.fixedExpense.create({
      data: {
        name:        data.name,
        amount:      data.amount,
        type:        data.type,
        frequency:   data.frequency,
        startDate:   new Date(data.startDate),
        endDate:     data.endDate ? new Date(data.endDate) : null,
        isActive:    true,
        nextDueDate: data.nextDueDate,
        notes:       data.notes ?? null,
        userId:      data.userId,
        categoryId:  data.categoryId,
      },
      include: { category: { select: CATEGORY_SELECT } },
    })
  },

  update(id: string, userId: string, data: UpdateFixedExpenseInput) {
    return prisma.fixedExpense.update({
      where: { id },
      data: {
        ...(data.name       !== undefined && { name:      data.name }),
        ...(data.amount     !== undefined && { amount:    data.amount }),
        ...(data.type       !== undefined && { type:      data.type }),
        ...(data.frequency  !== undefined && { frequency: data.frequency }),
        ...(data.startDate  !== undefined && { startDate: new Date(data.startDate) }),
        ...(data.endDate    !== undefined && { endDate:   data.endDate ? new Date(data.endDate) : null }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.notes      !== undefined && { notes:     data.notes ?? null }),
        ...(data.isActive   !== undefined && { isActive:  data.isActive }),
      },
      include: { category: { select: CATEGORY_SELECT } },
    })
  },

  // Avança nextDueDate após execução pelo cron — feito dentro de $transaction
  advanceNextDueDate(id: string, nextDueDate: Date) {
    return prisma.fixedExpense.update({
      where: { id },
      data:  { nextDueDate },
    })
  },

  delete(id: string, userId: string) {
    return prisma.fixedExpense.delete({ where: { id, userId } })
  },
}
