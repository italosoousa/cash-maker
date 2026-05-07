import { categoryRepository } from '@/repositories/category.repository'
import type { CategoryInput } from '@/lib/validations/category'

export const categoryService = {
  async getAll(userId: string) {
    return categoryRepository.findAllByUser(userId)
  },

  async create(userId: string, data: CategoryInput) {
    return categoryRepository.create({ ...data, userId })
  },

  async update(userId: string, id: string, data: Partial<CategoryInput>) {
    const category = await categoryRepository.findById(id, userId)
    if (!category) throw new Error('Categoria não encontrada')

    return categoryRepository.update(id, userId, data)
  },

  async delete(userId: string, id: string) {
    const category = await categoryRepository.findById(id, userId)
    if (!category) throw new Error('Categoria não encontrada')
    if (category.isDefault) throw new Error('Categorias padrão não podem ser excluídas')

    const hasTransactions = await categoryRepository.hasTransactions(id, userId)
    if (hasTransactions) throw new Error('Categoria possui transações vinculadas')

    return categoryRepository.delete(id, userId)
  },
}
