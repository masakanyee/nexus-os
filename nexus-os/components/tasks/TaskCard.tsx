'use client'
import { useState } from 'react'
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
  const deleteTask = useTaskStore((s) => s.deleteTask)
  const projects = useProjectStore((s) => s.projects)
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null
  const color = PRIORITY_COLOR[task.priority]
  const [confirmDelete, setConfirmDelete] = useState(false)

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
          fontSize: 13, color: 'var(--text-bright)', fontFamily: 'var(--font-mono)',
          lineHeight: 1.5, flex: 1,
        }}>
          {task.title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <span style={{
            fontSize: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.08em',
            color, border: `1px solid ${color}55`, padding: '2px 7px',
          }}>
            {task.priority.toUpperCase()}
          </span>
          {confirmDelete ? (
            <>
              <button onClick={() => deleteTask(task.id)} style={{ fontSize: 10, padding: '2px 7px', background: 'rgba(255,68,68,0.15)', border: '1px solid var(--accent-alert)', color: 'var(--accent-alert)', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>DEL</button>
              <button onClick={() => setConfirmDelete(false)} style={{ fontSize: 10, padding: '2px 6px', background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ fontSize: 13, padding: '0 3px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-alert)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
            >×</button>
          )}
        </div>
      </div>
      {project && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: project.color, display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{ fontSize: 11, color: 'var(--text-mid)' }}>{project.name}</span>
        </div>
      )}
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
          {new Date(task.createdAt).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}
        </span>
      </div>
      <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {(['backlog', 'todo', 'in_progress', 'done'] as const).map((status) => (
          <button
            key={status}
            onClick={() => moveTask(task.id, status)}
            style={{
              fontSize: 10, fontFamily: 'var(--font-display)', padding: '4px 9px', cursor: 'pointer',
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
