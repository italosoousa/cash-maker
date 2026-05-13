import { NextResponse }             from 'next/server'
import { auth }                     from '@/lib/auth'
import { prisma }                   from '@/lib/prisma'
import { parseNubankCredit }        from '@/lib/importar/parsers/nubank-credit'
import { parseNubankAccount }       from '@/lib/importar/parsers/nubank-account'
import type { ImportType, PreviewResult } from '@/lib/importar/types'

/**
 * POST /api/importar/preview
 *
 * Body: multipart/form-data
 *   file   — arquivo CSV
 *   bank   — id do banco (ex: "nubank")
 *   importType — "fatura" | "extrato"
 *
 * Retorna o preview com transações parseadas e categorias resolvidas.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Envio inválido' }, { status: 400 })
  }

  const file       = formData.get('file') as File | null
  const bank       = formData.get('bank') as string | null
  const importType = formData.get('importType') as ImportType | null

  if (!file || !bank || !importType) {
    return NextResponse.json({ error: 'Campos obrigatórios: file, bank, importType' }, { status: 400 })
  }

  if (!file.name.endsWith('.csv')) {
    return NextResponse.json({ error: 'Apenas arquivos .csv são aceitos' }, { status: 400 })
  }

  // Lê o arquivo
  const csvText = await file.text()

  // Faz o parse de acordo com o banco
  let rows
  try {
    if (bank === 'nubank' && importType === 'fatura') {
      rows = parseNubankCredit(csvText)
    } else if (bank === 'nubank' && importType === 'extrato') {
      rows = parseNubankAccount(csvText)
    } else {
      return NextResponse.json(
        { error: `Parser para "${bank} / ${importType}" ainda não disponível.` },
        { status: 422 }
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao processar arquivo'
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  // Busca as categorias do usuário para resolver IDs
  const userCategories = await prisma.category.findMany({
    where:  { userId: session.user.id },
    select: { id: true, name: true },
  })

  const catMap = new Map(userCategories.map(c => [c.name.toLowerCase(), c.id]))
  const outrosId = catMap.get('outros') ?? null

  // Resolve categoryId para cada linha
  for (const row of rows) {
    if (row.rowType === 'EXPENSE') {
      if (row.categoryName) {
        row.categoryId = catMap.get(row.categoryName.toLowerCase()) ?? outrosId
      } else {
        row.categoryId = null   // precisará de revisão manual
      }
    } else if (row.rowType === 'INCOME') {
      // Receitas: pré-atribui "Outros" — o usuário pode trocar na revisão
      row.categoryId = outrosId
    }
  }

  // Calcula totais
  const expenseRows    = rows.filter(r => r.rowType === 'EXPENSE')
  const incomeRows     = rows.filter(r => r.rowType === 'INCOME')
  const paymentRow     = rows.find(r => r.rowType === 'PAYMENT')
  const investRows     = rows.filter(r => r.rowType === 'INVESTMENT')

  const totalExpense   = expenseRows.reduce((s, r) => s + r.amount, 0)
  const totalIncome    = incomeRows.reduce((s, r)  => s + r.amount, 0)
  const paymentAmount  = paymentRow?.amount ?? null
  const investmentCount = investRows.length

  const uncategorizedCount = expenseRows.filter(r => !r.categoryId).length

  const result: PreviewResult = {
    bank,
    importType,
    rows,
    totalExpense,
    totalIncome,
    paymentAmount,
    investmentCount,
    uncategorizedCount,
  }

  return NextResponse.json({ data: result })
}
