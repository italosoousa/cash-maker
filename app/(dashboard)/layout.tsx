import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { name, email } = session.user

  return (
    <div className="dashboard-shell">
      {/* Sidebar — desktop */}
      <Sidebar userName={name ?? 'Usuário'} userEmail={email ?? ''} />

      {/* Área principal */}
      <div className="dashboard-main">
        <Header userName={name ?? 'Usuário'} userEmail={email ?? ''} />

        <main className="dashboard-content">
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile */}
      <BottomNav />
    </div>
  )
}
