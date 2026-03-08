'use client'
import { useState } from 'react'
import Link from 'next/link'
import { saveToSupabase } from '@/store'
import { useProjectStore, useTaskStore } from '@/store'
import { Project, Task } from '@/types'

const uid = () => Math.random().toString(36).slice(2, 10)

// ─── CSV パーサー ──────────────────────────────────────────────────────────────
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map((line) => {
    const values = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) ?? line.split(',')
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? '').trim().replace(/^"|"$/g, '')
    })
    return row
  })
}

const PRIORITY_VALUES = ['critical', 'high', 'medium', 'low'] as const
const STATUS_VALUES = ['backlog', 'todo', 'in_progress', 'done'] as const
const PROJECT_STATUS = ['active', 'stalled', 'completed'] as const

type ImportResult = { added: number; skipped: number; errors: string[] }

const PROJECTS_TEMPLATE = `name,goal,deadline,color,status
プロダクトローンチ,新サービスのβリリース,2025-12-31,#00e5ff,active
採用強化,エンジニア2名採用,2025-09-30,#ff9500,active`

const TASKS_TEMPLATE = `カテゴリー,タスク内容
ネガティブ処理,家賃交渉
IT/新規事業,在庫管理アプリの構想整理
IMPORT,AZURE 戦略実行`

function downloadCSV(filename: string, content: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── スタイル ──────────────────────────────────────────────────────────────────
const panel = (accent?: string): React.CSSProperties => ({
  background: accent ? `${accent}08` : 'rgba(0,229,255,0.02)',
  border: `1px solid ${accent ?? 'var(--border-dim)'}`,
  padding: '20px 24px',
  marginBottom: 20,
})
const label: React.CSSProperties = {
  fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-muted)',
  letterSpacing: '0.15em', display: 'block', marginBottom: 10,
}
const textarea: React.CSSProperties = {
  width: '100%', minHeight: 150, background: 'var(--bg-void)',
  border: '1px solid var(--border-dim)', color: 'var(--text-bright)',
  fontFamily: 'var(--font-mono)', fontSize: 12, padding: '10px',
  outline: 'none', resize: 'vertical', lineHeight: 1.6,
  boxSizing: 'border-box',
}
const modeBtn = (active: boolean): React.CSSProperties => ({
  fontSize: 11, fontFamily: 'var(--font-display)', padding: '5px 14px',
  cursor: 'pointer', letterSpacing: '0.08em', transition: 'all 0.15s',
  background: active ? 'rgba(0,229,255,0.12)' : 'transparent',
  border: `1px solid ${active ? 'var(--accent-cyan)' : 'var(--border-dim)'}`,
  color: active ? 'var(--accent-cyan)' : 'var(--text-mid)',
})

