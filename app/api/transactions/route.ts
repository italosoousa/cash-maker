import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { transactionSchema, transactionFiltersSchema } from '@/lib/validations/transaction'
import { transactionService } from '@/services/transaction.service'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const raw = Object.fromEntries(searchParams)
  const filters = transactionFiltersSchema.parse(raw)

  const result = await transactionService.getAll(session.user.id, filters)
  return NextResponse.json({ data: result })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body   = await request.json()
  const parsed = transactionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  try {
    const tx = await transactionService.create(session.user.id, parsed.data)
    return NextResponse.json({ data: tx }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
