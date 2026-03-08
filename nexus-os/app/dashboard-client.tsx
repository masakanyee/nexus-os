'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useProjectStore, useTaskStore, loadFromSupabase, saveToSupabase, loadStoredState } from '@/store'
import ProjectCard from '@/components/compass/ProjectCard'
import TaskBoard from '@/components/tasks/TaskBoard'

function Clock() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDate(now.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.1em', lineHeight: 1 }}>{time}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: 2 }}>{date}</div>
    </div>
  )
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'ACTIVE' },
  { value: 'stalled', label: 'STALLED' },
  { value: 'done', label: 'DONE' },
] as const

function AddProjectForm({ onClose }: { onClose: () => void }) {
  const addProject = useProjectStore((s) => s.addProject)
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [deadline, setDeadline] = useState('')
  const [color, setColor] = useState('#00e5ff')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const handleSubmit = () => {
    if (!name.trim() || !deadline) return
    addProject({ name: name.trim(), goal: goal.trim(), deadline, color })
    onClose()
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg-void)',
    border: '1px solid var(--border-dim)', borderRadius: 0,
    color: 'var(--text-bright)', fontFamily: 'var(--font-mono)',
    fontSize: 13, padding: '7px 10px', outline: 'none',
  }

  return (
    <div
      className="bracket-box"
      style={{ padding: '14px', marginTop: 12, background: 'rgba(232,160,0,0.04)', borderColor: 'var(--accent-cyan)' }}
      onKeyDown={handleKey}
    >
      <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', letterSpacing: '0.15em', marginBottom: 10 }}>
        NEW PROJECT
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="プロジェクト名"
          style={inputStyle}
        />
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="目標（任意）"
          style={inputStyle}
        />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            style={{ ...inputStyle, flex: 1, colorScheme: 'light' }}
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ width: 32, height: 34, padding: 2, background: 'var(--bg-void)', border: '1px solid var(--border-dim)', cursor: 'pointer' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !deadline}
            style={{
              flex: 1, padding: '7px', fontSize: 11, fontFamily: 'var(--font-display)',
              background: name.trim() && deadline ? 'rgba(232,160,0,0.12)' : 'transparent',
              border: `1px solid ${name.trim() && deadline ? 'var(--accent-cyan)' : 'var(--border-dim)'}`,
              color: name.trim() && deadline ? 'var(--accent-cyan)' : 'var(--text-muted)',
              cursor: name.trim() && deadline ? 'pointer' : 'not-allowed',
              letterSpacing: '0.1em',
            }}
          >
            ADD
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '7px 14px', fontSize: 11, fontFamily: 'var(--font-display)',
              background: 'transparent', border: '1px solid var(--border-dim)',
              color: 'var(--text-muted)', cursor: 'pointer', letterSpacing: '0.1em',
            }}
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  )
}

