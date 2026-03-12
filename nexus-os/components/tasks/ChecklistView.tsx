'use client'
import { useState, useRef, useEffect } from 'react'
import { useTaskStore, useProjectStore } from '@/store'
import { Task, Priority } from '@/types'

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  critical: 'var(--accent-alert)',
  high: '#ff9f0a',
  medium: 'var(--accent-cyan)',
  low: 'var(--text-mid)',
}

const GROUPS: { key: Task['status']; label: string }[] = [
  { key: 'in_progress', label: 'IN PROGRESS' },
  { key: 'todo',        label: 'TO DO' },
  { key: 'backlog',     label: 'BACKLOG' },
]

const PRIORITY_ORDER: Record<Task['priority'], number> = {
  critical: 0, high: 1, medium: 2, low: 3,
}

function CheckItem({ task }: { task: Task }) {
  const moveTask = useTaskStore((s) => s.moveTask)
  const projects = useProjectStore((s) => s.projects)
  const project = task.projectId ? projects.find((p) => p.id === task.projectId) : null
  const [checking, setChecking] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleCheck = () => {
    if (checking) return
    setChecking(true)
    setTimeout(() => moveTask(task.id, 'done'), 400)
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '9px 12px',
        borderRadius: 0,
        background: hovered ? 'rgba(0,229,255,0.04)' : 'transparent',
        borderLeft: `2px solid ${hovered ? 'var(--accent-cyan)' : 'transparent'}`,
        transition: 'all 0.15s',
        opacity: checking ? 0 : 1,
        transform: checking ? 'translateX(8px)' : 'none',
        cursor: 'default',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={handleCheck}
        title="完了にする"
        style={{
          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
          background: 'transparent',
          border: `2px solid ${task.status === 'in_progress' ? 'var(--accent-cyan)' : 'var(--border-dim)'}`,
          cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
          boxShadow: task.status === 'in_progress' ? 'var(--glow-cyan)' : 'none',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--accent-cyan)'
          el.style.background = 'rgba(0,229,255,0.15)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = task.status === 'in_progress' ? 'var(--accent-cyan)' : 'var(--border-dim)'
          el.style.background = 'transparent'
        }}
      />

      {/* Title */}
      <span style={{
        flex: 1, fontSize: 13, color: 'var(--text-bright)',
        fontFamily: 'var(--font-mono)', lineHeight: 1.4,
        textDecoration: checking ? 'line-through' : 'none',
        color: checking ? 'var(--text-muted)' : 'var(--text-bright)',
        transition: 'all 0.3s',
      }}>
        {task.title}
      </span>

      {/* Priority */}
      <span style={{
        fontSize: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.08em',
        color: PRIORITY_COLOR[task.priority],
        border: `1px solid ${PRIORITY_COLOR[task.priority]}55`,
        padding: '1px 6px', flexShrink: 0,
        opacity: hovered ? 1 : 0.6,
        transition: 'opacity 0.15s',
      }}>
        {task.priority.toUpperCase()}
      </span>

      {/* Project dot */}
      {project && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, opacity: hovered ? 1 : 0.5, transition: 'opacity 0.15s' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: project.color, display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: 'var(--text-mid)', fontFamily: 'var(--font-mono)' }}>{project.name}</span>
        </div>
      )}
    </div>
  )
}

function MemoAdd() {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const addTask = useTaskStore((s) => s.addTask)

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    addTask({ title: trimmed, projectId: null, priority: 'medium', status: 'todo' })
    setValue('')
    inputRef.current?.focus()
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px',
      borderTop: '1px solid var(--border-dim)',
      marginTop: 8,
    }}>
      <span style={{ fontSize: 16, color: 'var(--text-muted)', lineHeight: 1, userSelect: 'none' }}>+</span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
        }}
        placeholder="メモを追加...  Enter で即追加"
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          color: 'var(--text-bright)', fontFamily: 'var(--font-mono)',
          fontSize: 13, padding: 0,
        }}
      />
      {value && (
        <button
          onClick={submit}
          style={{
            fontSize: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
            padding: '4px 12px', cursor: 'pointer',
            background: 'rgba(0,229,255,0.08)',
            border: '1px solid var(--accent-cyan)',
            color: 'var(--accent-cyan)',
          }}
        >
          ADD
        </button>
      )}
    </div>
  )
}

interface Props {
  filteredTasks: Task[]
}

export default function ChecklistView({ filteredTasks }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const nonDone = filteredTasks.filter((t) => t.status !== 'done')
  const totalCount = nonDone.length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {totalCount === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: '0.15em', opacity: 0.6 }}>
            ALL CLEAR
          </div>
        )}

        {GROUPS.map(({ key, label }) => {
          const tasks = [...nonDone.filter((t) => t.status === key)]
            .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
          if (tasks.length === 0) return null

          const isCollapsed = collapsed[key]

          return (
            <div key={key} style={{ marginBottom: 4 }}>
              {/* Group header */}
              <button
                onClick={() => setCollapsed((s) => ({ ...s, [key]: !s[key] }))}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 12px', background: 'transparent', border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{
                  fontSize: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.18em',
                  color: key === 'in_progress' ? 'var(--accent-cyan)' : 'var(--text-muted)',
                }}>
                  {label}
                </span>
                <span style={{
                  fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-card)',
                  padding: '0 6px', border: '1px solid var(--border-dim)',
                }}>
                  {tasks.length}
                </span>
                <span style={{ flex: 1, height: 1, background: key === 'in_progress' ? 'rgba(0,229,255,0.2)' : 'var(--border-dim)' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.5 }}>
                  {isCollapsed ? '▸' : '▾'}
                </span>
              </button>

              {/* Tasks */}
              {!isCollapsed && tasks.map((task) => (
                <CheckItem key={task.id} task={task} />
              ))}
            </div>
          )
        })}
      </div>

      {/* Memo quick-add */}
      <MemoAdd />
    </div>
  )
}
