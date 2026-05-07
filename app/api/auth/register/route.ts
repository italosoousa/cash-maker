import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations/auth'

const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', icon: 'utensils',   color: '#52B788' },
  { name: 'Transporte',  icon: 'car',        color: '#74C69D' },
  { name: 'Moradia',     icon: 'home',       color: '#2D6A4F' },
  { name: 'Saúde',       icon: 'heart',      color: '#E07A5F' },
  { name: 'Lazer',       icon: 'smile',      color: '#F2CC8F' },
  { name: 'Educação',    icon: 'book-open',  color: '#81B29A' },
  { name: 'Outros',      icon: 'tag',        color: '#9DC4AD' },
] as const

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, email, password } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'E-mail já cadastrado' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { name, email, password: hashedPassword },
        select: { id: true, name: true, email: true },
      })

      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((cat) => ({
          ...cat,
          isDefault: true,
          userId: newUser.id,
        })),
      })

      return newUser
    })

    return NextResponse.json({ data: user }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
