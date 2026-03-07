'use client'
import { useState } from 'react'
import { Project } from '@/types'
import { useTaskStore, useProjectStore } from '@/store'

function stalledDays(lastTouched: string) {
  return Math.floor((Date.now() - new Date(lastTouched).getTime()) / (1000 * 60 * 60 * 24))
}

function milestoneProgress(milestones: Project['milestones']) {
  if (!milestones.length) return 0
  return Math.round((milestones.filter((m) => m.completed).length / milestones.length) * 100)
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

interface Props {
  project: Project
  isSelected: boolean
  onClick: () => void
}

export default function ProjectCard({ project, isSelected, onClick }: Props) {
  const allTasks = useTaskStore((s) => s.tasks)
  const deleteProject = useProjectStore((s) => s.deleteProject)
  const tasks = allTasks.filter((t) => t.projectId === project.id)
  const doneTasks = tasks.filter((t) => t.status === 'done').length
  const stalled = stalledDays(project.lastTouched)
  const progress = milestoneProgress(project.milestones)
  const remaining = daysUntil(project.deadline)
  const color = project.color
  const [confirmDelete, setConfirmDelete] = useState(false)

  const nextMilestone = project.milestones
    .filter((m) => !m.completed)
    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())[0]

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmDelete) {
      deleteProject(project.id)
    } else {
      setConfirmDelete(true)
    }
  }

  return (
    <div
      onClick={onClick}
      className="bracket-box animate-fade-in-up"
      style={{
        padding: '14px 16px',
        marginBottom: '10px',
        cursor: 'pointer',
        background: isSelected ? `${color}08` : 'var(--bg-card)',
        borderColor: isSelected ? color : 'var(--border-dim)',
        boxShadow: isSelected ? `0 0 14px ${color}33` : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{
            width: 9, height: 9, borderRadius: '50%',
            background: color, boxShadow: `0 0 8px ${color}`,
            display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
            color: isSelected ? color : 'var(--text-bright)', letterSpacing: '0.08em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {project.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {stalled >= 5 && !confirmDelete && (
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-display)',
              color: 'var(--accent-alert)',
              background: 'rgba(255,68,68,0.1)',
              border: '1px solid rgba(255,68,68,0.3)',
              padding: '2px 6px', letterSpacing: '0.1em',
            }}>
              {stalled}D IDLE
            </span>
          )}
          {confirmDelete ? (
            <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={handleDelete}
                style={{
                  fontSize: 10, fontFamily: 'var(--font-display)', padding: '3px 9px',
                  background: 'rgba(255,68,68,0.15)', border: '1px solid var(--accent-alert)',
                  color: 'var(--accent-alert)', cursor: 'pointer', letterSpacing: '0.05em',
                }}
              >
                DELETE
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
                style={{
                  fontSize: 10, fontFamily: 'var(--font-display)', padding: '3px 9px',
                  background: 'transparent', border: '1px solid var(--border-dim)',
                  color: 'var(--text-mid)', cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={handleDelete}
              style={{
                fontSize: 12, padding: '1px 6px',
                background: 'transparent', border: '1px solid transparent',
                color: 'var(--text-muted)', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.color = 'var(--accent-alert)'
                el.style.borderColor = 'rgba(255,68,68,0.4)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.color = 'var(--text-muted)'
                el.style.borderColor = 'transparent'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-mid)', marginBottom: 10, lineHeight: 1.5, paddingLeft: 17 }}>
        {project.goal}
      </p>

      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>MILESTONE</span>
          <span style={{ fontSize: 10, color: color }}>{progress}%</span>
        </div>
        <div style={{ height: 2, background: 'var(--border-dim)', borderRadius: 1 }}>
          <div style={{
            height: '100%', width: `${progress}%`, background: color,
            boxShadow: `0 0 6px ${color}`, borderRadius: 1, transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>TASK {doneTasks}/{tasks.length}</span>
        <span style={{ fontSize: 11, color: remaining < 60 ? 'var(--accent-alert)' : 'var(--text-muted)' }}>
          {remaining > 0 ? `残${remaining}D` : 'OVERDUE'}
        </span>
      </div>

      {nextMilestone && (
        <div style={{
          marginTop: 10, paddingTop: 8,
          borderTop: '1px solid var(--border-dim)',
          fontSize: 11, color: 'var(--text-muted)',
        }}>
          <span style={{ color: color, marginRight: 6 }}>▶</span>
          {nextMilestone.label}
          <span style={{ float: 'right' }}>
            {new Date(nextMilestone.targetDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      )}
    </div>
  )
}
