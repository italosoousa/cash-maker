import { NextResponse } from 'next/server'
import { auth }         from '@/lib/auth'
import { prisma }       from '@/lib/prisma'
import bcrypt           from 'bcryptjs'
import { z }            from 'zod'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual obrigatória'),
  newPassword:     z.string().min(8, 'Nova senha deve ter ao menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path:    ['confirmPassword'],
})

// PATCH /api/profile/password
export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body   = await request.json()
  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { password: true },
  })
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.password)
  if (!valid) return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })

  const hash = await bcrypt.hash(parsed.data.newPassword, 12)
  await prisma.user.update({
    where: { id: session.user.id },
    data:  { password: hash },
  })

  return NextResponse.json({ data: { success: true } })
}
