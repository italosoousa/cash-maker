import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { TransactionInput, TransactionFilters } from '@/lib/validations/transaction'

export const transactionRepository = {
  async findAllByUser(userId: string, filters: TransactionFilters) {
    const { type, categoryId, startDate, endDate, page, limit } = filters
    const skip = (page - 1) * limit

    const where: Prisma.TransactionWhereInput = {
      userId,
      deletedAt: null,
      ...(type && type !== 'ALL' && { type }),
      ...(categoryId && { categoryId }),
      ...(startDate || endDate
        ? {
            date: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate   && { lte: new Date(endDate) }),
            },
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: { select: { id: true, name: true, icon: true, color: true } } },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ])

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
  },

  findById(id: string, userId: string) {
    return prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
      include: { category: true },
    })
  },

  create(data: TransactionInput & { userId: string }) {
    return prisma.transaction.create({
      data: { ...data, date: new Date(data.date) },
      include: { category: true },
    })
  },

  update(id: string, userId: string, data: Partial<TransactionInput>) {
    return prisma.transaction.update({
      where: { id, userId },
      data:  { ...data, ...(data.date && { date: new Date(data.date) }) },
      include: { category: true },
    })
  },

  softDelete(id: string, userId: string) {
    return prisma.transaction.update({
      where: { id, userId },
      data:  { deletedAt: new Date() },
    })
  },

  async getBalance(userId: string) {
    const result = await prisma.transaction.groupBy({
      by:     ['type'],
      where:  { userId, deletedAt: null },
      _sum:   { amount: true },
    })

    const income  = result.find(r => r.type === 'INCOME')?._sum.amount  ?? new Prisma.Decimal(0)
    const expense = result.find(r => r.type === 'EXPENSE')?._sum.amount ?? new Prisma.Decimal(0)
    const balance = Number(income) - Number(expense)

    return { income: Number(income), expense: Number(expense), balance }
  },
}
