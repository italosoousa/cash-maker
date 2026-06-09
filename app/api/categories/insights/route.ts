import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { dashboardService } from '@/services/dashboard.service'
import type { DashboardPeriod, DashboardView } from '@/services/dashboard.service'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const period = (searchParams.get('period') ?? 'month') as DashboardPeriod
  const view   = (searchParams.get('view')   ?? 'all')   as DashboardView

  try {
    const data = await dashboardService.getCategoryInsights(session.user.id, period, view)
    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
