import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { updateCategorySchema } from '@/lib/validations/category'
import { categoryService } from '@/services/category.service'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = updateCategorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  try {
    const category = await categoryService.update(session.user.id, id, parsed.data)
    return NextResponse.json({ data: category })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    const status = message.includes('não encontrada') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  try {
    await categoryService.delete(session.user.id, id)
    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    const status = message.includes('não encontrada') ? 404
      : message.includes('padrão') || message.includes('vinculadas') ? 422
      : 500
    return NextResponse.json({ error: message }, { status })
  }
}
