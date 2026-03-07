'use client'

import { useState, useEffect } from 'react'
import { useProjectStore, useTaskStore, loadStoredState, saveStoredState } from '@/store'

/**
 * クライアントマウント後に localStorage から1回だけ復元し、そのあと子を描画。
 * persist ミドルウェアを使わないため React #185 の無限更新を防ぐ。
 */
export default function ClientOnlyDashboard({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    loadStoredState()
    const id = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(id)
  }, [])

  // マウント後、ストアの変更を localStorage に保存（サブスクライブは state を更新しないのでループしない）
  useEffect(() => {
    if (!mounted) return
    const unsubP = useProjectStore.subscribe(saveStoredState)
    const unsubT = useTaskStore.subscribe(saveStoredState)
    return () => {
      unsubP()
      unsubT()
    }
  }, [mounted])

  if (!mounted) {
    return (
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
            boxShadow: 'var(--glow-cyan)',
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              background: 'var(--accent-cyan)',
              boxShadow: 'var(--glow-cyan)',
            }}
          />
        </div>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 12,
            color: 'var(--text-muted)',
            letterSpacing: '0.15em',
          }}
        >
          LOADING
        </span>
      </div>
    )
  }

  return <>{children}</>
}
