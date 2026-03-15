'use client'

import { useState, useEffect } from 'react'
import { useProjectStore, useRevenueStore } from '@/store'
import { saveToSupabase } from '@/store'

interface Props {
  period: string
  hoursMap: Record<string, number>  // projectId → hours for this period
  onClose: () => void
}

const fmt = (n: number) =>
  n >= 10000 ? `¥${(n / 10000).toFixed(1)}万` : `¥${n.toLocaleString()}`

export default function RevenueInputPanel({ period, hoursMap, onClose }: Props) {
  const projects = useProjectStore((s) => s.projects)
  const { records, upsertRecord } = useRevenueStore()
  const [inputs, setInputs] = useState<Record<string, { revenue: string; profit: string; memo: string }>>({})
  const [saved, setSaved] = useState(false)

  // 既存データを初期値としてセット
  useEffect(() => {
    const init: typeof inputs = {}
    projects.forEach((p) => {
      const existing = records.find((r) => r.projectId === p.id && r.period === period)
      init[p.id] = {
        revenue: existing ? String(existing.revenue) : '',
        profit: existing ? String(existing.profit) : '',
        memo: existing?.memo ?? '',
      }
    })
    setInputs(init)
  }, [period, records, projects])

  const handleSave = async () => {
    projects.forEach((p) => {
      const v = inputs[p.id]
      if (!v) return
      const revenue = parseInt(v.revenue.replace(/[,¥万]/g, '')) || 0
      const profit = parseInt(v.profit.replace(/[,¥万]/g, '')) || 0
      if (revenue === 0 && profit === 0) return
      upsertRecord({
        projectId: p.id,
        period,
        revenue,
        profit,
        hours: hoursMap[p.id] ?? 0,
        memo: v.memo || undefined,
      })
    })
    await saveToSupabase()
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const base = {
    background: 'var(--bg-void)',
    border: '1px solid var(--border-dim)',
    color: 'var(--text-bright)',
    fontFamily: 'var(--font-mono)',
    outline: 'none',
    borderRadius: 0,
    fontSize: 13,
    padding: '5px 8px',
    width: '100%',
  }

  const activeProjects = projects.filter((p) => p.status !== 'completed')

  return (
    <div className="bracket-box" style={{ padding: 20, marginBottom: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', letterSpacing: '0.15em', marginBottom: 2 }}>
            REVENUE INPUT
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>期間: {period} の売上・利益を入力</div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}
        >
          ×
        </button>
      </div>

      {/* Table header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px 80px', gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.12em' }}>PROJECT</div>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.12em', textAlign: 'right' }}>売上（円）</div>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.12em', textAlign: 'right' }}>利益（円）</div>
        <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.12em', textAlign: 'right' }}>稼働h</div>
      </div>

      {/* Rows */}
      {activeProjects.map((p) => {
        const v = inputs[p.id] ?? { revenue: '', profit: '', memo: '' }
        const hours = hoursMap[p.id] ?? 0
        return (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px 80px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
            </div>
            <input
              type="number"
              placeholder="0"
              value={v.revenue}
              onChange={(e) => setInputs((prev) => ({ ...prev, [p.id]: { ...v, revenue: e.target.value } }))}
              style={{ ...base, textAlign: 'right', colorScheme: 'dark' }}
            />
            <input
              type="number"
              placeholder="0"
              value={v.profit}
              onChange={(e) => setInputs((prev) => ({ ...prev, [p.id]: { ...v, profit: e.target.value } }))}
              style={{ ...base, textAlign: 'right', colorScheme: 'dark' }}
            />
            <div style={{ fontSize: 12, color: hours > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
              {hours > 0 ? `${hours.toFixed(1)}h` : '—'}
            </div>
          </div>
        )
      })}

      {/* Save button */}
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          style={{
            padding: '8px 28px',
            fontSize: 12,
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.12em',
            background: saved ? 'rgba(50,215,75,0.12)' : 'rgba(232,160,0,0.1)',
            border: `1px solid ${saved ? 'var(--accent-green)' : 'var(--accent-cyan)'}`,
            color: saved ? 'var(--accent-green)' : 'var(--accent-cyan)',
            cursor: 'pointer',
          }}
        >
          {saved ? '✓ SAVED' : 'SAVE'}
        </button>
      </div>
    </div>
  )
}
