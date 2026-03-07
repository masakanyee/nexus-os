'use client'

import { useState, useEffect } from 'react'
import { useProjectStore, useTaskStore } from '@/store'

/**
 * クライアントマウント完了＋Zustand rehydrate 後にのみ子を描画する。
 * サーバーと初回クライアント描画は同じローディング表示にし、ハイドレーション不一致を防ぐ。
 */
export default function ClientOnlyDashboard({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let cancelled = false
    try {
      if (typeof useProjectStore.persist?.rehydrate === 'function') {
        useProjectStore.persist.rehydrate()
      }
      if (typeof useTaskStore.persist?.rehydrate === 'function') {
        useTaskStore.persist.rehydrate()
      }
    } catch (e) {
      console.error('[StoreHydration]', e)
    }
    // 次のティックで setState して、rehydrate による更新と重ならないようにする（React #185 無限更新を防ぐ）
    const id = setTimeout(() => {
      if (!cancelled) setMounted(true)
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [])

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
