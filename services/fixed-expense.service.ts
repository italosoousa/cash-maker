import { prisma }                     from '@/lib/prisma'
import { fixedExpenseRepository }    from '@/repositories/fixed-expense.repository'
import { categoryRepository }        from '@/repositories/category.repository'
import type { FixedExpenseInput, UpdateFixedExpenseInput } from '@/lib/validations/fixed-expense'
import type { Frequency } from '@prisma/client'

// ── nextDueDate helpers ───────────────────────────────────────────────────────

/**
 * Calcula a próxima data de vencimento a partir de uma data base + frequência.
 * Trata corretamente meses com 28/29/30/31 dias.
 */
export function advanceDate(base: Date, frequency: Frequency): Date {
  const d = new Date(base)
  switch (frequency) {
    case 'DAILY':
      d.setUTCDate(d.getUTCDate() + 1)
      break
    case 'WEEKLY':
      d.setUTCDate(d.getUTCDate() + 7)
      break
    case 'MONTHLY': {
      const day = d.getUTCDate()
      d.setUTCMonth(d.getUTCMonth() + 1)
      // Se o mês destino tem menos dias (ex: 31 jan → 31 mar passando por fev),
      // o JS ajusta para o último dia do mês automaticamente — OK.
      // Mas queremos preservar o dia original quando possível.
      const newMonth = d.getUTCMonth()
      // Verifica se houve overflow de dia (ex: 30 jan → 28 fev → queremos fev)
      if (d.getUTCDate() !== day) {
        // Overflow: ajusta para o último dia do mês correto
        d.setUTCDate(0) // último dia do mês anterior ao overflow
      }
      void newMonth
      break
    }
    case 'YEARLY':
      d.setUTCFullYear(d.getUTCFullYear() + 1)
      break
  }
  return d
}

/**
 * Calcula a nextDueDate inicial ao criar um gasto fixo.
 * Se startDate for hoje ou no passado, a nextDueDate é o próprio startDate
 * (cron vai pegar na próxima execução).
 */
function computeInitialNextDueDate(startDate: Date): Date {
  // Zera horas para comparação por dia
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const start = new Date(startDate)
  start.setUTCHours(0, 0, 0, 0)
  return start >= today ? start : today
}

// ── Service ───────────────────────────────────────────────────────────────────

export const fixedExpenseService = {

  async getAll(userId: string) {
    return fixedExpenseRepository.findAllByUser(userId)
  },

  async create(userId: string, data: FixedExpenseInput) {
    // RN04 — fallback para "Outros" se sem categoria
    let { categoryId } = data
    if (!categoryId) {
      const cats = await categoryRepository.findAllByUser(userId)
      const outros = cats.find(c => c.name === 'Outros')
      if (outros) categoryId = outros.id
    }

    const startDate   = new Date(data.startDate)
    const nextDueDate = computeInitialNextDueDate(startDate)

    return fixedExpenseRepository.create({ ...data, categoryId, userId, nextDueDate })
  },

  async update(userId: string, id: string, data: UpdateFixedExpenseInput) {
    const existing = await fixedExpenseRepository.findById(id, userId)
    if (!existing) throw new Error('Gasto fixo não encontrado')

    // RN05 — se alterar startDate, recalcula nextDueDate
    const patch: UpdateFixedExpenseInput & { nextDueDate?: Date } = { ...data }
    if (data.startDate) {
      patch.nextDueDate = computeInitialNextDueDate(new Date(data.startDate)) as unknown as undefined
    }

    return fixedExpenseRepository.update(id, userId, patch)
  },

  async toggleActive(userId: string, id: string) {
    const existing = await fixedExpenseRepository.findById(id, userId)
    if (!existing) throw new Error('Gasto fixo não encontrado')
    return fixedExpenseRepository.update(id, userId, { isActive: !existing.isActive })
  },

  async delete(userId: string, id: string) {
    const existing = await fixedExpenseRepository.findById(id, userId)
    if (!existing) throw new Error('Gasto fixo não encontrado')
    return fixedExpenseRepository.delete(id, userId)
  },

  // ── Cron ────────────────────────────────────────────────────────────────────

  /**
   * Executa o processamento de todos os gastos fixos vencidos.
   * Chamado pela rota /api/cron/fixed-expenses (00:01 BRT todo dia).
   *
   * Para cada FixedExpense com nextDueDate <= agora:
   *   1. Cria Transaction com source=AUTO dentro de uma $transaction atômica
   *   2. Avança nextDueDate para o próximo ciclo
   *   3. Se nextDueDate > endDate → desativa o gasto fixo
   *
   * Retorna: { processed: number; errors: string[] }
   */
  async runCron() {
    const now = new Date()
    const due = await fixedExpenseRepository.findDue(now)

    let processed = 0
    const errors: string[] = []

    for (const fe of due) {
      try {
        const nextDueDate = advanceDate(fe.nextDueDate, fe.frequency)
        const shouldDeactivate = fe.endDate !== null && nextDueDate > fe.endDate

        // Operação atômica — RN07
        await prisma.$transaction([
          // 1. Cria a transação automática
          prisma.transaction.create({
            data: {
              type:          fe.type,
              amount:        fe.amount,
              description:   fe.name,
              date:          fe.nextDueDate,  // data que deveria ter ocorrido
              source:        'AUTO',
              userId:        fe.userId,
              categoryId:    fe.categoryId,
              fixedExpenseId: fe.id,
              notes:         fe.notes ?? null,
            },
          }),
          // 2a. Avança nextDueDate (e desativa se ultrapassou endDate)
          prisma.fixedExpense.update({
            where: { id: fe.id },
            data:  {
              nextDueDate,
              ...(shouldDeactivate && { isActive: false }),
            },
          }),
        ])

        processed++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`[${fe.id}] ${fe.name}: ${msg}`)
      }
    }

    return { processed, errors, total: due.length }
  },
}
