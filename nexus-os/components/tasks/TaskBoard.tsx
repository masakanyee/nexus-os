'use client'
import { useState } from 'react'
import { useTaskStore, useProjectStore } from '@/store'
import { TaskStatus, Task } from '@/types'
import TaskCard from './TaskCard'
import QuickAdd from './QuickAdd'
import ChecklistView from './ChecklistView'

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'backlog',     label: 'BACKLOG' },
  { key: 'todo',        label: 'TO DO' },
  { key: 'in_progress', label: 'IN PROGRESS' },
  { key: 'done',        label: 'DONE' },
]

const PRIORITY_ORDER: Record<Task['priority'], number> = {
  critical: 0, high: 1, medium: 2, low: 3,
}

function sortTasks(tasks: Task[], sort: 'priority' | 'date'): Task[] {
  return [...tasks].sort((a, b) => {
    if (sort === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export default function TaskBoard({ selectedProjectId }: { selectedProjectId: string | null }) {
  const [view, setView] = useState<string>('all')
  const [sort, setSort] = useState<'priority' | 'date'>('priority')
  const [doneCollapsed, setDoneCollapsed] = useState(false)
  const [displayMode, setDisplayMode] = useState<'kanban' | 'list'>('kanban')
  const tasks = useTaskStore((s) => s.tasks)
  const projects = useProjectStore((s) => s.projects)

  const filteredTasks = tasks.filter((t) => {
    if (view === 'all') return true
    if (view === 'by_project') return t.projectId === selectedProjectId
    return t.projectId === view
  })

  const tabBtn = (active: boolean): React.CSSProperties => ({
    fontSize: 11, fontFamily: 'var(--font-display)',
    padding: '5px 14px', cursor: 'pointer', letterSpacing: '0.1em',
    background: active ? 'rgba(232,160,0,0.08)' : 'transparent',
    border: `1px solid ${active ? 'var(--accent-cyan)' : 'var(--border-dim)'}`,
    color: active ? 'var(--accent-cyan)' : 'var(--text-muted)',
    boxShadow: active ? 'var(--glow-cyan)' : 'none',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* View + Sort bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', marginRight: 4, letterSpacing: '0.1em' }}>
          VIEW /
        </span>
        <button onClick={() => setView('all')} style={tabBtn(view === 'all')}>ALL</button>
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
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
            {p.name}
          </button>
        ))}

        {/* Sort + Display mode */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
            SORT /
          </span>
          <button onClick={() => setSort('priority')} style={tabBtn(sort === 'priority')}>PRIORITY</button>
          <button onClick={() => setSort('date')} style={tabBtn(sort === 'date')}>DATE</button>

          <span style={{ width: 1, height: 18, background: 'var(--border-dim)', margin: '0 4px' }} />

          <button onClick={() => setDisplayMode('kanban')} style={tabBtn(displayMode === 'kanban')}>KANBAN</button>
          <button onClick={() => setDisplayMode('list')} style={tabBtn(displayMode === 'list')}>LIST</button>
        </div>
      </div>

      {/* List view */}
      {displayMode === 'list' && (
        <ChecklistView filteredTasks={filteredTasks} />
      )}

      {/* Kanban columns */}
      {displayMode === 'kanban' && (
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: doneCollapsed ? '1fr 1fr 1fr 32px' : 'repeat(4, 1fr)', gap: 12, overflow: 'hidden', transition: 'grid-template-columns 0.2s ease' }}>
        {COLUMNS.map((col) => {
          const colTasks = sortTasks(filteredTasks.filter((t) => t.status === col.key), sort)

          // DONE collapsed: narrow vertical strip
          if (col.key === 'done' && doneCollapsed) {
            return (
              <div
                key={col.key}
                onClick={() => setDoneCollapsed(false)}
                title="クリックで展開"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', paddingTop: 4, borderTop: `2px solid var(--border-dim)`, opacity: 0.6, transition: 'opacity 0.15s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.6' }}
              >
                <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '1px 5px', border: '1px solid var(--border-dim)', borderRadius: 4 }}>
                  {colTasks.length}
                </span>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.12em', color: 'var(--text-muted)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                  DONE
                </span>
              </div>
            )
          }

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '1px 7px', border: '1px solid var(--border-dim)' }}>
                    {colTasks.length}
                  </span>
                  {col.key === 'done' && (
                    <button
                      onClick={() => setDoneCollapsed(true)}
                      title="折りたたむ"
                      style={{ fontSize: 11, padding: '1px 5px', background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1.2 }}
                    >
                      ›
                    </button>
                  )}
                </div>
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
      )}

      {/* Quick Add (kanban only) */}
      {displayMode === 'kanban' && (
        <div style={{ marginTop: 14 }}>
          <QuickAdd />
        </div>
      )}
    </div>
  )
}
