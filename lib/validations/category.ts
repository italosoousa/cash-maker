import { z } from 'zod'

export const categorySchema = z.object({
  name:  z.string().min(1, 'Nome obrigatório').max(50, 'Máximo 50 caracteres'),
  icon:  z.string().min(1, 'Ícone obrigatório'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
})

export const updateCategorySchema = categorySchema.partial()

export type CategoryInput  = z.infer<typeof categorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
