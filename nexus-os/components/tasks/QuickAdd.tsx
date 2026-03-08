'use client'
import { useState, useRef } from 'react'
import { useTaskStore, useProjectStore } from '@/store'
import { Priority } from '@/types'

export default function QuickAdd() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState<string>('null')
  const [priority, setPriority] = useState<Priority>('medium')
  const addTask = useTaskStore((s) => s.addTask)
  const projects = useProjectStore((s) => s.projects)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    if (!title.trim()) return
    addTask({
      title: title.trim(),
      projectId: projectId === 'null' ? null : projectId,
      priority,
      status: 'todo',
    })
    setTitle('')
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        style={{
          width: '100%', padding: '12px 16px',
          background: 'transparent',
          border: '1px dashed var(--border-dim)',
          color: 'var(--text-mid)',
          fontFamily: 'var(--font-mono)', fontSize: 13,
          cursor: 'pointer', textAlign: 'left', letterSpacing: '0.05em',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--accent-cyan)'
          el.style.color = 'var(--accent-cyan)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--border-dim)'
          el.style.color = 'var(--text-mid)'
        }}
      >
        + タスクを追加  <span style={{ opacity: 0.5, fontSize: 11 }}>[Enter]</span>
      </button>
    )
  }

  return (
    <div
      className="bracket-box"
      style={{ padding: '14px', background: 'var(--bg-card)', borderColor: 'var(--accent-cyan)' }}
    >
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="タスク名を入力..."
        style={{
          width: '100%', background: 'transparent', border: 'none',
          borderBottom: '1px solid var(--border-dim)',
          color: 'var(--text-bright)', fontFamily: 'var(--font-mono)',
          fontSize: 14, padding: '4px 0 10px', marginBottom: 12, outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          style={{
            background: 'var(--bg-void)', border: '1px solid var(--border-dim)',
            color: 'var(--text-bright)', fontFamily: 'var(--font-mono)',
            fontSize: 12, padding: '6px 10px', cursor: 'pointer',
          }}
        >
          <option value="null">INBOX</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {(['critical', 'high', 'medium', 'low'] as Priority[]).map((p) => (
          <button
            key={p}
            onClick={() => setPriority(p)}
            style={{
              fontSize: 11, fontFamily: 'var(--font-display)',
              padding: '6px 11px', cursor: 'pointer',
              background: priority === p ? 'rgba(232,160,0,0.1)' : 'transparent',
              border: `1px solid ${priority === p ? 'var(--accent-cyan)' : 'var(--border-dim)'}`,
              color: priority === p ? 'var(--accent-cyan)' : 'var(--text-mid)',
              letterSpacing: '0.05em',
            }}
          >
            {p.toUpperCase()}
          </button>
        ))}

        <button
          onClick={handleSubmit}
          style={{
            marginLeft: 'auto', fontSize: 12,
            fontFamily: 'var(--font-display)',
            padding: '6px 18px', cursor: 'pointer',
            background: 'rgba(232,160,0,0.12)',
            border: '1px solid var(--accent-cyan)',
            color: 'var(--accent-cyan)', letterSpacing: '0.1em',
          }}
        >
          ADD
        </button>
      </div>
    </div>
  )
}
