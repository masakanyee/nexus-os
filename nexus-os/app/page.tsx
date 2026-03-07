'use client'

import dynamic from 'next/dynamic'

const DashboardClient = dynamic(
  () => import('./dashboard-client'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg-void)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            border: '1px solid var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px #00ffff55',
          }}
        >
          <div style={{ width: 10, height: 10, background: 'var(--accent-cyan)' }} />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.15em' }}>
          LOADING
        </span>
      </div>
    ),
  }
)

export default function Page() {
  return <DashboardClient />
}
