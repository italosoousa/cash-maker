import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { categorySchema } from '@/lib/validations/category'
import { categoryService } from '@/services/category.service'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const categories = await categoryService.getAll(session.user.id)
  return NextResponse.json({ data: categories })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = categorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  try {
    const category = await categoryService.create(session.user.id, parsed.data)
    return NextResponse.json({ data: category }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
