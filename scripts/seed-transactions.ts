/**
 * seed-transactions.ts
 * Gera ~12 meses de transações fake realistas para todos os usuários do banco.
 * Simula padrões reais: salário fixo, gastos variáveis, receitas extras esporádicas.
 *
 * Uso:
 *   npx tsx scripts/seed-transactions.ts
 *   npx tsx scripts/seed-transactions.ts --clear   # apaga transações existentes antes
 *   npx tsx scripts/seed-transactions.ts --user ana@cashmaker.dev   # apenas 1 usuário
 */

import { PrismaClient, TransactionType } from '@prisma/client'

const prisma = new PrismaClient()
const args   = process.argv.slice(2)
const CLEAR  = args.includes('--clear')
const USER_FILTER = args.find((a) => a.startsWith('--user='))?.split('=')[1]

// ─── Tipagem interna ──────────────────────────────────────────────────────────

interface TxTemplate {
  description: string
  type:        TransactionType
  categoryKey: string
  minAmount:   number
  maxAmount:   number
  /** 0–1: probabilidade de ocorrer em cada mês */
  monthlyProb: number
  /** true = valor fixo (usa minAmount) */
  fixed?:      boolean
  /** Dia do mês preferencial (1–28) ou null = aleatório */
  preferDay?:  number | null
}

// ─── Templates de transações ─────────────────────────────────────────────────

