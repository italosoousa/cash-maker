import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export type DashboardPeriod = 'today' | 'week' | 'month' | 'year' | 'custom'
export type DashboardView   = 'all' | 'fatura' | 'extrato'

function viewFilter(view: DashboardView): import('@prisma/client').Prisma.TransactionWhereInput {
  if (view === 'fatura')  return { importFrom: 'fatura'  }
  if (view === 'extrato') return { importFrom: 'extrato' }
  return {}
}

function getPeriodRange(
  period: DashboardPeriod,
  customDate?: string,    // YYYY-MM-DD (single day)
  fromDate?: string,      // YYYY-MM-DD (range start)
  toDate?: string,        // YYYY-MM-DD (range end)
): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const now   = new Date()
  const tz    = 'America/Sao_Paulo'
  const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: tz }) + 'T00:00:00Z')

  let start: Date, end: Date, prevStart: Date, prevEnd: Date

  if (period === 'custom' && fromDate && toDate) {
    start   = new Date(fromDate + 'T00:00:00Z')
    end     = new Date(toDate   + 'T00:00:00Z'); end.setUTCDate(end.getUTCDate() + 1)
    const dur = end.getTime() - start.getTime()
    prevEnd   = new Date(start)
    prevStart = new Date(start.getTime() - dur)
  } else if (period === 'custom' && customDate) {
    // Filtra o dia inteiro (00:00 → 00:00 do dia seguinte, UTC)
    start     = new Date(customDate + 'T00:00:00Z')
    end       = new Date(customDate + 'T00:00:00Z'); end.setUTCDate(end.getUTCDate() + 1)
    prevStart = new Date(customDate + 'T00:00:00Z'); prevStart.setUTCDate(prevStart.getUTCDate() - 1)
    prevEnd   = new Date(customDate + 'T00:00:00Z')
  } else if (period === 'today') {
    start    = today
    end      = new Date(today); end.setDate(end.getDate() + 1)
    prevEnd  = new Date(today)
    prevStart = new Date(today); prevStart.setDate(prevStart.getDate() - 1)
  } else if (period === 'week') {
    const day = today.getUTCDay()
    start     = new Date(today); start.setUTCDate(today.getUTCDate() - day)
    end       = new Date(now)
    prevStart = new Date(start); prevStart.setUTCDate(prevStart.getUTCDate() - 7)
    prevEnd   = new Date(start)
  } else if (period === 'month') {
    start     = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
    end       = new Date(now)
    prevStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
    prevEnd   = new Date(start)
  } else {
    start     = new Date(Date.UTC(today.getUTCFullYear(), 0, 1))
    end       = new Date(now)
    prevStart = new Date(Date.UTC(today.getUTCFullYear() - 1, 0, 1))
    prevEnd   = new Date(start)
  }

  return { start, end, prevStart, prevEnd }
}

async function sumByType(
  userId: string, start: Date, end: Date,
  extra: import('@prisma/client').Prisma.TransactionWhereInput = {}
) {
  const rows = await prisma.transaction.groupBy({
    by:    ['type'],
    where: { userId, deletedAt: null, date: { gte: start, lt: end }, ...extra },
    _sum:  { amount: true },
  })
  const income  = Number(rows.find(r => r.type === 'INCOME')?._sum.amount  ?? 0)
  const expense = Number(rows.find(r => r.type === 'EXPENSE')?._sum.amount ?? 0)
  return { income, expense }
}

function pct(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / Math.abs(prev)) * 100)
}

