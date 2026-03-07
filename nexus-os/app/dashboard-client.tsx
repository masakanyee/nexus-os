'use client'

import { useState, useEffect } from 'react'
import { useProjectStore, useTaskStore, loadStoredState, saveStoredState } from '@/store'
import ProjectCard from '@/components/compass/ProjectCard'
import TaskBoard from '@/components/tasks/TaskBoard'

function LoadingScreen() {
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
        <div style={{ width: 10, height: 10, background: 'var(--accent-cyan)', boxShadow: 'var(--glow-cyan)' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.15em' }}>
        LOADING
      </span>
    </div>
  )
}

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
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.1em', textShadow: 'var(--glow-cyan)', lineHeight: 1 }}>{time}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: 2 }}>{date}</div>
    </div>
  )
}

function DashboardContent() {
  const projects = useProjectStore((s) => s.projects)
  const [selectedId, setSelectedId] = useState<string | null>(projects[0]?.id ?? null)

  const stalledCount = projects.filter((p) => {
    const days = Math.floor((Date.now() - new Date(p.lastTouched).getTime()) / (1000 * 60 * 60 * 24))
    return days >= 5
  }).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid var(--border-dim)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-void)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, border: '1px solid var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-cyan)' }}>
              <div style={{ width: 10, height: 10, background: 'var(--accent-cyan)', boxShadow: 'var(--glow-cyan)' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 900, color: 'var(--accent-cyan)', letterSpacing: '0.2em', textShadow: 'var(--glow-cyan)' }}>
              NEXUS<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>::OS</span>
            </span>
          </div>
          {stalledCount > 0 && (
            <div style={{ fontSize: 9, fontFamily: 'var(--font-display)', color: 'var(--accent-alert)', border: '1px solid rgba(255,60,60,0.3)', background: 'rgba(255,60,60,0.07)', padding: '4px 10px', letterSpacing: '0.1em', animation: 'glow-pulse 2s ease-in-out infinite' }}>
              ⚠ {stalledCount} PROJECT{stalledCount > 1 ? 'S' : ''} IDLE
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { label: 'PROJECTS', value: projects.length },
              { label: 'ACTIVE', value: projects.filter((p) => p.status === 'active').length },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', fontWeight: 700 }}>{s.value}</div>
                <div style={{ fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <Clock />
        </div>
      </header>
      <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr', overflow: 'hidden', height: 'calc(100vh - 65px)' }}>
        <aside style={{ borderRight: '1px solid var(--border-dim)', padding: '20px 16px', overflowY: 'auto', background: 'var(--bg-panel)' }}>
          <div style={{ fontSize: 9, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.2em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 12, height: 1, background: 'var(--accent-cyan)', display: 'inline-block' }} />
            PROJECT COMPASS
          </div>
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
                <div style={{ fontSize: 9, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.2em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 12, height: 1, background: p.color, display: 'inline-block' }} />
                  MILESTONES
                </div>
                {p.milestones.map((m) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, opacity: m.completed ? 0.4 : 1 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 2, background: m.completed ? p.color : 'transparent', border: `1px solid ${p.color}`, boxShadow: m.completed ? `0 0 6px ${p.color}` : 'none' }} />
                    <div>
                      <div style={{ fontSize: 10, color: m.completed ? 'var(--text-muted)' : 'var(--text-bright)', lineHeight: 1.4 }}>{m.completed && <span style={{ marginRight: 4 }}>✓</span>}{m.label}</div>
                      <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(m.targetDate).toLocaleDateString('ja-JP')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </aside>
        <section style={{ padding: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 9, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.2em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
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
  const [ready, setReady] = useState(false)

  useEffect(() => {
    loadStoredState()
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    const unsubP = useProjectStore.subscribe(saveStoredState)
    const unsubT = useTaskStore.subscribe(saveStoredState)
    return () => {
      unsubP()
      unsubT()
    }
  }, [ready])

  if (!ready) return <LoadingScreen />
  return <DashboardContent />
}
