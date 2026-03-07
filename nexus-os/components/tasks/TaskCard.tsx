'use client'
import { Task } from '@/types'
import { useTaskStore, useProjectStore } from '@/store'

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  critical: 'var(--accent-alert)',
  high: '#ff9500',
  medium: 'var(--accent-cyan)',
  low: 'var(--text-muted)',
}

export default function TaskCard({ task }: { task: Task }) {
  const moveTask = useTaskStore((s) => s.moveTask)
  const projects = useProjectStore((s) => s.projects)
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null
  const color = PRIORITY_COLOR[task.priority]

  return (
    <div
      className="bracket-box"
      style={{
        padding: '10px 12px',
        marginBottom: 8,
        background: 'var(--bg-card)',
        borderColor: 'var(--border-dim)',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{
          fontSize: 11, color: 'var(--text-bright)', fontFamily: 'var(--font-mono)',
          lineHeight: 1.4, flex: 1,
        }}>
          {task.title}
        </span>
        <span style={{
          fontSize: 8, fontFamily: 'var(--font-display)', letterSpacing: '0.08em',
          color, border: `1px solid ${color}44`, padding: '2px 6px',
        }}>
          {task.priority.toUpperCase()}
        </span>
      </div>
      {project && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%', background: project.color, display: 'inline-block',
          }} />
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{project.name}</span>
        </div>
      )}
      <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {(['backlog', 'todo', 'in_progress', 'done'] as const).map((status) => (
          <button
            key={status}
            onClick={() => moveTask(task.id, status)}
            style={{
              fontSize: 8, fontFamily: 'var(--font-display)', padding: '2px 6px', cursor: 'pointer',
              background: task.status === status ? 'rgba(0,255,255,0.1)' : 'transparent',
              border: `1px solid ${task.status === status ? 'var(--accent-cyan)' : 'var(--border-dim)'}`,
              color: task.status === status ? 'var(--accent-cyan)' : 'var(--text-muted)',
              letterSpacing: '0.05em',
            }}
          >
            {status === 'in_progress' ? 'WIP' : status.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}
