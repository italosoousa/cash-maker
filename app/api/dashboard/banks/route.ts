import { NextResponse } from 'next/server'
import { auth }         from '@/lib/auth'
import { prisma }       from '@/lib/prisma'

/**
 * GET /api/dashboard/banks?importFrom=fatura
 *
 * Retorna resumo por banco para transações importadas.
 * Usado pelo dashboard de Cartão de Crédito e Extrato.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const importFrom = searchParams.get('importFrom') // 'fatura' | 'extrato'

  const where = {
    userId:    session.user.id,
    deletedAt: null,
    source:    'IMPORT' as const,
    ...(importFrom ? { importFrom } : {}),
  }

  // Agrupa por banco
  const grouped = await prisma.transaction.groupBy({
    by:    ['bank'],
    where,
    _sum:  { amount: true },
    _count: { id: true },
    _max:  { date: true },
  })

  const data = grouped
    .filter(r => r.bank !== null)
    .map(r => ({
      bank:             r.bank!,
      totalAmount:      Number(r._sum.amount ?? 0),
      transactionCount: r._count.id,
      lastDate:         r._max.date?.toISOString().slice(0, 10) ?? null,
    }))

  return NextResponse.json({ data })
}
