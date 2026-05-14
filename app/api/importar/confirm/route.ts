import { NextResponse }   from 'next/server'
import { auth }           from '@/lib/auth'
import { prisma }         from '@/lib/prisma'
import { z }              from 'zod'

const rowSchema = z.object({
  date:        z.string(),
  description: z.string(),
  amount:      z.number().positive(),
  categoryId:  z.string(),
  type:        z.enum(['EXPENSE', 'INCOME']).default('EXPENSE'),
})

const confirmSchema = z.object({
  rows:       z.array(rowSchema).min(1),
  importFrom: z.enum(['fatura', 'extrato']).optional(),
  bank:       z.string().optional(), // 'nubank' | 'bb' | etc.
})

/**
 * POST /api/importar/confirm
 * Cria as transações confirmadas pelo usuário após revisão.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body   = await request.json()
  const parsed = confirmSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { rows, importFrom, bank } = parsed.data

  // Verifica que todas as categorias pertencem ao usuário
  const categoryIds = [...new Set(rows.map(r => r.categoryId))]
  const validCats   = await prisma.category.findMany({
    where:  { id: { in: categoryIds }, userId: session.user.id },
    select: { id: true },
  })
  const validIds = new Set(validCats.map(c => c.id))

  const invalid = categoryIds.filter(id => !validIds.has(id))
  if (invalid.length > 0) {
    return NextResponse.json({ error: 'Categoria inválida detectada' }, { status: 400 })
  }

  // Cria todas as transações atomicamente
  const created = await prisma.$transaction(
    rows.map(row =>
      prisma.transaction.create({
        data: {
          type:        row.type,
          amount:      row.amount,
          description: row.description,
          date:        new Date(row.date + 'T12:00:00.000Z'),
          source:      'IMPORT',
          importFrom:  importFrom ?? null,
          bank:        bank ?? null,
          userId:      session.user.id,
          categoryId:  row.categoryId,
        },
      })
    )
  )

  return NextResponse.json({ data: { imported: created.length } }, { status: 201 })
}
