'use client'
import { useState, useEffect, useRef } from 'react'

// ─── Helpers ───────────────────────────────────────────────────────────────────
async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function bufToB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}
function b64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64)
  const buf = new ArrayBuffer(bin.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i)
  return buf
}

const SESSION_KEY = 'nexus-authed'
const CRED_KEY = 'nexus-webauthn-cred'

function isAuthed(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === '1'
}
function setAuthed() {
  sessionStorage.setItem(SESSION_KEY, '1')
}

// ─── WebAuthn ─────────────────────────────────────────────────────────────────
async function registerTouchId(): Promise<string | null> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const userId = crypto.getRandomValues(new Uint8Array(16))
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'NEXUS::OS', id: window.location.hostname },
        user: { id: userId, name: 'user', displayName: 'NEXUS User' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
      },
    }) as PublicKeyCredential | null
    if (!cred) return null
    return bufToB64(cred.rawId)
  } catch {
    return null
  }
}

async function authWithTouchId(credB64: string): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const result = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [{ type: 'public-key', id: b64ToBuf(credB64) }],
        userVerification: 'required',
        timeout: 60000,
      },
    })
    return !!result
  } catch {
    return false
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const passwordHash = process.env.NEXT_PUBLIC_APP_PASSWORD_HASH

  const [state, setState] = useState<'loading' | 'authed' | 'login' | 'register_touchid'>('loading')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [touchIdAvailable, setTouchIdAvailable] = useState(false)
  const [hasCred, setHasCred] = useState(false)
  const [touchIdLoading, setTouchIdLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // 環境変数が未設定 → 認証スキップ（開発環境）
    if (!passwordHash) { setState('authed'); return }

    if (isAuthed()) { setState('authed'); return }

    const cred = localStorage.getItem(CRED_KEY)
    setHasCred(!!cred)

    // WebAuthn 対応チェック
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(setTouchIdAvailable)
        .catch(() => setTouchIdAvailable(false))
    }

    // Touch ID 登録済みなら自動で認証試行
    if (cred) {
      setTouchIdLoading(true)
      authWithTouchId(cred).then((ok) => {
        if (ok) { setAuthed(); setState('authed') }
        else { setTouchIdLoading(false); setState('login') }
      })
    } else {
      setState('login')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (state === 'login') setTimeout(() => inputRef.current?.focus(), 100)
  }, [state])

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    const hash = await sha256(password)
    if (hash === passwordHash) {
      setAuthed()
      setPassword('')
      setError('')
      // Touch ID 未登録かつ利用可能なら登録を促す
      if (touchIdAvailable && !localStorage.getItem(CRED_KEY)) {
        setState('register_touchid')
      } else {
        setState('authed')
      }
    } else {
      setError('INVALID PASSWORD')
      setPassword('')
      setTimeout(() => setError(''), 2000)
    }
  }

  const handleTouchIdLogin = async () => {
    const cred = localStorage.getItem(CRED_KEY)
    if (!cred) return
    setTouchIdLoading(true)
    const ok = await authWithTouchId(cred)
    setTouchIdLoading(false)
    if (ok) { setAuthed(); setState('authed') }
    else setError('Touch ID 認証に失敗しました')
  }

  const handleRegisterTouchId = async (register: boolean) => {
    if (register) {
      const credB64 = await registerTouchId()
      if (credB64) localStorage.setItem(CRED_KEY, credB64)
    }
    setState('authed')
  }

  if (state === 'authed') return <>{children}</>

  // ─── Styles ───────────────────────────────────────────────────────────────
  const overlay: React.CSSProperties = {
    minHeight: '100vh', background: 'var(--bg-void)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexDirection: 'column',
  }
  const box: React.CSSProperties = {
    border: '1px solid var(--border-dim)', padding: '48px 56px',
    background: 'var(--bg-card)', width: 380, position: 'relative', borderRadius: 12,
  }

  // ─── Loading / Touch ID auto-auth ─────────────────────────────────────────
  if (state === 'loading' || touchIdLoading) {
    return (
      <div style={overlay}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.2em' }}>
          {touchIdLoading ? 'AUTHENTICATING...' : 'LOADING...'}
        </div>
      </div>
    )
  }

  // ─── Touch ID 登録確認 ─────────────────────────────────────────────────────
  if (state === 'register_touchid') {
    return (
      <div style={overlay}>
        <div style={box}>
          <Logo />
          <div style={{ fontSize: 13, color: 'var(--text-bright)', marginBottom: 8, fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
            Touch ID で次回から開けます
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 28, lineHeight: 1.6 }}>
            Macの指紋認証をNEXUS::OSに登録しますか？<br />
            次回からパスワード不要でアクセスできます。
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleRegisterTouchId(true)}
              style={btnStyle('cyan')}
            >
              ✦ Touch IDを登録
            </button>
            <button
              onClick={() => handleRegisterTouchId(false)}
              style={btnStyle('dim')}
            >
              スキップ
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Login ────────────────────────────────────────────────────────────────
  return (
    <div style={overlay}>
      <div style={{ ...box, zIndex: 1 }}>
        <Logo />

        {/* Touch ID ボタン */}
        {hasCred && touchIdAvailable && (
          <button
            onClick={handleTouchIdLogin}
            style={{ ...btnStyle('cyan'), width: '100%', marginBottom: 20, fontSize: 13, padding: '12px', letterSpacing: '0.1em' }}
          >
            ✦ Touch IDでログイン
          </button>
        )}

        {/* 区切り */}
        {hasCred && touchIdAvailable && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border-dim)' }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-dim)' }} />
          </div>
        )}

        {/* パスワードフォーム */}
        <form onSubmit={handlePassword}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.2em', marginBottom: 8 }}>
            PASSWORD
          </div>
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: '100%', background: 'var(--bg-void)',
              border: `1px solid ${error ? 'var(--accent-alert)' : 'var(--border-dim)'}`,
              color: 'var(--text-bright)', fontFamily: 'var(--font-mono)',
              fontSize: 18, padding: '10px 14px', outline: 'none',
              letterSpacing: '0.3em', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
          {error && (
            <div style={{ fontSize: 10, color: 'var(--accent-alert)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', marginTop: 6 }}>
              ✗ {error}
            </div>
          )}
          <button type="submit" style={{ ...btnStyle('cyan'), width: '100%', marginTop: 16, fontSize: 12, padding: '11px' }}>
            ACCESS →
          </button>
        </form>
      </div>
    </div>
  )
}

function Logo() {
  return (
    <div style={{ marginBottom: 36, textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 28, height: 28, border: '2px solid var(--accent-cyan)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 10, height: 10, background: 'var(--accent-cyan)', borderRadius: 2 }} />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, color: 'var(--accent-cyan)', letterSpacing: '0.1em' }}>
          NEXUS<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>::OS</span>
        </span>
      </div>
      <div style={{ fontSize: 9, fontFamily: 'var(--font-display)', color: 'var(--text-muted)', letterSpacing: '0.3em' }}>
        SECURE ACCESS REQUIRED
      </div>
    </div>
  )
}

function btnStyle(variant: 'cyan' | 'dim'): React.CSSProperties {
  return {
    cursor: 'pointer', fontFamily: 'var(--font-display)', letterSpacing: '0.12em',
    fontSize: 11, padding: '8px 20px', transition: 'all 0.15s',
    background: variant === 'cyan' ? 'rgba(232,160,0,0.1)' : 'transparent',
    border: `1px solid ${variant === 'cyan' ? 'var(--accent-cyan)' : 'var(--border-dim)'}`,
    color: variant === 'cyan' ? 'var(--accent-cyan)' : 'var(--text-muted)',
  }
}
