'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useProjectStore, loadStoredState, saveStoredState } from '@/store'
import { Milestone, MilestoneSpan, Project } from '@/types'

const DAY_PX = 8
const LANE_HEIGHT = 170
const AXIS_HEIGHT = 48
const MS_HEIGHT = 130
const SIDEBAR_W = 200

const SPAN_DAYS: Record<MilestoneSpan, number> = {
  monthly: 30,
  quarterly: 91,
  half_year: 182,
}

const SPAN_LABEL: Record<MilestoneSpan, string> = {
  monthly: '1M',
  quarterly: 'Q',
  half_year: '6M',
}

function dateMs(s: string) { return new Date(s).getTime() }
function toDateStr(ms: number) { return new Date(ms).toISOString().split('T')[0] }

// ─── Add Modal ────────────────────────────────────────────────────────────────
function AddModal({
  project,
  initialDate,
  onAdd,
  onClose,
}: {
  project: Project
  initialDate: string
  onAdd: (m: Omit<Milestone, 'id' | 'projectId'>) => void
  onClose: () => void
}) {
  const [label, setLabel] = useState('')
  const [targetDate, setTargetDate] = useState(initialDate)
  const [span, setSpan] = useState<MilestoneSpan>('quarterly')
  const [notes, setNotes] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  const submit = () => {
    if (!label.trim() || !targetDate) return
    onAdd({ label: label.trim(), targetDate, span, completed: false, notes: notes.trim() || undefined, connections: [] })
  }

  const color = project.color
  const canSubmit = label.trim() && targetDate

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(2,8,16,0.85)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        className="bracket-box"
        style={{ width: 380, background: 'var(--bg-card)', borderColor: color, padding: '24px' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(); if (e.key === 'Escape') onClose() }}
      >
        <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', color, letterSpacing: '0.15em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
          {project.name} — NEW MILESTONE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            ref={ref}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="マイルストーン名"
            style={{ width: '100%', background: 'var(--bg-void)', border: '1px solid var(--border-dim)', color: 'var(--text-bright)', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '8px 10px', outline: 'none' }}
          />
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-void)', border: '1px solid var(--border-dim)', color: 'var(--text-bright)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '8px 10px', outline: 'none', colorScheme: 'dark' }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {(['monthly', 'quarterly', 'half_year'] as MilestoneSpan[]).map((s) => (
              <button
                key={s}
                onClick={() => setSpan(s)}
                style={{
                  flex: 1, fontSize: 9, fontFamily: 'var(--font-display)', padding: '6px 4px',
                  background: span === s ? `${color}20` : 'transparent',
                  border: `1px solid ${span === s ? color : 'var(--border-dim)'}`,
                  color: span === s ? color : 'var(--text-muted)', cursor: 'pointer', letterSpacing: '0.06em',
                }}
              >
                {s === 'monthly' ? '1 MONTH' : s === 'quarterly' ? 'QUARTER' : '6 MONTHS'}
              </button>
            ))}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="メモ（任意）"
            rows={3}
            style={{ width: '100%', background: 'var(--bg-void)', border: '1px solid var(--border-dim)', color: 'var(--text-mid)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '8px 10px', outline: 'none', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={submit}
              disabled={!canSubmit}
              style={{
                flex: 1, padding: '8px', fontSize: 10, fontFamily: 'var(--font-display)',
                background: canSubmit ? `${color}18` : 'transparent',
                border: `1px solid ${canSubmit ? color : 'var(--border-dim)'}`,
                color: canSubmit ? color : 'var(--text-muted)',
                cursor: canSubmit ? 'pointer' : 'not-allowed', letterSpacing: '0.1em',
              }}
            >
              ADD MILESTONE
            </button>
            <button
              onClick={onClose}
              style={{ padding: '8px 14px', fontSize: 10, fontFamily: 'var(--font-display)', background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TimelineClient() {
  useEffect(() => {
    loadStoredState()
    const unsubP = useProjectStore.subscribe(saveStoredState)
    return () => { unsubP() }
  }, [])

  const projects = useProjectStore((s) => s.projects)
  const addMilestone = useProjectStore((s) => s.addMilestone)
  const updateMilestone = useProjectStore((s) => s.updateMilestone)
  const deleteMilestone = useProjectStore((s) => s.deleteMilestone)

  const scrollRef = useRef<HTMLDivElement>(null)

  // date range
  const today = Date.now()
  const allMs = projects.flatMap((p) => p.milestones.map((m) => dateMs(m.targetDate)))
  const startDate = Math.min(today, ...(allMs.length ? allMs : [today])) - 90 * 86400000
  const endDate = Math.max(today, ...(allMs.length ? allMs : [today])) + 120 * 86400000
  const totalW = Math.round((endDate - startDate) / 86400000) * DAY_PX

  const toPx = (dateStr: string) => Math.round((dateMs(dateStr) - startDate) / 86400000) * DAY_PX
  const todayPx = Math.round((today - startDate) / 86400000) * DAY_PX

  // month labels
  const months: { label: string; px: number }[] = []
  const d = new Date(startDate); d.setDate(1)
  while (d.getTime() < endDate) {
    months.push({ label: d.toLocaleDateString('ja-JP', { year: '2-digit', month: 'short' }), px: Math.round((d.getTime() - startDate) / 86400000) * DAY_PX })
    d.setMonth(d.getMonth() + 1)
  }

  // state
  const [editing, setEditing] = useState<{ pid: string; mid: string } | null>(null)
  const [adding, setAdding] = useState<{ pid: string; date: string } | null>(null)
  const [connectSrc, setConnectSrc] = useState<{ pid: string; mid: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const msLeft = (m: Milestone) => toPx(m.targetDate) - SPAN_DAYS[m.span] * DAY_PX
  const msWidth = (m: Milestone) => SPAN_DAYS[m.span] * DAY_PX

  // connection rendering
  const renderConnections = () => {
    const paths: React.ReactNode[] = []
    projects.forEach((p, pi) => {
      p.milestones.forEach((m) => {
        if (!m.connections?.length) return
        const sx = msLeft(m) + msWidth(m)
        const sy = pi * LANE_HEIGHT + LANE_HEIGHT / 2
        m.connections.forEach((connId) => {
          projects.forEach((p2, p2i) => {
            const cm = p2.milestones.find((x) => x.id === connId)
            if (!cm) return
            const tx = msLeft(cm)
            const ty = p2i * LANE_HEIGHT + LANE_HEIGHT / 2
            const cx = (sx + tx) / 2
            paths.push(
              <path
                key={`${m.id}-${connId}`}
                d={`M ${sx} ${sy} C ${cx} ${sy} ${cx} ${ty} ${tx} ${ty}`}
                fill="none"
                stroke="rgba(0,229,255,0.45)"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                markerEnd="url(#arr)"
              />
            )
          })
        })
      })
    })
    return paths
  }

  const handleLaneClick = (e: React.MouseEvent<HTMLDivElement>, pid: string) => {
    if (connectSrc) return
    const el = scrollRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const clickX = e.clientX - rect.left + el.scrollLeft - SIDEBAR_W
    const clickDate = toDateStr(startDate + (clickX / DAY_PX) * 86400000)
    setAdding({ pid, date: clickDate })
    setEditing(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border-dim)', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-void)', zIndex: 200, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 28, height: 28, border: '1px solid var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-cyan)' }}>
              <div style={{ width: 10, height: 10, background: 'var(--accent-cyan)' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 900, color: 'var(--accent-cyan)', letterSpacing: '0.2em', textShadow: 'var(--glow-cyan)' }}>
              NEXUS<span style={{ color: 'var(--text-mid)', fontWeight: 400 }}>::OS</span>
            </span>
          </Link>
          <div style={{ display: 'flex', gap: 1 }}>
            {[
              { label: 'KANBAN', href: '/' },
              { label: 'TIMELINE', href: '/timeline' },
            ].map(({ label, href }) => {
              const active = label === 'TIMELINE'
              return (
                <Link
                  key={label}
                  href={href}
                  style={{
                    textDecoration: 'none', fontSize: 9, fontFamily: 'var(--font-display)',
                    padding: '5px 14px', letterSpacing: '0.12em',
                    background: active ? 'rgba(0,229,255,0.1)' : 'transparent',
                    border: `1px solid ${active ? 'var(--accent-cyan)' : 'var(--border-dim)'}`,
                    color: active ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  }}
                >
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {projects.length} PROJECTS · {projects.flatMap((p) => p.milestones).length} MILESTONES
          <span style={{ marginLeft: 16, color: 'var(--text-mid)', fontSize: 9 }}>— 空欄クリックで追加</span>
        </div>
      </header>

      {/* Board */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: SIDEBAR_W, flexShrink: 0, background: 'var(--bg-panel)', borderRight: '1px solid var(--border-dim)', zIndex: 10 }}>
          <div style={{ height: AXIS_HEIGHT, borderBottom: '1px solid var(--border-dim)' }} />
          {projects.map((p) => (
            <div
              key={p.id}
              style={{ height: LANE_HEIGHT, borderBottom: '1px solid var(--border-dim)', padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 6 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, boxShadow: `0 0 6px ${p.color}`, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: 'var(--text-bright)', letterSpacing: '0.06em', lineHeight: 1.4 }}>{p.name}</span>
              </div>
              <button
                onClick={() => setAdding({ pid: p.id, date: toDateStr(today) })}
                style={{
                  marginTop: 4, fontSize: 8, fontFamily: 'var(--font-display)', padding: '3px 8px',
                  background: 'transparent', border: `1px dashed ${p.color}55`,
                  color: `${p.color}88`, cursor: 'pointer', letterSpacing: '0.08em', alignSelf: 'flex-start',
                }}
                onMouseEnter={(e) => { const el = e.currentTarget; el.style.borderColor = p.color; el.style.color = p.color }}
                onMouseLeave={(e) => { const el = e.currentTarget; el.style.borderColor = `${p.color}55`; el.style.color = `${p.color}88` }}
              >
                + ADD
              </button>
            </div>
          ))}
        </div>

        {/* Scrollable timeline */}
        <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}>
          <div style={{ width: Math.max(totalW, 100), position: 'relative' }}>

            {/* Time axis */}
            <div style={{ height: AXIS_HEIGHT, position: 'sticky', top: 0, background: 'var(--bg-void)', zIndex: 20, borderBottom: '1px solid var(--border-dim)' }}>
              {months.map((m, i) => (
                <div
                  key={i}
                  style={{ position: 'absolute', left: m.px, top: 0, bottom: 0, borderLeft: '1px solid var(--border-dim)', paddingLeft: 8, display: 'flex', alignItems: 'center' }}
                >
                  <span style={{ fontSize: 9, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{m.label}</span>
                </div>
              ))}
              {/* Today marker on axis */}
              <div style={{ position: 'absolute', left: todayPx, top: 0, bottom: 0, width: 1, background: 'rgba(0,229,255,0.5)' }}>
                <span style={{ position: 'absolute', top: 6, left: 4, fontSize: 8, fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>TODAY</span>
              </div>
            </div>

            {/* Today vertical line across all lanes */}
            <div style={{ position: 'absolute', left: todayPx, top: AXIS_HEIGHT, bottom: 0, width: 1, background: 'rgba(0,229,255,0.15)', pointerEvents: 'none', zIndex: 1 }} />

            {/* SVG connections */}
            <svg
              style={{ position: 'absolute', left: 0, top: AXIS_HEIGHT, width: '100%', height: projects.length * LANE_HEIGHT, pointerEvents: 'none', zIndex: 5 }}
            >
              <defs>
                <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="rgba(0,229,255,0.6)" />
                </marker>
              </defs>
              {renderConnections()}
            </svg>

            {/* Project lanes */}
            {projects.map((project, pi) => (
              <div
                key={project.id}
                onClick={(e) => handleLaneClick(e, project.id)}
                style={{
                  position: 'relative',
                  height: LANE_HEIGHT,
                  borderBottom: '1px solid var(--border-dim)',
                  cursor: connectSrc ? 'crosshair' : 'cell',
                }}
              >
                {/* Milestones */}
                {project.milestones.map((m) => {
                  const ml = msLeft(m)
                  const mw = msWidth(m)
                  const isEditing = editing?.mid === m.id
                  const isConnSrc = connectSrc?.mid === m.id
                  const isDeleting = deletingId === m.id
                  const color = project.color

                  return (
                    <div
                      key={m.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (connectSrc) {
                          if (connectSrc.mid !== m.id) {
                            const src = projects.find((p) => p.id === connectSrc.pid)?.milestones.find((x) => x.id === connectSrc.mid)
                            if (src) {
                              const conns = src.connections ?? []
                              updateMilestone(connectSrc.pid, connectSrc.mid, {
                                connections: conns.includes(m.id) ? conns.filter((id) => id !== m.id) : [...conns, m.id],
                              })
                            }
                          }
                          setConnectSrc(null)
                          return
                        }
                        setEditing(isEditing ? null : { pid: project.id, mid: m.id })
                        setDeletingId(null)
                      }}
                      style={{
                        position: 'absolute',
                        left: ml,
                        top: (LANE_HEIGHT - MS_HEIGHT) / 2,
                        width: mw,
                        height: MS_HEIGHT,
                        background: m.completed ? `${color}0d` : 'var(--bg-card)',
                        border: `1px solid ${isEditing ? color : isConnSrc ? color : m.completed ? `${color}44` : 'var(--border-dim)'}`,
                        boxShadow: isEditing ? `0 0 16px ${color}33` : 'none',
                        cursor: connectSrc ? 'crosshair' : 'pointer',
                        zIndex: isEditing ? 15 : 6,
                        padding: '8px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                      }}
                    >
                      {/* Top row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4, marginBottom: 4, flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); updateMilestone(project.id, m.id, { completed: !m.completed }) }}
                            style={{ width: 11, height: 11, borderRadius: '50%', background: m.completed ? color : 'transparent', border: `1px solid ${color}`, cursor: 'pointer', flexShrink: 0, padding: 0 }}
                          />
                          <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.05em', color: m.completed ? 'var(--text-muted)' : 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: m.completed ? 'line-through' : 'none' }}>
                            {m.label}
                          </span>
                        </div>
                        {/* Delete */}
                        {isDeleting ? (
                          <div style={{ display: 'flex', gap: 2 }} onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => { deleteMilestone(project.id, m.id); setDeletingId(null); setEditing(null) }} style={{ fontSize: 8, padding: '1px 5px', background: 'rgba(255,68,68,0.15)', border: '1px solid var(--accent-alert)', color: 'var(--accent-alert)', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>DEL</button>
                            <button onClick={(e) => { e.stopPropagation(); setDeletingId(null) }} style={{ fontSize: 8, padding: '1px 5px', background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingId(m.id) }}
                            style={{ fontSize: 9, padding: '0 3px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-alert)' }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
                          >×</button>
                        )}
                      </div>

                      {/* Date + span */}
                      <div style={{ fontSize: 8, color, fontFamily: 'var(--font-mono)', marginBottom: 4, opacity: 0.8, flexShrink: 0 }}>
                        {new Date(m.targetDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                        <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{SPAN_LABEL[m.span]}</span>
                      </div>

                      {/* Notes */}
                      {isEditing ? (
                        <textarea
                          value={m.notes ?? ''}
                          onChange={(e) => updateMilestone(project.id, m.id, { notes: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="メモを入力..."
                          style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-mid)', fontFamily: 'var(--font-mono)', fontSize: 10, outline: 'none', resize: 'none', lineHeight: 1.5 }}
                        />
                      ) : (
                        <div style={{ flex: 1, fontSize: 10, color: m.notes ? 'var(--text-mid)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)', lineHeight: 1.4, overflow: 'hidden', opacity: m.notes ? 1 : 0.45 }}>
                          {m.notes || 'メモを追加...'}
                        </div>
                      )}

                      {/* Span + connect buttons (editing only) */}
                      {isEditing && (
                        <div style={{ display: 'flex', gap: 3, marginTop: 5, flexShrink: 0, flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                          {(['monthly', 'quarterly', 'half_year'] as MilestoneSpan[]).map((s) => (
                            <button
                              key={s}
                              onClick={() => updateMilestone(project.id, m.id, { span: s })}
                              style={{
                                fontSize: 8, fontFamily: 'var(--font-display)', padding: '2px 6px',
                                background: m.span === s ? `${color}20` : 'transparent',
                                border: `1px solid ${m.span === s ? color : 'var(--border-dim)'}`,
                                color: m.span === s ? color : 'var(--text-muted)', cursor: 'pointer',
                              }}
                            >
                              {SPAN_LABEL[s]}
                            </button>
                          ))}
                          <button
                            onClick={() => { setConnectSrc({ pid: project.id, mid: m.id }); setEditing(null) }}
                            style={{ fontSize: 8, fontFamily: 'var(--font-display)', padding: '2px 6px', background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 'auto' }}
                          >
                            🔗
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Connect mode banner */}
      {connectSrc && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: 'rgba(0,229,255,0.08)', border: '1px solid var(--accent-cyan)', padding: '10px 24px', display: 'flex', gap: 16, alignItems: 'center', backdropFilter: 'blur(4px)' }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', letterSpacing: '0.1em' }}>接続先マイルストーンをクリック</span>
          <button onClick={() => setConnectSrc(null)} style={{ fontSize: 9, fontFamily: 'var(--font-display)', padding: '3px 12px', background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-muted)', cursor: 'pointer' }}>CANCEL</button>
        </div>
      )}

      {/* Add modal */}
      {adding && (
        <AddModal
          project={projects.find((p) => p.id === adding.pid)!}
          initialDate={adding.date}
          onAdd={(m) => { addMilestone(adding.pid, m); setAdding(null) }}
          onClose={() => setAdding(null)}
        />
      )}
    </div>
  )
}
