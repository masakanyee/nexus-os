'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useProjectStore, useTimelogSettingsStore, loadTimelogSettings, GAS_LABELS } from '@/store'
import { getTabs } from '@/lib/gas'

const NAV = [
  { label: 'KANBAN', href: '/' },
  { label: 'FLOW BOARD', href: '/timeline' },
  { label: 'IMPORT', href: '/import' },
  { label: 'TIME LOG', href: '/timelog' },
  { label: 'SETTINGS', href: '/settings' },
]

export default function SettingsClient() {
  const projects = useProjectStore((s) => s.projects)
  const { gasUrl, mapping, setGasUrl, setMapping } = useTimelogSettingsStore()

  const [urlInput, setUrlInput] = useState('')
  const [localMapping, setLocalMapping] = useState<Record<string, string>>({})
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [testMsg, setTestMsg] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadTimelogSettings() }, [])

  useEffect(() => {
    setUrlInput(gasUrl)
    const m: Record<string, string> = {}
    GAS_LABELS.forEach((l) => { m[l] = mapping[l] ?? '' })
    setLocalMapping(m)
  }, [gasUrl, mapping])

  const handleTest = async () => {
    if (!urlInput.trim()) return
    setTestStatus('loading')
    setTestMsg('')
    try {
      const tabs = await getTabs(urlInput.trim())
      if (tabs.length === 0) {
        setTestStatus('error')
        setTestMsg('接続OK、ただしタブが見つかりませんでした（レスポンス形式を確認してください）')
      } else {
        setTestStatus('ok')
        setTestMsg(`OK — ${tabs.length} tabs: ${tabs.slice(0, 3).join(', ')}${tabs.length > 3 ? '...' : ''}`)
      }
    } catch (e) {
      setTestStatus('error')
      setTestMsg(e instanceof Error ? e.message : 'Connection failed')
    }
  }

  const handleSave = () => {
    setGasUrl(urlInput.trim())
    const m: Record<string, string | null> = {}
    GAS_LABELS.forEach((l) => { m[l] = localMapping[l] || null })
    setMapping(m)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const base = {
    background: 'var(--bg-void)', border: '1px solid var(--border-dim)',
    color: 'var(--text-bright)', fontFamily: 'var(--font-mono)',
    outline: 'none', borderRadius: 0,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', color: 'var(--text-bright)' }}>
      <header style={{ borderBottom: '1px solid var(--border-dim)', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 24, position: 'sticky', top: 0, background: 'var(--bg-void)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, border: '2px solid var(--accent-cyan)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 11, height: 11, background: 'var(--accent-cyan)', borderRadius: 2 }} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 900, color: 'var(--accent-cyan)', letterSpacing: '0.04em' }}>
            CLOUD<span style={{ color: 'var(--text-mid)', fontWeight: 600 }}> 2026年5億</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 1 }}>
          {NAV.map(({ label, href }) => {
            const active = label === 'SETTINGS'
            return (
              <Link key={label} href={href} style={{ textDecoration: 'none', fontSize: 11, fontFamily: 'var(--font-display)', padding: '5px 16px', letterSpacing: '0.12em', background: active ? 'rgba(232,160,0,0.1)' : 'transparent', border: `1px solid ${active ? 'var(--accent-cyan)' : 'var(--border-dim)'}`, color: active ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                {label}
              </Link>
            )
          })}
        </div>
      </header>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.2em', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 12, height: 1, background: 'var(--accent-cyan)', display: 'inline-block' }} />
          SYSTEM SETTINGS
        </div>

        {/* GAS URL */}
        <div className="bracket-box" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', letterSpacing: '0.15em', marginBottom: 14 }}>
            GAS API ENDPOINT
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setTestStatus('idle') }}
              placeholder="https://script.google.com/macros/s/..."
              style={{ ...base, flex: 1, fontSize: 12, padding: '7px 10px' }}
            />
            <button
              onClick={handleTest}
              disabled={!urlInput.trim() || testStatus === 'loading'}
              style={{ padding: '7px 16px', fontSize: 11, fontFamily: 'var(--font-display)', background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-mid)', cursor: 'pointer', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}
            >
              {testStatus === 'loading' ? '...' : 'TEST'}
            </button>
          </div>
          {testMsg && (
            <div style={{ marginTop: 8, fontSize: 12, fontFamily: 'var(--font-mono)', color: testStatus === 'ok' ? 'var(--accent-green)' : 'var(--accent-alert)' }}>
              {testStatus === 'ok' ? '✓ ' : '✗ '}{testMsg}
            </div>
          )}
        </div>

        {/* Mapping */}
        <div className="bracket-box" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', letterSpacing: '0.15em', marginBottom: 6 }}>
            LABEL → PROJECT MAPPING
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
            スプレッドシートのタグをKanbanプロジェクトに紐付け
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {GAS_LABELS.map((label) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-mid)', minWidth: 170, flexShrink: 0 }}>
                  {label}
                </div>
                <select
                  value={localMapping[label] ?? ''}
                  onChange={(e) => setLocalMapping((m) => ({ ...m, [label]: e.target.value }))}
                  style={{ ...base, flex: 1, fontSize: 12, padding: '5px 8px', colorScheme: 'dark' }}
                >
                  <option value="">—</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          style={{ padding: '10px 32px', fontSize: 12, fontFamily: 'var(--font-display)', background: saved ? 'rgba(50,215,75,0.12)' : 'rgba(232,160,0,0.1)', border: `1px solid ${saved ? 'var(--accent-green)' : 'var(--accent-cyan)'}`, color: saved ? 'var(--accent-green)' : 'var(--accent-cyan)', cursor: 'pointer', letterSpacing: '0.12em' }}
        >
          {saved ? '✓ SAVED' : 'SAVE SETTINGS'}
        </button>
      </div>
    </div>
  )
}