function DashboardContent() {
  const projects = useProjectStore((s) => s.projects)
  const [selectedId, setSelectedId] = useState<string | null>(projects[0]?.id ?? null)
  const [addingProject, setAddingProject] = useState(false)

  const stalledCount = projects.filter((p) => {
    const days = Math.floor((Date.now() - new Date(p.lastTouched).getTime()) / (1000 * 60 * 60 * 24))
    return days >= 5
  }).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid var(--border-dim)', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-void)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, border: '2px solid var(--accent-cyan)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 11, height: 11, background: 'var(--accent-cyan)', borderRadius: 2 }} />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 900, color: 'var(--accent-cyan)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              CLOUD<span style={{ color: 'var(--text-mid)', fontWeight: 600 }}> 2026年5億</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 1 }}>
            {[{ label: 'KANBAN', href: '/' }, { label: 'FLOW BOARD', href: '/timeline' }, { label: 'IMPORT', href: '/import' }].map(({ label, href }) => {
              const active = label === 'KANBAN'
              return (
                <Link key={label} href={href} style={{ textDecoration: 'none', fontSize: 11, fontFamily: 'var(--font-display)', padding: '5px 16px', letterSpacing: '0.12em', background: active ? 'rgba(232,160,0,0.1)' : 'transparent', border: `1px solid ${active ? 'var(--accent-cyan)' : 'var(--border-dim)'}`, color: active ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                  {label}
                </Link>
              )
            })}
          </div>
          {stalledCount > 0 && (
            <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--accent-alert)', border: '1px solid rgba(255,68,68,0.4)', background: 'rgba(255,68,68,0.08)', padding: '4px 12px', letterSpacing: '0.1em' }}>
              ⚠ {stalledCount} PROJECT{stalledCount > 1 ? 'S' : ''} IDLE
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ display: 'flex', gap: 28 }}>
            {[
              { label: 'PROJECTS', value: projects.length },
              { label: 'ACTIVE', value: projects.filter((p) => p.status === 'active').length },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', fontWeight: 700 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.12em' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <Clock />
        </div>
      </header>
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '310px 1fr', overflow: 'hidden', height: 'calc(100vh - 73px)' }}>
        <aside style={{ borderRight: '1px solid var(--border-dim)', padding: '20px 16px', overflowY: 'auto', background: 'var(--bg-panel)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.2em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 12, height: 1, background: 'var(--accent-cyan)', display: 'inline-block' }} />
              PROJECT COMPASS
            </div>
            <button
              onClick={() => setAddingProject((v) => !v)}
              style={{
                fontSize: 11, fontFamily: 'var(--font-display)', padding: '4px 12px',
                background: addingProject ? 'rgba(232,160,0,0.12)' : 'transparent',
                border: `1px solid ${addingProject ? 'var(--accent-cyan)' : 'var(--border-dim)'}`,
                color: addingProject ? 'var(--accent-cyan)' : 'var(--text-mid)',
                cursor: 'pointer', letterSpacing: '0.08em',
              }}
            >
              {addingProject ? '✕' : '+ NEW'}
            </button>
          </div>

          {addingProject && <AddProjectForm onClose={() => setAddingProject(false)} />}

          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isSelected={selectedId === project.id}
              onClick={() => setSelectedId(project.id)}
            />
          ))}
          {selectedId && (() => {
            const p = projects.find((x) => x.id === selectedId)
            if (!p?.milestones.length) return null
            return (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.2em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 12, height: 1, background: p.color, display: 'inline-block' }} />
                  MILESTONES
                </div>
                {p.milestones.map((m) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, opacity: m.completed ? 0.45 : 1 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 3, background: m.completed ? p.color : 'transparent', border: `1px solid ${p.color}`, boxShadow: m.completed ? `0 0 6px ${p.color}` : 'none' }} />
                    <div>
                      <div style={{ fontSize: 13, color: m.completed ? 'var(--text-muted)' : 'var(--text-bright)', lineHeight: 1.4 }}>{m.completed && <span style={{ marginRight: 4 }}>✓</span>}{m.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(m.targetDate).toLocaleDateString('ja-JP')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </aside>
        <section style={{ padding: '20px 24px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.2em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 12, height: 1, background: 'var(--accent-cyan)', display: 'inline-block' }} />
            TASK MATRIX
          </div>
          <TaskBoard selectedProjectId={selectedId} />
        </section>
      </main>
    </div>
  )
}

export default function DashboardClient() {
  useEffect(() => {
    // Supabase からロード、失敗時は localStorage にフォールバック
    loadFromSupabase().catch(() => {
      try { loadStoredState() } catch { /* ignore */ }
    })

    // 変更を Supabase にデバウンス保存（1.5秒後）
    let timer: ReturnType<typeof setTimeout>
    const debouncedSave = () => {
      clearTimeout(timer)
      timer = setTimeout(() => saveToSupabase(), 1500)
    }

    const unsubP = useProjectStore.subscribe(debouncedSave)
    const unsubT = useTaskStore.subscribe(debouncedSave)
    return () => {
      unsubP()
      unsubT()
      clearTimeout(timer)
    }
  }, [])

  return <DashboardContent />
}
