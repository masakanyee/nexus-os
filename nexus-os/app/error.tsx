'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-void)',
        color: 'var(--text-bright)',
        fontFamily: 'var(--font-mono)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          color: 'var(--accent-alert)',
          letterSpacing: '0.1em',
        }}
      >
        APPLICATION ERROR
      </div>
      <pre
        style={{
          fontSize: 11,
          color: 'var(--text-mid)',
          maxWidth: '90vw',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          border: '1px solid var(--border-dim)',
          padding: 16,
          background: 'var(--bg-panel)',
        }}
      >
        {error.message}
      </pre>
      {error.digest && (
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          digest: {error.digest}
        </span>
      )}
      <button
        type="button"
        onClick={reset}
        style={{
          marginTop: 8,
          padding: '10px 20px',
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          letterSpacing: '0.1em',
          background: 'transparent',
          border: '1px solid var(--accent-cyan)',
          color: 'var(--accent-cyan)',
          cursor: 'pointer',
        }}
      >
        TRY AGAIN
      </button>
    </div>
  )
}
