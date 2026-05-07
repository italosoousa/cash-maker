import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { dashboardService, type DashboardPeriod } from '@/services/dashboard.service'

const VALID_PERIODS = ['today', 'week', 'month', 'year'] as const

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const rawPeriod = searchParams.get('period') ?? 'month'
  const period: DashboardPeriod = VALID_PERIODS.includes(rawPeriod as DashboardPeriod)
    ? (rawPeriod as DashboardPeriod)
    : 'month'

  const userId = session.user.id

  const [summary, categoryBreakdown, monthlyEvolution, recentTransactions] = await Promise.all([
    dashboardService.getSummary(userId, period),
    dashboardService.getCategoryBreakdown(userId, period),
    dashboardService.getMonthlyEvolution(userId),
    dashboardService.getRecentTransactions(userId),
  ])

  return NextResponse.json({
    data: { summary, categoryBreakdown, monthlyEvolution, recentTransactions },
  })
}
