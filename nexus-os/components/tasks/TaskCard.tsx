'use client'
import { Task } from '@/types'
import { useTaskStore, useProjectStore } from '@/store'

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  critical: 'var(--accent-alert)',
  high: '#ff9f0a',
  medium: 'var(--accent-cyan)',
  low: 'var(--text-mid)',
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
        padding: '12px 14px',
        marginBottom: 10,
        background: 'var(--bg-card)',
        borderColor: 'var(--border-dim)',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{
          fontSize: 12, color: 'var(--text-bright)', fontFamily: 'var(--font-mono)',
          lineHeight: 1.5, flex: 1,
        }}>
          {task.title}
        </span>
        <span style={{
          fontSize: 9, fontFamily: 'var(--font-display)', letterSpacing: '0.08em',
          color, border: `1px solid ${color}55`, padding: '2px 7px',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {task.priority.toUpperCase()}
        </span>
      </div>
      {project && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: project.color, display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{ fontSize: 10, color: 'var(--text-mid)' }}>{project.name}</span>
        </div>
      )}
      <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {(['backlog', 'todo', 'in_progress', 'done'] as const).map((status) => (
          <button
            key={status}
            onClick={() => moveTask(task.id, status)}
            style={{
              fontSize: 9, fontFamily: 'var(--font-display)', padding: '3px 8px', cursor: 'pointer',
              background: task.status === status ? 'rgba(0,229,255,0.12)' : 'transparent',
              border: `1px solid ${task.status === status ? 'var(--accent-cyan)' : 'var(--border-dim)'}`,
              color: task.status === status ? 'var(--accent-cyan)' : 'var(--text-mid)',
              letterSpacing: '0.05em',
              transition: 'all 0.15s',
            }}
          >
            {status === 'in_progress' ? 'WIP' : status.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}
