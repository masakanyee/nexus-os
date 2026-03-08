'use client'
import dynamic from 'next/dynamic'
import AuthGate from '@/components/AuthGate'

const DashboardClient = dynamic(() => import('./dashboard-client'), { ssr: false })

export default function DashboardWrapper() {
  return (
    <AuthGate>
      <DashboardClient />
    </AuthGate>
  )
}
