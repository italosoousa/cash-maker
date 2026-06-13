import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { savingPlanSnapshotService } from '@/services/saving-plan-snapshot.service'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  try {
    const snapshots = await savingPlanSnapshotService.listHistory(session.user.id, id)
    return NextResponse.json({ data: snapshots })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao buscar histórico'
    return NextResponse.json({ error: msg }, { status: 404 })
  }
}
