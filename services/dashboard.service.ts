import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export type DashboardPeriod = 'today' | 'week' | 'month' | 'year'
export type DashboardView   = 'all' | 'fatura' | 'extrato'

function viewFilter(view: DashboardView): import('@prisma/client').Prisma.TransactionWhereInput {
  if (view === 'fatura')  return { importFrom: 'fatura'  }
  if (view === 'extrato') return { importFrom: 'extrato' }
  return {}
}

function getPeriodRange(period: DashboardPeriod): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const now   = new Date()
  const tz    = 'America/Sao_Paulo'
  const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: tz }) + 'T00:00:00Z')

  let start: Date, end: Date, prevStart: Date, prevEnd: Date

  if (period === 'today') {
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
  async getSummary(userId: string, period: DashboardPeriod, view: DashboardView = 'all') {
    const { start, end, prevStart, prevEnd } = getPeriodRange(period)
    const vf = viewFilter(view)

    const [curr, prev] = await Promise.all([
      sumByType(userId, start, end, vf),
      sumByType(userId, prevStart, prevEnd, vf),
    ])

    const balance = curr.income - curr.expense

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
      balance:          totalBalance,
      periodIncome:     curr.income,
      periodExpense:    curr.expense,
      periodBalance:    balance,
      incomeVariation:  pct(curr.income,  prev.income),
      expenseVariation: pct(curr.expense, prev.expense),
    }
  },

  async getCategoryBreakdown(userId: string, period: DashboardPeriod, view: DashboardView = 'all') {
    const { start, end } = getPeriodRange(period)
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
}