export const dashboardService = {
  async getSummary(userId: string, period: DashboardPeriod, view: DashboardView = 'all', customDate?: string, fromDate?: string, toDate?: string) {
    const { start, end, prevStart, prevEnd } = getPeriodRange(period, customDate, fromDate, toDate)
    const vf = viewFilter(view)

    const [curr, prev] = await Promise.all([
      sumByType(userId, start, end, vf),
      sumByType(userId, prevStart, prevEnd, vf),
    ])

    const currBalance = curr.income - curr.expense
    const prevBalance = prev.income - prev.expense
    const balance     = currBalance

    // Saldo total (sem filtro de período, mas com filtro de view)
    const allRows = await prisma.transaction.groupBy({
      by:    ['type'],
      where: { userId, deletedAt: null, ...vf },
      _sum:  { amount: true },
    })
    const totalIncome  = Number(allRows.find(r => r.type === 'INCOME')?._sum.amount  ?? 0)
    const totalExpense = Number(allRows.find(r => r.type === 'EXPENSE')?._sum.amount ?? 0)
    const totalBalance = totalIncome - totalExpense

    return {
      balance:           totalBalance,
      periodIncome:      curr.income,
      periodExpense:     curr.expense,
      periodBalance:     balance,
      incomeVariation:   pct(curr.income,   prev.income),
      expenseVariation:  pct(curr.expense,  prev.expense),
      balanceVariation:  pct(currBalance,   prevBalance),
    }
  },

  async getCategoryBreakdown(userId: string, period: DashboardPeriod, view: DashboardView = 'all', customDate?: string, fromDate?: string, toDate?: string) {
    const { start, end } = getPeriodRange(period, customDate, fromDate, toDate)
    const vf = viewFilter(view)

    const rows = await prisma.transaction.groupBy({
      by:    ['categoryId', 'type'],
      where: { userId, deletedAt: null, type: 'EXPENSE', date: { gte: start, lt: end }, ...vf },
      _sum:  { amount: true },
    })

    if (rows.length === 0) return []

    const total = rows.reduce((s, r) => s + Number(r._sum.amount ?? 0), 0)

    const cats = await prisma.category.findMany({
      where: { id: { in: rows.map(r => r.categoryId) } },
      select: { id: true, name: true, icon: true, color: true },
    })

    return rows.map(r => {
      const cat  = cats.find(c => c.id === r.categoryId)
      const amt  = Number(r._sum.amount ?? 0)
      return {
        categoryId:  r.categoryId,
        name:        cat?.name  ?? 'Outros',
        icon:        cat?.icon  ?? 'tag',
        color:       cat?.color ?? '#9DC4AD',
        total:       amt,
        percentage:  total > 0 ? Math.round((amt / total) * 100) : 0,
      }
    }).sort((a, b) => b.total - a.total)
  },

  async getMonthlyEvolution(userId: string, view: DashboardView = 'all') {
    const vf = viewFilter(view)
    // Últimos 6 meses
    const months: { label: string; income: number; expense: number }[] = []

    for (let i = 5; i >= 0; i--) {
      const d    = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      const start = new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1))
      const end   = new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 1))

      const label = d.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'America/Sao_Paulo' })

      const rows = await prisma.transaction.groupBy({
        by:    ['type'],
        where: { userId, deletedAt: null, date: { gte: start, lt: end }, ...vf },
        _sum:  { amount: true },
      })

      months.push({
        label:   label.charAt(0).toUpperCase() + label.slice(1).replace('.', ''),
        income:  Number(rows.find(r => r.type === 'INCOME')?._sum.amount  ?? 0),
        expense: Number(rows.find(r => r.type === 'EXPENSE')?._sum.amount ?? 0),
      })
    }
    return months
  },

  async getRecentTransactions(userId: string, view: DashboardView = 'all') {
    const vf = viewFilter(view)
    return prisma.transaction.findMany({
      where:   { userId, deletedAt: null, ...vf },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
      orderBy: { date: 'desc' },
      take:    6,
    })
  },

  async getCategoryInsights(userId: string, period: DashboardPeriod, view: DashboardView = 'all', customDate?: string) {
    const { start, end, prevStart, prevEnd } = getPeriodRange(period, customDate)
    const vf = viewFilter(view)

    const expenseWhere = { userId, deletedAt: null, type: 'EXPENSE' as const, ...vf }

    const [currRows, prevRows, incomeRows, txCounts] = await Promise.all([
      prisma.transaction.groupBy({
        by:    ['categoryId'],
        where: { ...expenseWhere, date: { gte: start, lt: end } },
        _sum:  { amount: true },
      }),
      prisma.transaction.groupBy({
        by:    ['categoryId'],
        where: { ...expenseWhere, date: { gte: prevStart, lt: prevEnd } },
        _sum:  { amount: true },
      }),
      prisma.transaction.groupBy({
        by:    ['type'],
        where: { userId, deletedAt: null, type: 'INCOME', date: { gte: start, lt: end }, ...vf },
        _sum:  { amount: true },
      }),
      prisma.transaction.groupBy({
        by:     ['categoryId'],
        where:  { ...expenseWhere, date: { gte: start, lt: end } },
        _count: { _all: true },
      }),
    ])

    const totalExpense = currRows.reduce((s, r) => s + Number(r._sum.amount ?? 0), 0)
    const totalIncome  = Number(incomeRows[0]?._sum.amount ?? 0)
    const totalTx      = txCounts.reduce((s, r) => s + r._count._all, 0)

    if (currRows.length === 0) {
      return {
        categoryBreakdown: [],
        kpis: { totalExpense: 0, totalIncome, topCategory: null, avgTicket: 0 },
      }
    }

    const catIds = currRows.map(r => r.categoryId).filter((id): id is string => !!id)
    const cats = await prisma.category.findMany({
      where:  { id: { in: catIds } },
      select: { id: true, name: true, icon: true, color: true, isDefault: true },
    })

    const breakdown = currRows.map(r => {
      const cat     = cats.find(c => c.id === r.categoryId)
      const amt     = Number(r._sum.amount ?? 0)
      const prevAmt = Number(prevRows.find(p => p.categoryId === r.categoryId)?._sum.amount ?? 0)
      const trend   = prevAmt === 0 ? null : Math.round(((amt - prevAmt) / prevAmt) * 100)
      const count   = txCounts.find(t => t.categoryId === r.categoryId)?._count._all ?? 0
      return {
        categoryId: r.categoryId,
        name:       cat?.name      ?? 'Outros',
        icon:       cat?.icon      ?? 'tag',
        color:      cat?.color     ?? '#9DC4AD',
        isDefault:  cat?.isDefault ?? false,
        total:      amt,
        percentage: totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0,
        count,
        trend,
      }
    }).sort((a, b) => b.total - a.total)

    const top      = breakdown[0]
    const avgTicket = totalTx > 0 ? totalExpense / totalTx : 0

    return {
      categoryBreakdown: breakdown,
      kpis: {
        totalExpense,
        totalIncome,
        topCategory: top ? { name: top.name, percentage: top.percentage } : null,
        avgTicket,
      },
    }
  },
}