const TEMPLATES: TxTemplate[] = [
  // ── Receitas fixas ──────────────────────────────────────────────────────────
  { description: 'Salário',                type: 'INCOME',  categoryKey: 'Salário',       minAmount: 4500,  maxAmount: 4500,  monthlyProb: 1.0, fixed: true,  preferDay: 5  },
  { description: 'Vale Refeição',          type: 'INCOME',  categoryKey: 'Salário',       minAmount: 660,   maxAmount: 660,   monthlyProb: 1.0, fixed: true,  preferDay: 1  },
  { description: 'Freelance — design',     type: 'INCOME',  categoryKey: 'Freelance',     minAmount: 800,   maxAmount: 2400,  monthlyProb: 0.5, preferDay: null },
  { description: 'Freelance — dev',        type: 'INCOME',  categoryKey: 'Freelance',     minAmount: 1200,  maxAmount: 3500,  monthlyProb: 0.35, preferDay: null },
  { description: 'Rendimento CDB',         type: 'INCOME',  categoryKey: 'Investimentos', minAmount: 55,    maxAmount: 180,   monthlyProb: 1.0, preferDay: 3  },
  { description: 'Dividendos FII',         type: 'INCOME',  categoryKey: 'Investimentos', minAmount: 30,    maxAmount: 120,   monthlyProb: 1.0, preferDay: 10 },
  { description: '13º Salário',            type: 'INCOME',  categoryKey: 'Salário',       minAmount: 4500,  maxAmount: 4500,  monthlyProb: 0,   fixed: true,  preferDay: 20 }, // especial dez
  { description: 'Venda de produto usado', type: 'INCOME',  categoryKey: 'Outros',        minAmount: 80,    maxAmount: 600,   monthlyProb: 0.2, preferDay: null },
  { description: 'Cashback cartão',        type: 'INCOME',  categoryKey: 'Outros',        minAmount: 12,    maxAmount: 65,    monthlyProb: 1.0, preferDay: 8  },

  // ── Alimentação ─────────────────────────────────────────────────────────────
  { description: 'Supermercado',           type: 'EXPENSE', categoryKey: 'Alimentação',   minAmount: 280,   maxAmount: 520,   monthlyProb: 1.0, preferDay: null },
  { description: 'Supermercado',           type: 'EXPENSE', categoryKey: 'Alimentação',   minAmount: 150,   maxAmount: 350,   monthlyProb: 0.8, preferDay: null },
  { description: 'iFood',                  type: 'EXPENSE', categoryKey: 'Alimentação',   minAmount: 38,    maxAmount: 75,    monthlyProb: 1.0, preferDay: null },
  { description: 'iFood',                  type: 'EXPENSE', categoryKey: 'Alimentação',   minAmount: 32,    maxAmount: 68,    monthlyProb: 0.9, preferDay: null },
  { description: 'Restaurante',            type: 'EXPENSE', categoryKey: 'Alimentação',   minAmount: 45,    maxAmount: 140,   monthlyProb: 0.85, preferDay: null },
  { description: 'Café da manhã',          type: 'EXPENSE', categoryKey: 'Alimentação',   minAmount: 12,    maxAmount: 28,    monthlyProb: 1.0, preferDay: null },
  { description: 'Açaí / lanche',          type: 'EXPENSE', categoryKey: 'Alimentação',   minAmount: 18,    maxAmount: 42,    monthlyProb: 0.7, preferDay: null },
  { description: 'Padaria',                type: 'EXPENSE', categoryKey: 'Alimentação',   minAmount: 15,    maxAmount: 35,    monthlyProb: 0.9, preferDay: null },

  // ── Moradia ──────────────────────────────────────────────────────────────────
  { description: 'Aluguel',                type: 'EXPENSE', categoryKey: 'Moradia',       minAmount: 1100,  maxAmount: 1100,  monthlyProb: 1.0, fixed: true,  preferDay: 5  },
  { description: 'Condomínio',             type: 'EXPENSE', categoryKey: 'Moradia',       minAmount: 320,   maxAmount: 320,   monthlyProb: 1.0, fixed: true,  preferDay: 10 },
  { description: 'Conta de luz',           type: 'EXPENSE', categoryKey: 'Moradia',       minAmount: 85,    maxAmount: 190,   monthlyProb: 1.0, preferDay: 12 },
  { description: 'Conta de água',          type: 'EXPENSE', categoryKey: 'Moradia',       minAmount: 40,    maxAmount: 85,    monthlyProb: 1.0, preferDay: 15 },
  { description: 'Conta de gás',           type: 'EXPENSE', categoryKey: 'Moradia',       minAmount: 55,    maxAmount: 120,   monthlyProb: 1.0, preferDay: 20 },
  { description: 'Internet',               type: 'EXPENSE', categoryKey: 'Moradia',       minAmount: 99,    maxAmount: 99,    monthlyProb: 1.0, fixed: true,  preferDay: 7  },
  { description: 'Material de limpeza',    type: 'EXPENSE', categoryKey: 'Moradia',       minAmount: 45,    maxAmount: 110,   monthlyProb: 0.8, preferDay: null },
  { description: 'Manutenção apartamento', type: 'EXPENSE', categoryKey: 'Moradia',       minAmount: 120,   maxAmount: 600,   monthlyProb: 0.2, preferDay: null },

  // ── Transporte ───────────────────────────────────────────────────────────────
  { description: 'Combustível',            type: 'EXPENSE', categoryKey: 'Transporte',    minAmount: 180,   maxAmount: 380,   monthlyProb: 1.0, preferDay: null },
  { description: 'Combustível',            type: 'EXPENSE', categoryKey: 'Transporte',    minAmount: 120,   maxAmount: 260,   monthlyProb: 0.7, preferDay: null },
  { description: 'Uber / 99',              type: 'EXPENSE', categoryKey: 'Transporte',    minAmount: 18,    maxAmount: 55,    monthlyProb: 0.9, preferDay: null },
  { description: 'Estacionamento',         type: 'EXPENSE', categoryKey: 'Transporte',    minAmount: 15,    maxAmount: 45,    monthlyProb: 0.8, preferDay: null },
  { description: 'IPVA',                   type: 'EXPENSE', categoryKey: 'Transporte',    minAmount: 580,   maxAmount: 580,   monthlyProb: 0,   fixed: true,  preferDay: 10 }, // especial jan
  { description: 'Seguro do carro',        type: 'EXPENSE', categoryKey: 'Transporte',    minAmount: 1200,  maxAmount: 1200,  monthlyProb: 0,   fixed: true,  preferDay: 15 }, // especial jan
  { description: 'Revisão / mecânico',     type: 'EXPENSE', categoryKey: 'Transporte',    minAmount: 180,   maxAmount: 850,   monthlyProb: 0.15, preferDay: null },
  { description: 'Metrô / ônibus',         type: 'EXPENSE', categoryKey: 'Transporte',    minAmount: 60,    maxAmount: 130,   monthlyProb: 0.5, preferDay: null },

  // ── Saúde ─────────────────────────────────────────────────────────────────────
  { description: 'Plano de saúde',         type: 'EXPENSE', categoryKey: 'Saúde',         minAmount: 285,   maxAmount: 285,   monthlyProb: 1.0, fixed: true,  preferDay: 5  },
  { description: 'Farmácia',               type: 'EXPENSE', categoryKey: 'Saúde',         minAmount: 35,    maxAmount: 180,   monthlyProb: 0.8, preferDay: null },
  { description: 'Consulta médica',        type: 'EXPENSE', categoryKey: 'Saúde',         minAmount: 150,   maxAmount: 350,   monthlyProb: 0.4, preferDay: null },
  { description: 'Academia',               type: 'EXPENSE', categoryKey: 'Saúde',         minAmount: 89,    maxAmount: 89,    monthlyProb: 1.0, fixed: true,  preferDay: 1  },
  { description: 'Dentista',               type: 'EXPENSE', categoryKey: 'Saúde',         minAmount: 120,   maxAmount: 500,   monthlyProb: 0.2, preferDay: null },
  { description: 'Exame de sangue',        type: 'EXPENSE', categoryKey: 'Saúde',         minAmount: 80,    maxAmount: 200,   monthlyProb: 0.15, preferDay: null },

  // ── Educação ──────────────────────────────────────────────────────────────────
  { description: 'Curso online',           type: 'EXPENSE', categoryKey: 'Educação',      minAmount: 39,    maxAmount: 197,   monthlyProb: 0.5, preferDay: null },
  { description: 'Livro técnico',          type: 'EXPENSE', categoryKey: 'Educação',      minAmount: 45,    maxAmount: 120,   monthlyProb: 0.35, preferDay: null },
  { description: 'Inglês',                 type: 'EXPENSE', categoryKey: 'Educação',      minAmount: 249,   maxAmount: 249,   monthlyProb: 1.0, fixed: true,  preferDay: 10 },
  { description: 'Pós-graduação parcela',  type: 'EXPENSE', categoryKey: 'Educação',      minAmount: 380,   maxAmount: 380,   monthlyProb: 1.0, fixed: true,  preferDay: 20 },

  // ── Lazer ─────────────────────────────────────────────────────────────────────
  { description: 'Cinema',                 type: 'EXPENSE', categoryKey: 'Lazer',         minAmount: 28,    maxAmount: 65,    monthlyProb: 0.6, preferDay: null },
  { description: 'Streaming (Netflix)',     type: 'EXPENSE', categoryKey: 'Lazer',         minAmount: 55,    maxAmount: 55,    monthlyProb: 1.0, fixed: true,  preferDay: 18 },
  { description: 'Spotify',                type: 'EXPENSE', categoryKey: 'Lazer',         minAmount: 22,    maxAmount: 22,    monthlyProb: 1.0, fixed: true,  preferDay: 20 },
  { description: 'Bar / happy hour',       type: 'EXPENSE', categoryKey: 'Lazer',         minAmount: 45,    maxAmount: 150,   monthlyProb: 0.7, preferDay: null },
  { description: 'Viagem / hotel',         type: 'EXPENSE', categoryKey: 'Lazer',         minAmount: 350,   maxAmount: 1800,  monthlyProb: 0.2, preferDay: null },
  { description: 'Show / evento',          type: 'EXPENSE', categoryKey: 'Lazer',         minAmount: 80,    maxAmount: 350,   monthlyProb: 0.25, preferDay: null },
  { description: 'Steam / jogos',          type: 'EXPENSE', categoryKey: 'Lazer',         minAmount: 15,    maxAmount: 120,   monthlyProb: 0.3, preferDay: null },
  { description: 'Presente / aniversário', type: 'EXPENSE', categoryKey: 'Outros',        minAmount: 60,    maxAmount: 250,   monthlyProb: 0.4, preferDay: null },

  // ── Assinaturas e serviços ────────────────────────────────────────────────────
  { description: 'Telefone celular',       type: 'EXPENSE', categoryKey: 'Assinaturas',   minAmount: 59,    maxAmount: 59,    monthlyProb: 1.0, fixed: true,  preferDay: 3  },
  { description: 'Amazon Prime',           type: 'EXPENSE', categoryKey: 'Assinaturas',   minAmount: 19,    maxAmount: 19,    monthlyProb: 1.0, fixed: true,  preferDay: 14 },
  { description: 'Armazenamento em nuvem', type: 'EXPENSE', categoryKey: 'Assinaturas',   minAmount: 13,    maxAmount: 35,    monthlyProb: 1.0, fixed: true,  preferDay: 22 },

  // ── Vestuário ─────────────────────────────────────────────────────────────────
  { description: 'Roupa / calçado',        type: 'EXPENSE', categoryKey: 'Vestuário',     minAmount: 80,    maxAmount: 450,   monthlyProb: 0.4, preferDay: null },
  { description: 'Corte de cabelo',        type: 'EXPENSE', categoryKey: 'Vestuário',     minAmount: 35,    maxAmount: 75,    monthlyProb: 1.0, preferDay: null },
]

