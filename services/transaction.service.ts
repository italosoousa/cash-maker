import { transactionRepository } from '@/repositories/transaction.repository'
import { categoryRepository }    from '@/repositories/category.repository'
import type { TransactionInput, TransactionFilters } from '@/lib/validations/transaction'

export const transactionService = {
  async getAll(userId: string, filters: TransactionFilters) {
    return transactionRepository.findAllByUser(userId, filters)
  },

  async create(userId: string, data: TransactionInput) {
    // RN04 — se categoryId não informado, busca "Outros"
    let { categoryId } = data
    if (!categoryId) {
      const categories = await categoryRepository.findAllByUser(userId)
      const outros = categories.find(c => c.name === 'Outros')
      if (outros) categoryId = outros.id
    }
    return transactionRepository.create({ ...data, categoryId, userId })
  },

  async update(userId: string, id: string, data: Partial<TransactionInput>) {
    const tx = await transactionRepository.findById(id, userId)
    if (!tx) throw new Error('Transação não encontrada')
    return transactionRepository.update(id, userId, data)
  },

  async delete(userId: string, id: string) {
    const tx = await transactionRepository.findById(id, userId)
    if (!tx) throw new Error('Transação não encontrada')
    return transactionRepository.softDelete(id, userId)  // RN02 — soft delete
  },

  async getBalance(userId: string) {
    return transactionRepository.getBalance(userId)
  },
}
