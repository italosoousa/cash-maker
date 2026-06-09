import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { savingPlanService } from '@/services/saving-plan.service'

const createSchema = z.object({
  name:          z.string().min(1).max(80),
  icon:          z.string().min(1),
  color:         z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  targetAmount:  z.number().positive(),
  currentAmount: z.number().min(0).default(0),
  dueDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes:         z.string().max(500).nullable().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const [plans, summary] = await Promise.all([
      savingPlanService.list(session.user.id),
      savingPlanService.getSummary(session.user.id),
    ])
    return NextResponse.json({ data: { plans, summary } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro interno'
    console.error('[GET /api/saving-plans]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body   = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const plan = await savingPlanService.create(session.user.id, parsed.data)
    return NextResponse.json({ data: plan }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro interno'
    console.error('[POST /api/saving-plans]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
