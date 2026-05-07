import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { updateTransactionSchema } from '@/lib/validations/transaction'
import { transactionService } from '@/services/transaction.service'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body   = await request.json()
  const parsed = updateTransactionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  try {
    const tx = await transactionService.update(session.user.id, id, parsed.data)
    return NextResponse.json({ data: tx })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: message.includes('não encontrada') ? 404 : 500 })
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  try {
    await transactionService.delete(session.user.id, id)
    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: message.includes('não encontrada') ? 404 : 500 })
  }
}
