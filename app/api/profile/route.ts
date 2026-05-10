import { NextResponse } from 'next/server'
import { auth }         from '@/lib/auth'
import { prisma }       from '@/lib/prisma'
import { z }            from 'zod'

const updateNameSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(80, 'Nome muito longo').trim(),
})

// GET /api/profile — dados do usuário + estatísticas
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id:        true,
      name:      true,
      email:     true,
      createdAt: true,
      _count: {
        select: {
          transactions:  { where: { deletedAt: null } },
          categories:    true,
          fixedExpenses: { where: { isActive: true } },
        },
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  return NextResponse.json({ data: user })
}

// PATCH /api/profile — atualiza nome
export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body   = await request.json()
  const parsed = updateNameSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data:  { name: parsed.data.name },
    select: { id: true, name: true, email: true },
  })

  return NextResponse.json({ data: user })
}
