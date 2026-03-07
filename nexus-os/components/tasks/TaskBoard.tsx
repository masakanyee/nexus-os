'use client'
import { useState } from 'react'
import { useTaskStore, useProjectStore } from '@/store'
import { TaskStatus } from '@/types'
import TaskCard from './TaskCard'
import QuickAdd from './QuickAdd'

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'backlog',     label: 'BACKLOG' },
  { key: 'todo',        label: 'TO DO' },
  { key: 'in_progress', label: 'IN PROGRESS' },
  { key: 'done',        label: 'DONE' },
]

export default function TaskBoard({ selectedProjectId }: { selectedProjectId: string | null }) {
  const [view, setView] = useState<string>('all')
  const tasks = useTaskStore((s) => s.tasks)
  const projects = useProjectStore((s) => s.projects)

  const filteredTasks = tasks.filter((t) => {
    if (view === 'all') return true
    if (view === 'by_project') return t.projectId === selectedProjectId
    return t.projectId === view
  })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* View switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{
          fontSize: 11, color: 'var(--text-muted)',
          fontFamily: 'var(--font-display)', marginRight: 6, letterSpacing: '0.1em',
        }}>
          VIEW /
        </span>

        <button
          onClick={() => setView('all')}
          style={{
            fontSize: 11, fontFamily: 'var(--font-display)',
            padding: '5px 14px', cursor: 'pointer', letterSpacing: '0.1em',
            background: view === 'all' ? 'rgba(0,255,255,0.08)' : 'transparent',
            border: `1px solid ${view === 'all' ? 'var(--accent-cyan)' : 'var(--border-dim)'}`,
            color: view === 'all' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            boxShadow: view === 'all' ? 'var(--glow-cyan)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          ALL
        </button>

        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => setView(p.id)}
            style={{
              fontSize: 11, fontFamily: 'var(--font-display)',
              padding: '5px 12px', cursor: 'pointer', letterSpacing: '0.08em',
              background: view === p.id ? `${p.color}15` : 'transparent',
              border: `1px solid ${view === p.id ? p.color : 'var(--border-dim)'}`,
              color: view === p.id ? p.color : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'all 0.15s',
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: p.color, display: 'inline-block',
            }} />
            {p.name}
          </button>
        ))}
      </div>

      {/* Kanban columns */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        overflow: 'hidden',
      }}>
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.key)
          return (
            <div key={col.key} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 10, paddingBottom: 8,
                borderBottom: `1px solid ${col.key === 'in_progress' ? 'var(--accent-cyan)' : 'var(--border-dim)'}`,
              }}>
                <span style={{
                  fontSize: 11, fontFamily: 'var(--font-display)', letterSpacing: '0.12em',
                  color: col.key === 'in_progress' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                }}>
                  {col.label}
                </span>
                <span style={{
                  fontSize: 11, color: 'var(--text-muted)',
                  background: 'var(--bg-card)', padding: '1px 7px',
                  border: '1px solid var(--border-dim)',
                }}>
                  {colTasks.length}
                </span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', paddingRight: 2 }}>
                {colTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Add */}
      <div style={{ marginTop: 14 }}>
        <QuickAdd />
      </div>
    </div>
  )
}
