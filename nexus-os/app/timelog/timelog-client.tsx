'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useProjectStore, useTimelogSettingsStore, useRevenueStore, useTimelogCacheStore, loadTimelogSettings, loadFromSupabase, saveTimelogCache } from '@/store'
import { getTabs, getTimeLog, TimelogData } from '@/lib/gas'
import RevenueInputPanel from '@/components/revenue/RevenueInputPanel'

const NAV = [
  { label: 'KANBAN', href: '/' },
  { label: 'FLOW BOARD', href: '/timeline' },
  { label: 'IMPORT', href: '/import' },
  { label: 'TIME LOG', href: '/timelog' },
  { label: 'SETTINGS', href: '/settings' },
]

interface AnalysisResult {
  overall: {
    score: number
    summary: string
    positives: string[]
    concerns: string[]
    recommendation: string
  }
  projects: Record<string, { rating: 'high' | 'medium' | 'low'; comment: string }>
}

const RATING_COLOR = { high: 'var(--accent-green)', medium: 'var(--accent-warm)', low: 'var(--accent-alert)' }
const RATING_LABEL = { high: '◎ 良好', medium: '△ 普通', low: '▼ 要改善' }

export default function TimelogClient() {
  const projects = useProjectStore((s) => s.projects)
  const { gasUrl, mapping } = useTimelogSettingsStore()

  const [tabs, setTabs] = useState<string[]>([])
  const [selectedTab, setSelectedTab] = useState('')
  const [data, setData] = useState<TimelogData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')

  const revenueRecords = useRevenueStore((s) => s.records)
  const [showRevenueInput, setShowRevenueInput] = useState(false)
  const [roiView, setRoiView] = useState<'period' | 'cumulative'>('period')

  const { cache: timelogCache, setCacheEntry } = useTimelogCacheStore()

  // 未キャッシュタブのロード状態
  const [loadingCumulative, setLoadingCumulative] = useState(false)

  useEffect(() => {
    loadFromSupabase()
    loadTimelogSettings()
  }, [])

  useEffect(() => {
    if (!gasUrl) return
    getTabs(gasUrl)
      .then((t) => { setTabs(t); if (t.length > 0) setSelectedTab(t[t.length - 1]) })
      .catch(() => setError('タブの取得に失敗しました'))
  }, [gasUrl])

  // 未キャッシュのタブをバックグラウンドで取得してキャッシュに追加
  useEffect(() => {
    if (!gasUrl || tabs.length === 0) return
    const uncachedTabs = tabs.filter((tab) => !timelogCache[tab])
    if (uncachedTabs.length === 0) return
    setLoadingCumulative(true)
    Promise.all(
      uncachedTabs.map((tab) =>
        getTimeLog(gasUrl, tab)
          .then((d) => { setCacheEntry(tab, d); return d })
          .catch(() => null)
      )
    )
      .then(() => saveTimelogCache())
      .finally(() => setLoadingCumulative(false))
  }, [gasUrl, tabs])

  useEffect(() => {
    if (!gasUrl || !selectedTab) return
    // キャッシュがあれば即表示（最新タブ以外はキャッシュ優先）
    const isLatestTab = tabs.length > 0 && selectedTab === tabs[tabs.length - 1]
    if (!isLatestTab && timelogCache[selectedTab]) {
      setData(timelogCache[selectedTab])
      setLoading(false)
      setError('')
      setAnalysis(null)
      return
    }
    setLoading(true)
    setError('')
    setData(null)
    setAnalysis(null)
    getTimeLog(gasUrl, selectedTab)
      .then((d) => {
        setData(d)
        setLoading(false)
        // キャッシュに保存（最新タブ以外は確定データなので保存）
        if (!isLatestTab) {
          setCacheEntry(selectedTab, d)
          saveTimelogCache()
        }
      })
      .catch(() => { setError('データの取得に失敗しました'); setLoading(false) })
  }, [gasUrl, selectedTab, tabs])

  const getProject = (gasLabel: string) => {
    const pid = mapping[gasLabel]
    return pid ? projects.find((p) => p.id === pid) : null
  }

  // プロジェクトIDごとの稼働時間（選択期間）
  const hoursMapByProjectId: Record<string, number> = {}
  if (data) {
    Object.entries(data.summary).forEach(([gasLabel, entry]) => {
      const pid = mapping[gasLabel]
      if (pid) {
        hoursMapByProjectId[pid] = (hoursMapByProjectId[pid] ?? 0) + entry.totalHours
      }
    })
  }

  // ROI テーブル行生成（選択期間）
  const roiRows = projects
    .filter((p) => p.status !== 'completed')
    .map((p) => {
      const rec = revenueRecords.find((r) => r.projectId === p.id && r.period === selectedTab)
      const hours = hoursMapByProjectId[p.id] ?? 0
      const revenue = rec?.revenue ?? null
      const profit = rec?.profit ?? null
      const rph = revenue !== null && hours > 0 ? Math.round(revenue / hours) : null
      return { project: p, hours, revenue, profit, rph }
    })
    .filter((r) => r.hours > 0 || r.revenue !== null)
    .sort((a, b) => (b.rph ?? -1) - (a.rph ?? -1))

  // キャッシュから全タブの稼働時間を集計
  const allTabsHoursMap: Record<string, number> = {}
  tabs.forEach((tab) => {
    const d = timelogCache[tab]
    if (!d) return
    Object.entries(d.summary).forEach(([gasLabel, entry]) => {
      const pid = mapping[gasLabel]
      if (pid) allTabsHoursMap[pid] = (allTabsHoursMap[pid] ?? 0) + entry.totalHours
    })
  })

  // ROI テーブル行生成（2026年累計）: 稼働時間はキャッシュ全タブから集計、売上はRevenueRecordから集計
  type CumulativeRow = { project: typeof projects[0]; totalRevenue: number; totalProfit: number; totalHours: number; rph: number | null; periods: number }
  const cumulativeRows: CumulativeRow[] = projects
    .filter((p) => p.status !== 'completed')
    .flatMap((p) => {
      const recs = revenueRecords.filter((r) => r.projectId === p.id)
      const totalHours = allTabsHoursMap[p.id] ?? 0
      if (recs.length === 0 && totalHours === 0) return []
      const totalRevenue = recs.reduce((s, r) => s + r.revenue, 0)
      const totalProfit = recs.reduce((s, r) => s + r.profit, 0)
      const rph = totalRevenue > 0 && totalHours > 0 ? Math.round(totalRevenue / totalHours) : null
      return [{ project: p, totalRevenue, totalProfit, totalHours, rph, periods: recs.length }]
    })
    .sort((a, b) => (b.rph ?? -1) - (a.rph ?? -1))

  const fmtYen = (n: number) => {
    if (n >= 100_000_000) return `¥${(n / 100_000_000).toFixed(1)}億`
    if (n >= 10_000) return `¥${(n / 10_000).toFixed(1)}万`
    return `¥${n.toLocaleString()}`
  }

  const roiColor = (rph: number | null) => {
    if (rph === null) return 'var(--text-muted)'
    if (rph >= 10000) return 'var(--accent-cyan)'
    if (rph >= 5000) return 'var(--accent-warm)'
    return 'var(--accent-alert)'
  }

  const handleAnalyze = async () => {
    if (!data) return
    setAnalyzing(true)
    setAnalyzeError('')
    setAnalysis(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tab: data.tab,
          totalHours: data.totalHours,
          summary: data.summary,
          records: data.records ?? [],
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const result = await res.json()
      setAnalysis(result)
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const entries = data
    ? Object.entries(data.summary).sort((a, b) => b[1].totalHours - a[1].totalHours)
    : []
  const maxHours = entries.length > 0 ? entries[0][1].totalHours : 1

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', color: 'var(--text-bright)' }}>
      <header style={{ borderBottom: '1px solid var(--border-dim)', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-void)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, border: '2px solid var(--accent-cyan)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 11, height: 11, background: 'var(--accent-cyan)', borderRadius: 2 }} />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 900, color: 'var(--accent-cyan)', letterSpacing: '0.04em' }}>
              CLOUD<span style={{ color: 'var(--text-mid)', fontWeight: 600 }}> 2026年5億</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 1 }}>
            {NAV.map(({ label, href }) => {
              const active = label === 'TIME LOG'
              return (
                <Link key={label} href={href} style={{ textDecoration: 'none', fontSize: 11, fontFamily: 'var(--font-display)', padding: '5px 16px', letterSpacing: '0.12em', background: active ? 'rgba(232,160,0,0.1)' : 'transparent', border: `1px solid ${active ? 'var(--accent-cyan)' : 'var(--border-dim)'}`, color: active ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
        {tabs.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>PERIOD</span>
            <select
              value={selectedTab}
              onChange={(e) => setSelectedTab(e.target.value)}
              style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)', color: 'var(--text-bright)', fontFamily: 'var(--font-mono)', fontSize: 13, padding: '5px 10px', outline: 'none', colorScheme: 'dark' }}
            >
              {tabs.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {!gasUrl && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
            <div style={{ marginBottom: 16, fontSize: 14 }}>GAS API URLが設定されていません</div>
            <Link href="/settings" style={{ color: 'var(--accent-cyan)', fontSize: 12, letterSpacing: '0.12em' }}>→ SETTINGS で設定する</Link>
          </div>
        )}

        {gasUrl && loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
            LOADING...
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--accent-alert)', fontFamily: 'var(--font-mono)', fontSize: 13, padding: '20px 0' }}>✗ {error}</div>
        )}

        {data && !loading && (
          <>
            {/* Stats + Analyze button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36 }}>
              <div style={{ display: 'flex', gap: 40, alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.15em', marginBottom: 4 }}>PERIOD</div>
                  <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent-cyan)' }}>{data.tab}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.15em', marginBottom: 4 }}>TOTAL HOURS</div>
                  <div style={{ fontSize: 40, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-bright)', lineHeight: 1 }}>
                    {data.totalHours.toFixed(1)}<span style={{ fontSize: 14, color: 'var(--text-muted)', marginLeft: 4, fontWeight: 400 }}>h</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.15em', marginBottom: 4 }}>CATEGORIES</div>
                  <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-bright)' }}>{entries.length}</div>
                </div>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                style={{ padding: '10px 24px', fontSize: 12, fontFamily: 'var(--font-display)', letterSpacing: '0.12em', background: analyzing ? 'transparent' : 'rgba(232,160,0,0.1)', border: `1px solid ${analyzing ? 'var(--border-dim)' : 'var(--accent-cyan)'}`, color: analyzing ? 'var(--text-muted)' : 'var(--accent-cyan)', cursor: analyzing ? 'not-allowed' : 'pointer' }}
              >
                {analyzing ? 'AI ANALYZING...' : '✦ AI ANALYZE'}
              </button>
            </div>

            {/* AI Analysis */}
            {analyzeError && (
              <div style={{ color: 'var(--accent-alert)', fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 24 }}>✗ {analyzeError}</div>
            )}

            {analysis && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.2em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 12, height: 1, background: 'var(--accent-cyan)', display: 'inline-block' }} />
                  AI ANALYSIS
                </div>

                {/* Overall */}
                <div className="bracket-box" style={{ padding: 20, marginBottom: 16, background: 'rgba(232,160,0,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 40, fontFamily: 'var(--font-display)', fontWeight: 900, color: analysis.overall.score >= 7 ? 'var(--accent-green)' : analysis.overall.score >= 5 ? 'var(--accent-warm)' : 'var(--accent-alert)', lineHeight: 1 }}>
                        {analysis.overall.score}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>/ 10</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-bright)', lineHeight: 1.6 }}>{analysis.overall.summary}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--accent-green)', letterSpacing: '0.12em', marginBottom: 6 }}>POSITIVES</div>
                      {analysis.overall.positives.map((p, i) => (
                        <div key={i} style={{ fontSize: 12, color: 'var(--text-mid)', padding: '2px 0', display: 'flex', gap: 6 }}>
                          <span style={{ color: 'var(--accent-green)', flexShrink: 0 }}>+</span>{p}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--accent-alert)', letterSpacing: '0.12em', marginBottom: 6 }}>CONCERNS</div>
                      {analysis.overall.concerns.map((c, i) => (
                        <div key={i} style={{ fontSize: 12, color: 'var(--text-mid)', padding: '2px 0', display: 'flex', gap: 6 }}>
                          <span style={{ color: 'var(--accent-alert)', flexShrink: 0 }}>!</span>{c}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: 12 }}>
                    <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', letterSpacing: '0.12em', marginBottom: 6 }}>NEXT ACTION</div>
                    <div style={{ fontSize: 13, color: 'var(--text-bright)', fontFamily: 'var(--font-mono)' }}>→ {analysis.overall.recommendation}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Revenue Input Panel */}
            {showRevenueInput && (
              <RevenueInputPanel
                period={selectedTab}
                hoursMap={hoursMapByProjectId}
                onClose={() => setShowRevenueInput(false)}
              />
            )}

            {/* ROI Section */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.2em', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 12, height: 1, background: 'var(--accent-warm)', display: 'inline-block' }} />
                  ROI MATRIX
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['period', 'cumulative'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setRoiView(v)}
                      style={{ fontSize: 10, fontFamily: 'var(--font-display)', padding: '4px 12px', letterSpacing: '0.1em', background: roiView === v ? 'rgba(232,160,0,0.15)' : 'transparent', border: `1px solid ${roiView === v ? 'var(--accent-warm)' : 'var(--border-dim)'}`, color: roiView === v ? 'var(--accent-warm)' : 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      {v === 'period' ? '選択期間' : '2026年累計'}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowRevenueInput((v) => !v)}
                    style={{ fontSize: 10, fontFamily: 'var(--font-display)', padding: '4px 12px', letterSpacing: '0.1em', background: showRevenueInput ? 'rgba(0,229,255,0.1)' : 'transparent', border: `1px solid ${showRevenueInput ? 'var(--accent-cyan)' : 'var(--border-dim)'}`, color: showRevenueInput ? 'var(--accent-cyan)' : 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    ＋ 売上入力
                  </button>
                </div>
              </div>

              {/* Period ROI */}
              {roiView === 'period' && (
                <div>
                  {/* Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 100px 100px', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-dim)', marginBottom: 4 }}>
                    {['PROJECT', 'HOURS', '売上', '利益', '¥/h'].map((h) => (
                      <div key={h} style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.12em', textAlign: h === 'PROJECT' ? 'left' : 'right' }}>{h}</div>
                    ))}
                  </div>
                  {roiRows.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '16px 0' }}>この期間のデータがありません</div>
                  ) : roiRows.map(({ project: p, hours, revenue, profit, rph }) => (
                    <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 100px 100px', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      </div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', textAlign: 'right' }}>{hours.toFixed(1)}h</div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: revenue !== null ? 'var(--text-bright)' : 'var(--text-muted)', textAlign: 'right' }}>{revenue !== null ? fmtYen(revenue) : '—'}</div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: profit !== null ? (profit >= 0 ? 'var(--accent-green)' : 'var(--accent-alert)') : 'var(--text-muted)', textAlign: 'right' }}>{profit !== null ? fmtYen(profit) : '—'}</div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: roiColor(rph), textAlign: 'right' }}>{rph !== null ? fmtYen(rph) : '—'}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Cumulative ROI */}
              {roiView === 'cumulative' && (
                <div>
                  {loadingCumulative && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '8px 0', marginBottom: 8 }}>
                      全期間データ集計中...
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 100px 100px 60px', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-dim)', marginBottom: 4 }}>
                    {['PROJECT', '累計h', '累計売上', '累計利益', '平均¥/h', '期間数'].map((h) => (
                      <div key={h} style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.12em', textAlign: h === 'PROJECT' ? 'left' : 'right' }}>{h}</div>
                    ))}
                  </div>
                  {cumulativeRows.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '16px 0' }}>売上データがまだありません。「売上入力」から入力してください。</div>
                  ) : cumulativeRows.map(({ project: p, totalRevenue, totalProfit, totalHours, rph, periods }) => (
                    <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 100px 100px 60px', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      </div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', textAlign: 'right' }}>{totalHours.toFixed(1)}h</div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-bright)', textAlign: 'right' }}>{fmtYen(totalRevenue)}</div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-alert)', textAlign: 'right' }}>{fmtYen(totalProfit)}</div>
                      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700, color: roiColor(rph), textAlign: 'right' }}>{rph !== null ? fmtYen(rph) : '—'}</div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textAlign: 'right' }}>{periods}期間</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Time Allocation */}
            <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.2em', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 12, height: 1, background: 'var(--accent-cyan)', display: 'inline-block' }} />
              TIME ALLOCATION
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {entries.map(([gasLabel, entry]) => {
                const project = getProject(gasLabel)
                const barColor = project?.color ?? 'var(--accent-cyan)'
                const barWidth = (entry.totalHours / maxHours) * 100
                const pct = ((entry.totalHours / data.totalHours) * 100).toFixed(0)
                const isExpanded = !!expanded[gasLabel]
                const aiProject = analysis?.projects?.[gasLabel]

                return (
                  <div key={gasLabel} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                    <div
                      onClick={() => setExpanded((e) => ({ ...e, [gasLabel]: !e[gasLabel] }))}
                      style={{ cursor: 'pointer', padding: '12px 0' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: barColor, flexShrink: 0, boxShadow: `0 0 6px ${barColor}` }} />
                        <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: project ? 'var(--text-bright)' : 'var(--text-mid)', flex: 1 }}>
                          {project ? project.name : gasLabel}
                          {project && gasLabel !== project.name && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>{gasLabel}</span>
                          )}
                        </span>
                        {aiProject && (
                          <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: RATING_COLOR[aiProject.rating], letterSpacing: '0.08em' }}>
                            {RATING_LABEL[aiProject.rating]}
                          </span>
                        )}
                        <span style={{ fontSize: 15, fontFamily: 'var(--font-display)', fontWeight: 700, color: barColor }}>
                          {entry.totalHours.toFixed(1)}<span style={{ fontSize: 11, marginLeft: 2, fontWeight: 400, color: 'var(--text-muted)' }}>h</span>
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: 36, textAlign: 'right' }}>{pct}%</span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 4 }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${barWidth}%`, background: barColor, borderRadius: 2, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ paddingLeft: 17, paddingBottom: 12, borderLeft: `2px solid ${barColor}30`, marginLeft: 3 }}>
                        {aiProject && (
                          <div style={{ fontSize: 12, color: RATING_COLOR[aiProject.rating], fontFamily: 'var(--font-mono)', padding: '4px 0 8px', borderBottom: '1px solid var(--border-dim)', marginBottom: 6 }}>
                            ✦ {aiProject.comment}
                          </div>
                        )}
                        {entry.actions.map((action, i) => (
                          <div key={i} style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-mid)', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: barColor, fontSize: 10, flexShrink: 0 }}>›</span>
                            {action}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
