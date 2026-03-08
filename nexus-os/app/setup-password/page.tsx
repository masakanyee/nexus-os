'use client'
import { useState } from 'react'

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export default function SetupPasswordPage() {
  const [password, setPassword] = useState('')
  const [hash, setHash] = useState('')
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    if (!password) return
    setHash(await sha256(password))
  }

  const copy = () => {
    navigator.clipboard.writeText(hash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const mono: React.CSSProperties = {
    fontFamily: 'var(--font-mono)', fontSize: 12,
    background: 'var(--bg-void)', border: '1px solid var(--border-dim)',
    color: 'var(--text-bright)', padding: '10px 14px', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 460, border: '1px solid var(--border-dim)', padding: '40px 48px', background: 'rgba(0,229,255,0.02)' }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', letterSpacing: '0.2em', marginBottom: 4 }}>
          NEXUS::OS
        </div>
        <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-bright)', letterSpacing: '0.1em', marginBottom: 32 }}>
          PASSWORD SETUP
        </div>

        <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.15em', marginBottom: 8 }}>
          STEP 1 — パスワードを入力してハッシュを生成
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && generate()}
          placeholder="設定したいパスワード"
          style={{ ...mono, marginBottom: 10 }}
          autoFocus
        />
        <button
          onClick={generate}
          disabled={!password}
          style={{
            width: '100%', padding: '10px', marginBottom: 24,
            fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: '0.15em',
            background: password ? 'rgba(0,229,255,0.1)' : 'transparent',
            border: `1px solid ${password ? 'var(--accent-cyan)' : 'var(--border-dim)'}`,
            color: password ? 'var(--accent-cyan)' : 'var(--text-muted)',
            cursor: password ? 'pointer' : 'not-allowed',
          }}
        >
          GENERATE HASH
        </button>

        {hash && (
          <>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.15em', marginBottom: 8 }}>
              STEP 2 — このハッシュをコピー
            </div>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <div style={{ ...mono, wordBreak: 'break-all', lineHeight: 1.6, paddingRight: 80 }}>
                {hash}
              </div>
              <button
                onClick={copy}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 10, fontFamily: 'var(--font-display)', padding: '4px 10px',
                  background: copied ? 'rgba(0,255,136,0.12)' : 'rgba(0,229,255,0.1)',
                  border: `1px solid ${copied ? '#00ff88' : 'var(--accent-cyan)'}`,
                  color: copied ? '#00ff88' : 'var(--accent-cyan)', cursor: 'pointer', letterSpacing: '0.05em',
                }}
              >
                {copied ? 'COPIED!' : 'COPY'}
              </button>
            </div>

            <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.15em', marginBottom: 8, marginTop: 24 }}>
              STEP 3 — Vercelに環境変数として追加
            </div>
            <div style={{ ...mono, lineHeight: 1.8, color: 'var(--accent-cyan)', fontSize: 11 }}>
              Key: NEXT_PUBLIC_APP_PASSWORD_HASH<br />
              Value: {hash.slice(0, 20)}...
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              Vercel → Settings → Environment Variables に追加後、Redeploy してください。<br />
              ローカルの場合は .env.local に追記：<br />
              <span style={{ color: 'var(--text-mid)' }}>NEXT_PUBLIC_APP_PASSWORD_HASH=（コピーしたハッシュ）</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