// ─── Component ────────────────────────────────────────────────────────────────
export default function ImportClient() {
  const [projectsCSV, setProjectsCSV] = useState('')
  const [tasksCSV, setTasksCSV] = useState('')
  const [projectMode, setProjectMode] = useState<'add' | 'replace'>('add')
  const [taskMode, setTaskMode] = useState<'add' | 'replace'>('replace')
  const [projectResult, setProjectResult] = useState<ImportResult | null>(null)
  const [taskResult, setTaskResult] = useState<ImportResult | null>(null)
  const [projectLoading, setProjectLoading] = useState(false)
  const [taskLoading, setTaskLoading] = useState(false)

  // ── プロジェクトのみインポート ──────────────────────────────────────────────
  const handleImportProjects = async () => {
    if (!projectsCSV.trim()) return
    setProjectLoading(true)
    setProjectResult(null)

    const existing = useProjectStore.getState().projects
    const newProjects = projectMode === 'replace' ? [] : [...existing]
    const result: ImportResult = { added: 0, skipped: 0, errors: [] }

    for (const row of parseCSV(projectsCSV)) {
      const name = (row['name'] ?? row['プロジェクト名'] ?? '').trim()
      if (!name) { result.skipped++; continue }
      const deadline = (row['deadline'] ?? row['期限'] ?? '').trim()
      if (!deadline) { result.errors.push(`"${name}": deadline が必要`); continue }
      const status = row['status']?.trim() as Project['status']
      if (status && !PROJECT_STATUS.includes(status)) {
        result.errors.push(`"${name}": status は active/stalled/completed のいずれか`); continue
      }
      newProjects.push({
        id: uid(), name,
        goal: (row['goal'] ?? row['目標'] ?? '').trim(),
        deadline,
        color: row['color']?.trim() || '#00e5ff',
        status: status || 'active',
        lastTouched: new Date().toISOString(),
        milestones: [],
      })
      result.added++
    }

    useProjectStore.setState({ projects: newProjects })
    await saveToSupabase()
    setProjectResult(result)
    setProjectLoading(false)
  }

  // ── タスクのみインポート ────────────────────────────────────────────────────
  const handleImportTasks = async () => {
    if (!tasksCSV.trim()) return
    setTaskLoading(true)
    setTaskResult(null)

    const allProjects = useProjectStore.getState().projects
    const existing = useTaskStore.getState().tasks
    const newTasks = taskMode === 'replace' ? [] : [...existing]
    const result: ImportResult = { added: 0, skipped: 0, errors: [] }

    for (const row of parseCSV(tasksCSV)) {
      // 日本語・英語どちらの列名でも対応
      const title = (row['title'] ?? row['タスク内容'] ?? row['タスク名'] ?? row['task'] ?? '').trim()
      if (!title) { result.skipped++; continue }

      const priority = (row['priority'] ?? row['優先度'] ?? '').trim() as Task['priority']
      if (priority && !PRIORITY_VALUES.includes(priority)) {
        result.errors.push(`"${title}": priority は critical/high/medium/low のいずれか`); continue
      }

      const status = (row['status'] ?? row['ステータス'] ?? '').trim() as Task['status']
      if (status && !STATUS_VALUES.includes(status)) {
        result.errors.push(`"${title}": status は backlog/todo/in_progress/done のいずれか`); continue
      }

      const projectName = (row['projectName'] ?? row['カテゴリー'] ?? row['プロジェクト'] ?? row['project'] ?? '').trim()
      const matched = projectName ? allProjects.find((p) => p.name === projectName) : null

      newTasks.push({
        id: uid(), title,
        projectId: matched?.id ?? null,
        priority: priority || 'medium',
        status: status || 'todo',
        createdAt: new Date().toISOString(),
        memo: (row['memo'] ?? row['メモ'] ?? '').trim() || undefined,
      })
      result.added++
    }

    useTaskStore.setState({ tasks: newTasks })
    await saveToSupabase()
    setTaskResult(result)
    setTaskLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', padding: '32px 40px', color: 'var(--text-bright)', maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.2em', marginBottom: 4 }}>NEXUS::OS</div>
          <div style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.1em', textShadow: 'var(--glow-cyan)' }}>
            CSV IMPORT
          </div>
        </div>
        <Link href="/" style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', textDecoration: 'none', border: '1px solid var(--border-dim)', padding: '6px 16px', letterSpacing: '0.1em' }}>
          ← BACK
        </Link>
      </div>

      {/* テンプレートDL */}
      <div style={panel()}>
        <div style={label}>テンプレートをダウンロード</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button style={modeBtn(false)} onClick={() => downloadCSV('projects_template.csv', PROJECTS_TEMPLATE)}>↓ projects_template.csv</button>
          <button style={modeBtn(false)} onClick={() => downloadCSV('tasks_template.csv', TASKS_TEMPLATE)}>↓ tasks_template.csv</button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.9 }}>
          <strong style={{ color: 'var(--text-mid)' }}>projects.csv：</strong>name, goal, deadline(YYYY-MM-DD), color(#hex), status(active/stalled/completed)<br />
          <strong style={{ color: 'var(--text-mid)' }}>tasks.csv：</strong>カテゴリー(or projectName), タスク内容(or title), priority(critical/high/medium/low), status(backlog/todo/in_progress/done), メモ
        </div>
      </div>

      {/* ═══ PROJECTS ══════════════════════════════════════════════════════════ */}
      <div style={panel('var(--accent-cyan)')}>
        <div style={{ ...label, color: 'var(--accent-cyan)', fontSize: 13, letterSpacing: '0.2em' }}>PROJECTS</div>

        <textarea
          style={{ ...textarea, marginBottom: 14 }}
          value={projectsCSV}
          onChange={(e) => setProjectsCSV(e.target.value)}
          placeholder={PROJECTS_TEMPLATE}
          spellCheck={false}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button style={modeBtn(projectMode === 'add')} onClick={() => setProjectMode('add')}>+ 追加</button>
          <button style={modeBtn(projectMode === 'replace')} onClick={() => setProjectMode('replace')}>↺ 上書き</button>
          {projectMode === 'replace' && (
            <span style={{ fontSize: 10, color: 'var(--accent-alert)', fontFamily: 'var(--font-display)' }}>⚠ 既存プロジェクトを全削除</span>
          )}
          <button
            onClick={handleImportProjects}
            disabled={projectLoading || !projectsCSV.trim()}
            style={{
              marginLeft: 'auto', fontSize: 12, fontFamily: 'var(--font-display)', padding: '8px 24px',
              cursor: projectLoading || !projectsCSV.trim() ? 'not-allowed' : 'pointer',
              background: 'rgba(0,229,255,0.12)', border: '1px solid var(--accent-cyan)',
              color: 'var(--accent-cyan)', letterSpacing: '0.12em',
              opacity: projectLoading || !projectsCSV.trim() ? 0.4 : 1,
            }}
          >
            {projectLoading ? 'IMPORTING...' : 'IMPORT PROJECTS'}
          </button>
        </div>

        {projectResult && <ImportResultView result={projectResult} label="Projects" href="/" />}
      </div>

      {/* ═══ TASKS ════════════════════════════════════════════════════════════ */}
      <div style={panel('#ff9f0a')}>
        <div style={{ ...label, color: '#ff9f0a', fontSize: 13, letterSpacing: '0.2em' }}>TASKS</div>

        <textarea
          style={{ ...textarea, marginBottom: 14 }}
          value={tasksCSV}
          onChange={(e) => setTasksCSV(e.target.value)}
          placeholder={TASKS_TEMPLATE}
          spellCheck={false}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button style={modeBtn(taskMode === 'add')} onClick={() => setTaskMode('add')}>+ 追加</button>
          <button style={modeBtn(taskMode === 'replace')} onClick={() => setTaskMode('replace')}>↺ 上書き</button>
          {taskMode === 'replace' && (
            <span style={{ fontSize: 10, color: 'var(--accent-alert)', fontFamily: 'var(--font-display)' }}>⚠ 既存タスクを全削除</span>
          )}
          <button
            onClick={handleImportTasks}
            disabled={taskLoading || !tasksCSV.trim()}
            style={{
              marginLeft: 'auto', fontSize: 12, fontFamily: 'var(--font-display)', padding: '8px 24px',
              cursor: taskLoading || !tasksCSV.trim() ? 'not-allowed' : 'pointer',
              background: 'rgba(255,159,10,0.12)', border: '1px solid #ff9f0a',
              color: '#ff9f0a', letterSpacing: '0.12em',
              opacity: taskLoading || !tasksCSV.trim() ? 0.4 : 1,
            }}
          >
            {taskLoading ? 'IMPORTING...' : 'IMPORT TASKS'}
          </button>
        </div>

        {taskResult && <ImportResultView result={taskResult} label="Tasks" href="/" />}
      </div>
    </div>
  )
}

function ImportResultView({ result, label, href }: { result: ImportResult; label: string; href: string }) {
  return (
    <div style={{ marginTop: 16, padding: '12px 16px', border: '1px solid rgba(0,255,136,0.3)', background: 'rgba(0,255,136,0.04)' }}>
      <div style={{ fontSize: 12, color: '#00ff88', marginBottom: result.errors.length ? 8 : 0 }}>
        ✓ {label}: {result.added}件追加, {result.skipped}件スキップ
      </div>
      {result.errors.map((e, i) => (
        <div key={i} style={{ fontSize: 11, color: 'var(--accent-alert)' }}>✗ {e}</div>
      ))}
      {result.added > 0 && (
        <Link href={href} style={{ display: 'inline-block', marginTop: 10, fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', textDecoration: 'none', border: '1px solid var(--accent-cyan)', padding: '4px 14px', letterSpacing: '0.1em' }}>
          → KANBANで確認
        </Link>
      )}
    </div>
  )
}