// ─── Utilidades ───────────────────────────────────────────────────────────────

function rnd(min: number, max: number, decimals = 2): number {
  const v = min + Math.random() * (max - min)
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

function chance(prob: number): boolean {
  return Math.random() < prob
}

/** Retorna uma data UTC dentro do mês dado (year, month 0-indexed). */
function dateInMonth(year: number, month: number, day?: number | null): Date {
  const maxDay = new Date(year, month + 1, 0).getDate()
  const d = day ? Math.min(day, maxDay) : Math.floor(1 + Math.random() * (maxDay - 1))
  // Hora aleatória entre 06h e 22h UTC-3 → +3h = 09h–01h UTC
  const hour = 6 + Math.floor(Math.random() * 16)
  return new Date(Date.UTC(year, month, d, hour, Math.floor(Math.random() * 60)))
}

/** Retorna os últimos 12 meses completos (do passado ao mês atual). */
function getLast12Months(): { year: number; month: number }[] {
  const result: { year: number; month: number }[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({ year: d.getFullYear(), month: d.getMonth() })
  }
  return result
}

// ─── Core ─────────────────────────────────────────────────────────────────────

async function seedUser(userId: string, userName: string) {
  console.log(`\n  👤  Gerando dados para: ${userName}`)

  // Carrega categorias do usuário
  const categories = await prisma.category.findMany({ where: { userId } })
  const catMap = new Map(categories.map((c) => [c.name, c.id]))

  const fallbackId = catMap.get('Outros') ?? categories[0]?.id
  if (!fallbackId) {
    console.error(`  ✗  Sem categorias para ${userName}. Execute seed-users.ts primeiro.`)
    return
  }

  const months = getLast12Months()
  const batch: Parameters<typeof prisma.transaction.createMany>[0]['data'] = []

  for (const { year, month } of months) {
    const isJanuary  = month === 0
    const isDecember = month === 11
    const isCurrentMonth = (() => {
      const now = new Date()
      return year === now.getFullYear() && month === now.getMonth()
    })()

    // Cada template é avaliado para este mês
    for (const tmpl of TEMPLATES) {
      // Casos especiais: só em meses específicos
      const isIpvaSeguro   = ['IPVA', 'Seguro do carro'].includes(tmpl.description)
      const is13o          = tmpl.description === '13º Salário'

      if (isIpvaSeguro && !isJanuary)  continue
      if (is13o        && !isDecember) continue

      // Probabilidade de ocorrer
      let prob = tmpl.monthlyProb
      if (is13o || isIpvaSeguro) prob = 1.0

      // Mês atual: reduz probabilidade de gastos variáveis (ainda em andamento)
      if (isCurrentMonth && !tmpl.fixed) prob *= 0.5

      if (!chance(prob)) continue

      const categoryId = catMap.get(tmpl.categoryKey) ?? fallbackId
      const amount     = tmpl.fixed ? tmpl.minAmount : rnd(tmpl.minAmount, tmpl.maxAmount)
      const date       = dateInMonth(year, month, tmpl.preferDay)

      // Pequena variação no dia para fixed (±2 dias) — mais realista
      if (tmpl.fixed && tmpl.preferDay) {
        const offset = Math.floor(Math.random() * 5) - 2 // -2 a +2
        date.setUTCDate(Math.max(1, Math.min(28, (tmpl.preferDay ?? 1) + offset)))
      }

      batch.push({
        userId,
        categoryId,
        type:        tmpl.type,
        amount,
        description: tmpl.description,
        date,
        source:      'MANUAL',
        notes:       null,
        deletedAt:   null,
      })
    }
  }

  // Soft-delete aleatório em ~3% das transações (simula histórico de exclusões)
  const deleteCount = Math.floor(batch.length * 0.03)
  const deleteSet   = new Set<number>()
  while (deleteSet.size < deleteCount) deleteSet.add(Math.floor(Math.random() * batch.length))
  for (const idx of deleteSet) {
    const tx = batch[idx]
    if (tx) tx.deletedAt = new Date()
  }

  await prisma.transaction.createMany({ data: batch })
  console.log(`  ✓  ${batch.length} transações geradas (${deleteCount} soft-deleted)`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  Iniciando seed de transações...')
  console.log(`    Período: últimos 12 meses (${new Date().toLocaleDateString('pt-BR')})\n`)

  if (CLEAR) {
    console.log('  🗑️   Flag --clear detectada. Deletando transações existentes...')
    const deleted = await prisma.transaction.deleteMany({})
    console.log(`  ✓   ${deleted.count} transações removidas.\n`)
  }

  const where = USER_FILTER ? { email: USER_FILTER } : {}
  const users = await prisma.user.findMany({ where, select: { id: true, name: true, email: true } })

  if (users.length === 0) {
    console.error('  ✗  Nenhum usuário encontrado. Execute seed-users.ts primeiro.')
    process.exit(1)
  }

  for (const user of users) {
    await seedUser(user.id, `${user.name} <${user.email}>`)
  }

  const total = await prisma.transaction.count()
  console.log(`\n✅  Concluído! Total de transações no banco: ${total}`)

  const byType = await prisma.transaction.groupBy({
    by: ['type'],
    where: { deletedAt: null },
    _sum: { amount: true },
    _count: true,
  })

  console.log('\n  📊  Resumo geral:')
  for (const row of byType) {
    const label = row.type === 'INCOME' ? '  Receitas' : '  Despesas'
    const total = Number(row._sum.amount ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    console.log(`  ${label}: ${total}  (${row._count} lançamentos)`)
  }
  console.log()
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
