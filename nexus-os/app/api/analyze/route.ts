import { NextRequest, NextResponse } from 'next/server'

interface RawRecord {
  project: string
  content: string
  duration: number
}

interface AnalyzeRequestBody {
  tab: string
  totalHours: number
  summary: Record<string, { totalHours: number; actions: string[] }>
  records?: RawRecord[]
}

function buildPrompt(body: AnalyzeRequestBody): string {
  const { tab, totalHours, summary, records = [] } = body
  const entries = Object.entries(summary).sort((a, b) => b[1].totalHours - a[1].totalHours)

  // プロジェクト別サマリー（全アクション含む）
  const projectLines = entries.map(([label, entry]) => {
    const pct = ((entry.totalHours / totalHours) * 100).toFixed(1)
    const allActions = entry.actions.join('、')
    return `・${label}: ${entry.totalHours}h (${pct}%) — ${allActions}`
  }).join('\n')

  // 実作業ログ（G列の内容）をプロジェクト別にグループ化
  const recordsByProject: Record<string, string[]> = {}
  records.forEach((r) => {
    if (!r.content?.trim()) return
    if (!recordsByProject[r.project]) recordsByProject[r.project] = []
    recordsByProject[r.project].push(`  [${r.duration}h] ${r.content.trim()}`)
  })

  const detailLines = Object.entries(recordsByProject)
    .map(([proj, lines]) => `【${proj}】\n${lines.join('\n')}`)
    .join('\n\n')

  return `あなたは経営者・個人事業主のビジネスコーチです。
以下は期間 ${tab} の実際の作業ログです。時間の配分だけでなく、具体的な作業内容・進捗・行動の質まで踏み込んで客観的・具体的に日本語で分析してください。

【合計時間】${totalHours}h

【プロジェクト別時間サマリー】
${projectLines}

【実際の作業ログ（内容・詳細）】
${detailLines || '（詳細ログなし）'}

分析時の観点:
- 各プロジェクトで何を具体的に進めたか（売上・採用・開発など進捗の質）
- 時間配分は目標に対して適切か
- ルーティン作業と戦略的作業のバランス
- 特定プロジェクトへの偏りや手薄な領域
- 次の期間で最優先すべきアクション

以下のJSON形式で回答してください（JSONのみ、説明文不要）:
{
  "overall": {
    "score": <1-10の整数>,
    "summary": "<2-3文で総括（作業内容の質・進捗を含む）>",
    "positives": ["<具体的な良かった点1>", "<具体的な良かった点2>"],
    "concerns": ["<具体的な懸念点1>", "<具体的な懸念点2>"],
    "recommendation": "<次期間の最重要アクション（具体的に1つ）>"
  },
  "projects": {
    "<プロジェクト名>": {
      "rating": "<high|medium|low>",
      "comment": "<作業内容の質・進捗を踏まえた1-2文の評価>"
    }
  }
}`
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY が設定されていません' }, { status: 500 })
  }

  let body: AnalyzeRequestBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const prompt = buildPrompt(body)

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `Gemini error: ${res.status} — ${err}` }, { status: res.status })
  }

  const data = await res.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'

  try {
    const parsed = JSON.parse(content)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: content }, { status: 500 })
  }
}
