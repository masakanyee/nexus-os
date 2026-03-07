import dynamic from 'next/dynamic'

const DashboardClient = dynamic(() => import('./dashboard-client'), { ssr: false })

export default function Page() {
  return (
    <div style={{ minHeight: '100vh', background: '#020408', color: '#c8f0f8' }}>
      <DashboardClient />
    </div>
  )
}
