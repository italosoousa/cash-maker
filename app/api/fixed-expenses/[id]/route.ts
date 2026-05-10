import { NextResponse }                 from 'next/server'
import { auth }                         from '@/lib/auth'
import { updateFixedExpenseSchema }     from '@/lib/validations/fixed-expense'
import { fixedExpenseService }          from '@/services/fixed-expense.service'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body   = await request.json()
  const parsed = updateFixedExpenseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  try {
    const fe = await fixedExpenseService.update(session.user.id, id, parsed.data)
    return NextResponse.json({ data: fe })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: message.includes('não encontrado') ? 404 : 500 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  try {
    await fixedExpenseService.delete(session.user.id, id)
    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: message.includes('não encontrado') ? 404 : 500 })
  }
}
