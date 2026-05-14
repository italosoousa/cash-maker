import { z } from 'zod'

export const transactionSchema = z.object({
  type:        z.enum(['INCOME', 'EXPENSE']),
  amount:      z.number({ invalid_type_error: 'Valor inválido' }).positive('Valor deve ser positivo'),
  description: z.string().min(1, 'Descrição obrigatória').max(200),
  date:        z.string().min(1, 'Data obrigatória'),
  categoryId:  z.string().min(1, 'Categoria obrigatória'),
  notes:       z.string().max(500).optional(),
})

export const updateTransactionSchema = transactionSchema.partial()

export const transactionFiltersSchema = z.object({
  type:       z.enum(['INCOME', 'EXPENSE', 'ALL']).optional(),
  categoryId: z.string().optional(),
  source:     z.enum(['MANUAL', 'AUTO', 'IMPORT']).optional(),
  search:     z.string().optional(),
  startDate:  z.string().optional(),
  endDate:    z.string().optional(),
  page:       z.coerce.number().int().positive().default(1),
  limit:      z.coerce.number().int().positive().max(100).default(20),
})

export type TransactionInput   = z.infer<typeof transactionSchema>
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>
