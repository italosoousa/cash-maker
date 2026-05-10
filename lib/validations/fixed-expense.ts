import { z } from 'zod'

export const fixedExpenseSchema = z.object({
  name:       z.string().min(1, 'Nome obrigatório').max(100),
  amount:     z.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo'),
  type:       z.enum(['INCOME', 'EXPENSE']),
  frequency:  z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  startDate:  z.string().min(1, 'Data de início obrigatória'),
  endDate:    z.string().optional().nullable(),
  categoryId: z.string().min(1, 'Categoria obrigatória'),
  notes:      z.string().max(500).optional().nullable(),
})

export const updateFixedExpenseSchema = fixedExpenseSchema.partial().extend({
  isActive: z.boolean().optional(),
})

export type FixedExpenseInput       = z.infer<typeof fixedExpenseSchema>
export type UpdateFixedExpenseInput = z.infer<typeof updateFixedExpenseSchema>
