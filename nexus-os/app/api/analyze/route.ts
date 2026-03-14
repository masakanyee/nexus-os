import { NextRequest, NextResponse } from 'next/server'

interface AnalyzeRequestBody {
  tab: string
  totalHours: number
  summary: Record<string, { totalHours: number; actions: string[] }>
}

function buildPrompt(body: AnalyzeRequestBody): string {
  const { tab, totalHours, summary } = body
  const entries = Object.entries(summary).sort((a, b) => b[1].totalHours - a[1].totalHours)

  const projectLines = entries.map(([label, entry]) => {
    const pct = ((entry.totalHours / totalHours) * 100).toFixed(1)
    const topActions = entry.actions.slice(0, 6).join('、')
    return `・${label}: ${entry.totalHours}h (${pct}%) — ${topActions}`
  }).join('\n')

  return `あなたは経営者・個人事業主のビジネスコーチです。
以下は期間 ${tab} の作業時間ログです。客観的・具体的に日本語で分析してください。

【合計時間】${totalHours}h

【プロジェクト別内訳】
${projectLines}

以下のJSON形式で回答してください（JSONのみ、説明文不要）:
{
  "overall": {
    "score": <1-10の整数>,
    "summary": "<2-3文で総括>",
    "positives": ["<良かった点1>", "<良かった点2>"],
    "concerns": ["<懸念点1>", "<懸念点2>"],
    "recommendation": "<最重要アクション1つ>"
  },
  "projects": {
    "<プロジェクト名>": {
      "rating": "<high|medium|low>",
      "comment": "<1-2文の評価>"
    }
  }
}`
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY が設定されていません' }, { status: 500 })
  }

  let body: AnalyzeRequestBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const prompt = buildPrompt(body)

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `OpenAI error: ${res.status} — ${err}` }, { status: res.status })
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content ?? '{}'

  try {
    const parsed = JSON.parse(content)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: content }, { status: 500 })
  }
}
