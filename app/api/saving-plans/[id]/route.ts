import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { savingPlanService } from '@/services/saving-plan.service'

const updateSchema = z.object({
  name:          z.string().min(1).max(80).optional(),
  icon:          z.string().min(1).optional(),
  color:         z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  targetAmount:  z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  dueDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes:         z.string().max(500).nullable().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body   = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const plan = await savingPlanService.update(session.user.id, id, parsed.data)
    return NextResponse.json({ data: plan })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao atualizar'
    return NextResponse.json({ error: msg }, { status: 404 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  try {
    await savingPlanService.delete(session.user.id, id)
    return NextResponse.json({ data: { ok: true } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao excluir'
    return NextResponse.json({ error: msg }, { status: 404 })
  }
}
