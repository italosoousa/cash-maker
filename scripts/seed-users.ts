/**
 * seed-users.ts
 * Cria usuários fake com categorias padrão para testes.
 *
 * Uso:
 *   npx tsx scripts/seed-users.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Configuração ───────────────────────────────────────────────────────────

const USERS = [
  { name: 'Italo Sousa',     email: 'italo@cashmaker.dev',   password: 'Teste123' },
  { name: 'Ana Lima',        email: 'ana@cashmaker.dev',     password: 'Teste123' },
  { name: 'Bruno Mendes',    email: 'bruno@cashmaker.dev',   password: 'Teste123' },
]

const DEFAULT_CATEGORIES = [
  { name: 'Alimentação',  icon: 'utensils',        color: '#E07A5F', isDefault: true },
  { name: 'Transporte',   icon: 'car',             color: '#3D405B', isDefault: true },
  { name: 'Moradia',      icon: 'home',            color: '#81B29A', isDefault: true },
  { name: 'Saúde',        icon: 'heart-pulse',     color: '#F2CC8F', isDefault: true },
  { name: 'Lazer',        icon: 'gamepad-2',       color: '#52B788', isDefault: true },
  { name: 'Educação',     icon: 'graduation-cap',  color: '#2D6A4F', isDefault: true },
  { name: 'Outros',       icon: 'tag',             color: '#9DC4AD', isDefault: true },
  { name: 'Salário',      icon: 'banknote',        color: '#52B788', isDefault: false },
  { name: 'Freelance',    icon: 'briefcase',       color: '#74C69D', isDefault: false },
  { name: 'Investimentos',icon: 'trending-up',     color: '#2D6A4F', isDefault: false },
  { name: 'Vestuário',    icon: 'shirt',           color: '#E07A5F', isDefault: false },
  { name: 'Assinaturas',  icon: 'credit-card',     color: '#3D405B', isDefault: false },
]

// ─── Helper ──────────────────────────────────────────────────────────────────

async function upsertUser(name: string, email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    console.log(`  ↩  Usuário já existe: ${email}`)
    return existing
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { name, email, password: hashedPassword },
    })

    await tx.category.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        ...cat,
        userId: newUser.id,
      })),
    })

    return newUser
  })

  console.log(`  ✓  Criado: ${name} <${email}> — senha: ${password}`)
  return user
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  Iniciando seed de usuários...\n')

  for (const u of USERS) {
    await upsertUser(u.name, u.email, u.password)
  }

  const total = await prisma.user.count()
  const cats  = await prisma.category.count()

  console.log(`\n✅  Concluído! Total: ${total} usuário(s), ${cats} categoria(s)\n`)
  console.log('─────────────────────────────────────────────')
  console.log('  Credenciais para login:')
  for (const u of USERS) {
    console.log(`  📧  ${u.email.padEnd(28)} 🔑  ${u.password}`)
  }
  console.log('─────────────────────────────────────────────\n')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
