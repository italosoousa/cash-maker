import { auth } from '@/lib/auth'
import { DashboardClient } from '@/components/dashboard/dashboard-client'

export default async function DashboardPage() {
  const session   = await auth()
  const firstName = session?.user?.name?.split(' ')[0] ?? 'Usuário'

  return <DashboardClient firstName={firstName} />
}
