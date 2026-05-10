import { NextResponse }            from 'next/server'
import { auth }                    from '@/lib/auth'
import { fixedExpenseSchema }      from '@/lib/validations/fixed-expense'
import { fixedExpenseService }     from '@/services/fixed-expense.service'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const items = await fixedExpenseService.getAll(session.user.id)
  return NextResponse.json({ data: items })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body   = await request.json()
  const parsed = fixedExpenseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  try {
    const fe = await fixedExpenseService.create(session.user.id, parsed.data)
    return NextResponse.json({ data: fe }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
