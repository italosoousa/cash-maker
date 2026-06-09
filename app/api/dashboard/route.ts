import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { dashboardService, type DashboardPeriod, type DashboardView } from '@/services/dashboard.service'

const VALID_PERIODS: DashboardPeriod[] = ['today', 'week', 'month', 'year', 'custom']
const VALID_VIEWS:   DashboardView[]   = ['all', 'fatura', 'extrato']

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)

  const rawPeriod = searchParams.get('period') ?? 'month'
  const period: DashboardPeriod = VALID_PERIODS.includes(rawPeriod as DashboardPeriod)
    ? (rawPeriod as DashboardPeriod)
    : 'month'

  const rawView = searchParams.get('view') ?? 'all'
  const view: DashboardView = VALID_VIEWS.includes(rawView as DashboardView)
    ? (rawView as DashboardView)
    : 'all'

  // Data específica: YYYY-MM-DD, só usada quando period === 'custom'
  const rawDate    = searchParams.get('date') ?? undefined
  const rawFrom    = searchParams.get('from') ?? undefined
  const rawTo      = searchParams.get('to')   ?? undefined
  const ISO_DATE   = /^\d{4}-\d{2}-\d{2}$/
  const customDate = period === 'custom' && rawDate && ISO_DATE.test(rawDate) ? rawDate : undefined
  const fromDate   = period === 'custom' && rawFrom && ISO_DATE.test(rawFrom) ? rawFrom : undefined
  const toDate     = period === 'custom' && rawTo   && ISO_DATE.test(rawTo)   ? rawTo   : undefined

  const userId = session.user.id

  const [summary, categoryBreakdown, monthlyEvolution, recentTransactions] = await Promise.all([
    dashboardService.getSummary(userId, period, view, customDate, fromDate, toDate),
    dashboardService.getCategoryBreakdown(userId, period, view, customDate, fromDate, toDate),
    dashboardService.getMonthlyEvolution(userId, view),
    dashboardService.getRecentTransactions(userId, view),
  ])

  return NextResponse.json({
    data: { summary, categoryBreakdown, monthlyEvolution, recentTransactions },
  })
}
