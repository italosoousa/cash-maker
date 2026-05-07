import { prisma } from '@/lib/prisma'
import type { CategoryInput } from '@/lib/validations/category'

export const categoryRepository = {
  findAllByUser(userId: string) {
    return prisma.category.findMany({
      where: { userId },
      include: { _count: { select: { transactions: { where: { deletedAt: null } } } } },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })
  },

  findById(id: string, userId: string) {
    return prisma.category.findFirst({ where: { id, userId } })
  },

  create(data: CategoryInput & { userId: string }) {
    return prisma.category.create({ data })
  },

  update(id: string, userId: string, data: Partial<CategoryInput>) {
    return prisma.category.update({ where: { id, userId }, data })
  },

  async hasTransactions(id: string, userId: string) {
    const count = await prisma.transaction.count({
      where: { categoryId: id, userId, deletedAt: null },
    })
    return count > 0
  },

  delete(id: string, userId: string) {
    return prisma.category.delete({ where: { id, userId } })
  },
}
