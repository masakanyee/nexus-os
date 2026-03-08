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

// ─── テンプレート CSV ──────────────────────────────────────────────────────────
const PROJECTS_TEMPLATE = `name,goal,deadline,color,status
プロダクトローンチ,新サービスのβリリース,2025-12-31,#00e5ff,active
採用強化,エンジニア2名採用,2025-09-30,#ff9500,active
売上目標達成,年間売上¥50M,2025-12-31,#ff3c3c,active`

const TASKS_TEMPLATE = `title,projectName,priority,status,memo
LPのコピーライティング修正,プロダクトローンチ,high,todo,
APIエンドポイント設計書作成,プロダクトローンチ,critical,in_progress,
求人媒体の選定,採用強化,medium,backlog,
既存顧客へのアップセル提案,売上目標達成,high,todo,
競合サービス調査レポート,,low,backlog,プロジェクト未割当の場合は空欄`

function downloadCSV(filename: string, content: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ImportClient() {
  const [projectsCSV, setProjectsCSV] = useState('')
  const [tasksCSV, setTasksCSV] = useState('')
  const [result, setResult] = useState<{ projects?: ImportResult; tasks?: ImportResult } | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'add' | 'replace'>('add')

  const handleImport = async () => {
    setLoading(true)
    setResult(null)

    const existingProjects = useProjectStore.getState().projects
    const existingTasks = useTaskStore.getState().tasks

    let newProjects = mode === 'replace' ? [] : [...existingProjects]
    let newTasks = mode === 'replace' ? [] : [...existingTasks]

    const pResult: ImportResult = { added: 0, skipped: 0, errors: [] }
    const tResult: ImportResult = { added: 0, skipped: 0, errors: [] }

    // ── プロジェクト インポート ──
    if (projectsCSV.trim()) {
      const rows = parseCSV(projectsCSV)
      for (const row of rows) {
        const name = row['name']?.trim()
        if (!name) { pResult.skipped++; continue }

        const deadline = row['deadline']?.trim()
        if (!deadline) { pResult.errors.push(`"${name}": deadlineが必要`); continue }

        const status = row['status']?.trim() as Project['status']
        if (status && !PROJECT_STATUS.includes(status)) {
          pResult.errors.push(`"${name}": status は active/stalled/completed のいずれか`)
          continue
        }

        const project: Project = {
          id: uid(),
          name,
          goal: row['goal']?.trim() ?? '',
          deadline,
          color: row['color']?.trim() || '#00e5ff',
          status: status || 'active',
          lastTouched: new Date().toISOString(),
          milestones: [],
        }
        newProjects.push(project)
        pResult.added++
      }
    }

    // ── タスク インポート ──
    if (tasksCSV.trim()) {
      const rows = parseCSV(tasksCSV)
      for (const row of rows) {
        const title = row['title']?.trim()
        if (!title) { tResult.skipped++; continue }

        const priority = row['priority']?.trim() as Task['priority']
        if (priority && !PRIORITY_VALUES.includes(priority)) {
          tResult.errors.push(`"${title}": priority は critical/high/medium/low のいずれか`)
          continue
        }

        const status = row['status']?.trim() as Task['status']
        if (status && !STATUS_VALUES.includes(status)) {
          tResult.errors.push(`"${title}": status は backlog/todo/in_progress/done のいずれか`)
          continue
        }

        // projectName でプロジェクトを検索
        const projectName = row['projectName']?.trim()
        const matchedProject = projectName
          ? newProjects.find((p) => p.name === projectName)
          : null

        const task: Task = {
          id: uid(),
          title,
          projectId: matchedProject?.id ?? null,
          priority: priority || 'medium',
          status: status || 'todo',
          createdAt: new Date().toISOString(),
          memo: row['memo']?.trim() || undefined,
        }
        newTasks.push(task)
        tResult.added++
      }
    }

    // Zustand & Supabase に保存
    if (projectsCSV.trim()) useProjectStore.setState({ projects: newProjects })
    if (tasksCSV.trim()) useTaskStore.setState({ tasks: newTasks })
    await saveToSupabase()

    setResult({
      projects: projectsCSV.trim() ? pResult : undefined,
      tasks: tasksCSV.trim() ? tResult : undefined,
    })
    setLoading(false)
  }

  const s = {
    panel: {
      background: 'rgba(0,229,255,0.03)',
      border: '1px solid var(--border-dim)',
      padding: '20px',
      marginBottom: 16,
    } as React.CSSProperties,
    label: {
      fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-muted)',
      letterSpacing: '0.15em', display: 'block', marginBottom: 8,
    } as React.CSSProperties,
    textarea: {
      width: '100%', minHeight: 160, background: 'var(--bg-void)',
      border: '1px solid var(--border-dim)', color: 'var(--text-bright)',
      fontFamily: 'var(--font-mono)', fontSize: 12, padding: '10px',
      outline: 'none', resize: 'vertical' as const, lineHeight: 1.6,
      boxSizing: 'border-box' as const,
    } as React.CSSProperties,
    btn: (active?: boolean) => ({
      fontSize: 11, fontFamily: 'var(--font-display)', padding: '6px 16px',
      cursor: 'pointer', letterSpacing: '0.1em',
      background: active ? 'rgba(0,229,255,0.12)' : 'transparent',
      border: `1px solid ${active ? 'var(--accent-cyan)' : 'var(--border-dim)'}`,
      color: active ? 'var(--accent-cyan)' : 'var(--text-mid)',
      transition: 'all 0.15s',
    }) as React.CSSProperties,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', padding: '32px 40px', color: 'var(--text-bright)' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.2em', marginBottom: 4 }}>
            NEXUS::OS
          </div>
          <div style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.1em', textShadow: 'var(--glow-cyan)' }}>
            CSV IMPORT
          </div>
        </div>
        <Link href="/" style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', textDecoration: 'none', border: '1px solid var(--border-dim)', padding: '6px 16px', letterSpacing: '0.1em' }}>
          ← BACK
        </Link>
      </div>

      {/* テンプレートDL */}
      <div style={s.panel}>
        <div style={s.label}>STEP 1 — テンプレートをダウンロード</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.btn()} onClick={() => downloadCSV('projects_template.csv', PROJECTS_TEMPLATE)}>
            ↓ projects_template.csv
          </button>
          <button style={s.btn()} onClick={() => downloadCSV('tasks_template.csv', TASKS_TEMPLATE)}>
            ↓ tasks_template.csv
          </button>
        </div>
        <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          <strong style={{ color: 'var(--text-mid)' }}>projects.csv の列：</strong>
          &nbsp;name, goal, deadline(YYYY-MM-DD), color(#hex), status(active/stalled/completed)<br />
          <strong style={{ color: 'var(--text-mid)' }}>tasks.csv の列：</strong>
          &nbsp;title, projectName(プロジェクト名と完全一致), priority(critical/high/medium/low), status(backlog/todo/in_progress/done), memo
        </div>
      </div>

      {/* CSV 貼り付け */}
      <div style={s.panel}>
        <div style={s.label}>STEP 2 — CSVの内容を貼り付け（両方 or 片方だけでもOK）</div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ ...s.label, color: 'var(--accent-cyan)' }}>PROJECTS.CSV</div>
          <textarea
            style={s.textarea}
            value={projectsCSV}
            onChange={(e) => setProjectsCSV(e.target.value)}
            placeholder={PROJECTS_TEMPLATE}
            spellCheck={false}
          />
        </div>

        <div>
          <div style={{ ...s.label, color: '#ff9f0a' }}>TASKS.CSV</div>
          <textarea
            style={s.textarea}
            value={tasksCSV}
            onChange={(e) => setTasksCSV(e.target.value)}
            placeholder={TASKS_TEMPLATE}
            spellCheck={false}
          />
        </div>
      </div>

      {/* オプション & 実行 */}
      <div style={s.panel}>
        <div style={s.label}>STEP 3 — インポートモードを選択して実行</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button style={s.btn(mode === 'add')} onClick={() => setMode('add')}>
            追加モード（既存データを保持）
          </button>
          <button style={s.btn(mode === 'replace')} onClick={() => setMode('replace')}>
            置換モード（既存データを全削除）
          </button>
        </div>
        {mode === 'replace' && (
          <div style={{ fontSize: 11, color: 'var(--accent-alert)', marginBottom: 12, padding: '8px 12px', border: '1px solid rgba(255,68,68,0.3)', background: 'rgba(255,68,68,0.06)' }}>
            ⚠ 置換モード：既存のプロジェクト・タスクがすべて削除されます
          </div>
        )}
        <button
          onClick={handleImport}
          disabled={loading || (!projectsCSV.trim() && !tasksCSV.trim())}
          style={{
            fontSize: 13, fontFamily: 'var(--font-display)', padding: '10px 32px',
            cursor: loading || (!projectsCSV.trim() && !tasksCSV.trim()) ? 'not-allowed' : 'pointer',
            background: 'rgba(0,229,255,0.12)', border: '1px solid var(--accent-cyan)',
            color: 'var(--accent-cyan)', letterSpacing: '0.15em',
            opacity: loading || (!projectsCSV.trim() && !tasksCSV.trim()) ? 0.5 : 1,
          }}
        >
          {loading ? 'IMPORTING...' : 'IMPORT TO SUPABASE'}
        </button>
      </div>

      {/* 結果 */}
      {result && (
        <div style={{ ...s.panel, borderColor: 'var(--accent-cyan)' }}>
          <div style={s.label}>RESULT</div>
          {result.projects && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#00ff88', marginBottom: 4 }}>
                ✓ Projects: {result.projects.added}件追加, {result.projects.skipped}件スキップ
              </div>
              {result.projects.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--accent-alert)' }}>✗ {e}</div>
              ))}
            </div>
          )}
          {result.tasks && (
            <div>
              <div style={{ fontSize: 12, color: '#00ff88', marginBottom: 4 }}>
                ✓ Tasks: {result.tasks.added}件追加, {result.tasks.skipped}件スキップ
              </div>
              {result.tasks.errors.map((e, i) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--accent-alert)' }}>✗ {e}</div>
              ))}
            </div>
          )}
          {((result.projects?.added ?? 0) + (result.tasks?.added ?? 0)) > 0 && (
            <div style={{ marginTop: 16 }}>
              <Link href="/" style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', textDecoration: 'none', border: '1px solid var(--accent-cyan)', padding: '6px 16px', letterSpacing: '0.1em' }}>
                → KANBANで確認
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
