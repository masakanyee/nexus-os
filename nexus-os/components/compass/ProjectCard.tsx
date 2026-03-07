'use client'
import { Project } from '@/types'
import { useTaskStore } from '@/store'

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
  const tasks = allTasks.filter((t) => t.projectId === project.id)
  const doneTasks = tasks.filter((t) => t.status === 'done').length
  const stalled = stalledDays(project.lastTouched)
  const progress = milestoneProgress(project.milestones)
  const remaining = daysUntil(project.deadline)
  const color = project.color

  const nextMilestone = project.milestones
    .filter((m) => !m.completed)
    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())[0]

  return (
    <div
      onClick={onClick}
      className="bracket-box animate-fade-in-up"
      style={{
        padding: '14px 16px',
        marginBottom: '10px',
        cursor: 'pointer',
        background: isSelected ? 'rgba(0,255,255,0.04)' : 'var(--bg-card)',
        borderColor: isSelected ? color : 'var(--border-dim)',
        boxShadow: isSelected ? `0 0 14px ${color}33` : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: color, boxShadow: `0 0 8px ${color}`,
            display: 'inline-block', flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
            color: isSelected ? color : 'var(--text-bright)', letterSpacing: '0.08em',
          }}>
            {project.name}
          </span>
        </div>
        {stalled >= 5 && (
          <span style={{
            fontSize: 9, fontFamily: 'var(--font-display)',
            color: 'var(--accent-alert)',
            background: 'rgba(255,60,60,0.1)',
            border: '1px solid rgba(255,60,60,0.3)',
            padding: '2px 6px', letterSpacing: '0.1em',
          }}>
            {stalled}D IDLE
          </span>
        )}
      </div>

      <p style={{ fontSize: 10, color: 'var(--text-mid)', marginBottom: 10, lineHeight: 1.5, paddingLeft: 16 }}>
        {project.goal}
      </p>

      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>MILESTONE</span>
          <span style={{ fontSize: 9, color: color }}>{progress}%</span>
        </div>
        <div style={{ height: 2, background: 'var(--border-dim)', borderRadius: 1 }}>
          <div style={{
            height: '100%', width: `${progress}%`, background: color,
            boxShadow: `0 0 6px ${color}`, borderRadius: 1, transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>TASK {doneTasks}/{tasks.length}</span>
        <span style={{ fontSize: 9, color: remaining < 60 ? 'var(--accent-alert)' : 'var(--text-muted)' }}>
          {remaining > 0 ? `残${remaining}D` : 'OVERDUE'}
        </span>
      </div>

      {nextMilestone && (
        <div style={{
          marginTop: 10, paddingTop: 8,
          borderTop: '1px solid var(--border-dim)',
          fontSize: 9, color: 'var(--text-muted)',
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
