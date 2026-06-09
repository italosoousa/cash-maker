import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { Loader2 } from 'lucide-react'

export default async function DashboardPage() {
  const session   = await auth()
  const firstName = session?.user?.name?.split(' ')[0] ?? 'Usuário'

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[var(--gray-400)]" />
      </div>
    }>
      <DashboardClient firstName={firstName} />
    </Suspense>
  )
}
