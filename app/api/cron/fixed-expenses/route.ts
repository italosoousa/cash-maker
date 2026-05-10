import { NextResponse }          from 'next/server'
import { fixedExpenseService }  from '@/services/fixed-expense.service'

/**
 * POST /api/cron/fixed-expenses
 *
 * Chamado pelo Vercel Cron (vercel.json) todo dia às 00:01 BRT (03:01 UTC).
 * Também pode ser chamado manualmente por serviços externos com o CRON_SECRET.
 *
 * Segurança: verifica o header Authorization: Bearer <CRON_SECRET>
 * para impedir execução não autorizada.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth   = request.headers.get('authorization')

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const result = await fixedExpenseService.runCron()

    console.log(
      `[cron/fixed-expenses] processed=${result.processed} total=${result.total}`,
      result.errors.length ? `errors=${JSON.stringify(result.errors)}` : '',
    )

    return NextResponse.json({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[cron/fixed-expenses] fatal error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Vercel Cron usa GET para health-check — retorna 200 para não derrubar o cron
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth   = request.headers.get('authorization')

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  return NextResponse.json({ status: 'ok' })
}
