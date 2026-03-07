'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useFlowStore, loadStoredState, saveStoredState, useProjectStore } from '@/store'
import { FlowNode } from '@/types'

const COLORS = ['#00e5ff', '#ff9f0a', '#ff4444', '#00ff88', '#c084fc', '#60a5fa', '#f472b6']

const SIZE_PRESETS = [
  { label: 'S', w: 150, h: 80 },
  { label: 'M', w: 210, h: 110 },
  { label: 'L', w: 300, h: 150 },
]

// ─── Node Card ────────────────────────────────────────────────────────────────
function NodeCard({
  node,
  isSelected,
  isConnSrc,
  isConnTarget,
  onSelect,
  onConnectClick,
  onUpdate,
  onDelete,
  onDragStart,
  onResizeStart,
}: {
  node: FlowNode
  isSelected: boolean
  isConnSrc: boolean
  isConnTarget: boolean
  onSelect: () => void
  onConnectClick: (e: React.MouseEvent) => void
  onUpdate: (patch: Partial<FlowNode>) => void
  onDelete: () => void
  onDragStart: (e: React.MouseEvent) => void
  onResizeStart: (e: React.MouseEvent) => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  const c = node.color

  return (
    <div
      onMouseDown={(e) => { if ((e.target as HTMLElement).dataset.handle !== 'resize') { onSelect(); onDragStart(e) } }}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: node.w,
        height: node.h,
        background: isConnTarget ? `${c}18` : isConnSrc ? `${c}14` : 'var(--bg-card)',
        border: `1px solid ${isSelected || isConnSrc ? c : 'var(--border-dim)'}`,
        boxShadow: isSelected ? `0 0 18px ${c}33` : 'none',
        cursor: 'grab',
        userSelect: 'none',
        zIndex: isSelected ? 20 : 10,
        display: 'flex',
        flexDirection: 'column',
        padding: '10px 12px',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5, flexShrink: 0 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, boxShadow: `0 0 5px ${c}`, flexShrink: 0, marginTop: 3 }} />
        <input
          value={node.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-bright)', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', cursor: 'text', minWidth: 0 }}
        />
        {/* Actions */}
        {confirmDel ? (
          <div style={{ display: 'flex', gap: 3 }} onMouseDown={(e) => e.stopPropagation()}>
            <button onClick={onDelete} style={{ fontSize: 8, padding: '1px 5px', background: 'rgba(255,68,68,0.15)', border: '1px solid var(--accent-alert)', color: 'var(--accent-alert)', cursor: 'pointer', fontFamily: 'var(--font-display)' }}>DEL</button>
            <button onClick={() => setConfirmDel(false)} style={{ fontSize: 8, padding: '1px 4px', background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
          </div>
        ) : (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setConfirmDel(true)}
            style={{ fontSize: 10, padding: '0 2px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-alert)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
          >×</button>
        )}
      </div>

      {/* Notes */}
      <textarea
        value={node.notes ?? ''}
        onChange={(e) => onUpdate({ notes: e.target.value })}
        onMouseDown={(e) => e.stopPropagation()}
        placeholder="メモ..."
        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-mid)', fontFamily: 'var(--font-mono)', fontSize: 10, resize: 'none', lineHeight: 1.5, cursor: 'text' }}
      />

      {/* Bottom toolbar (visible when selected) */}
      {isSelected && (
        <div style={{ display: 'flex', gap: 3, marginTop: 5, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }} onMouseDown={(e) => e.stopPropagation()}>
          {SIZE_PRESETS.map(({ label, w, h }) => (
            <button
              key={label}
              onClick={() => onUpdate({ w, h })}
              style={{ fontSize: 8, fontFamily: 'var(--font-display)', padding: '2px 6px', background: node.w === w ? `${c}20` : 'transparent', border: `1px solid ${node.w === w ? c : 'var(--border-dim)'}`, color: node.w === w ? c : 'var(--text-muted)', cursor: 'pointer' }}
            >
              {label}
            </button>
          ))}
          <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
            {COLORS.map((col) => (
              <button
                key={col}
                onClick={() => onUpdate({ color: col })}
                style={{ width: 12, height: 12, borderRadius: '50%', background: col, border: node.color === col ? '2px solid white' : '1px solid transparent', cursor: 'pointer', padding: 0 }}
              />
            ))}
          </div>
          <button
            onClick={onConnectClick}
            style={{ fontSize: 8, fontFamily: 'var(--font-display)', padding: '2px 8px', background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 'auto' }}
          >
            🔗 CONNECT
          </button>
        </div>
      )}

      {/* Resize handle */}
      <div
        data-handle="resize"
        onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e) }}
        style={{ position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, cursor: 'nwse-resize', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '2px' }}
      >
        <svg width="8" height="8" style={{ opacity: 0.3, pointerEvents: 'none' }}>
          <path d="M0,8 L8,0 M4,8 L8,4" stroke="var(--text-muted)" strokeWidth="1" />
        </svg>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FlowBoardClient() {
  useEffect(() => {
    loadStoredState()
    const unsub = useFlowStore.subscribe(saveStoredState)
    return () => { unsub() }
  }, [])

  const nodes = useFlowStore((s) => s.nodes)
  const connections = useFlowStore((s) => s.connections)
  const addNode = useFlowStore((s) => s.addNode)
  const updateNode = useFlowStore((s) => s.updateNode)
  const deleteNode = useFlowStore((s) => s.deleteNode)
  const addConnection = useFlowStore((s) => s.addConnection)
  const deleteConnection = useFlowStore((s) => s.deleteConnection)

  const [selected, setSelected] = useState<string | null>(null)
  const [connSrc, setConnSrc] = useState<string | null>(null)

  // drag
  const dragRef = useRef<{ nodeId: string; startX: number; startY: number; origX: number; origY: number; type: 'move' | 'resize'; origW?: number; origH?: number } | null>(null)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (d.type === 'move') {
      updateNode(d.nodeId, { x: Math.max(0, d.origX + dx), y: Math.max(0, d.origY + dy) })
    } else {
      updateNode(d.nodeId, { w: Math.max(120, (d.origW ?? 200) + dx), h: Math.max(60, (d.origH ?? 100) + dy) })
    }
  }, [updateNode])

  const handleMouseUp = useCallback(() => { dragRef.current = null }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp) }
  }, [handleMouseMove, handleMouseUp])

  const startDrag = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault()
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return
    dragRef.current = { nodeId, startX: e.clientX, startY: e.clientY, origX: node.x, origY: node.y, type: 'move' }
  }

  const startResize = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault()
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return
    dragRef.current = { nodeId, startX: e.clientX, startY: e.clientY, origX: node.x, origY: node.y, origW: node.w, origH: node.h, type: 'resize' }
  }

  // canvas bounds
  const canvasW = Math.max(1400, ...nodes.map((n) => n.x + n.w + 120))
  const canvasH = Math.max(900, ...nodes.map((n) => n.y + n.h + 120))

  // SVG connections
  const renderArrows = () =>
    connections.map((conn) => {
      const from = nodes.find((n) => n.id === conn.from)
      const to = nodes.find((n) => n.id === conn.to)
      if (!from || !to) return null
      const x1 = from.x + from.w
      const y1 = from.y + from.h / 2
      const x2 = to.x
      const y2 = to.y + to.h / 2
      const dx = Math.max(60, Math.abs(x2 - x1) * 0.5)
      return (
        <g key={conn.id}>
          <path
            d={`M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`}
            fill="none"
            stroke="rgba(0,229,255,0.35)"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            markerEnd="url(#arr)"
          />
          {/* click to delete */}
          <path
            d={`M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`}
            fill="none"
            stroke="transparent"
            strokeWidth={10}
            style={{ cursor: 'pointer' }}
            onClick={() => deleteConnection(conn.id)}
          />
        </g>
      )
    })

  const handleCanvasClick = () => {
    setSelected(null)
    setConnSrc(null)
  }

  const handleNodeClick = (nodeId: string) => {
    if (connSrc && connSrc !== nodeId) {
      addConnection(connSrc, nodeId)
      setConnSrc(null)
      return
    }
    setSelected(nodeId === selected ? null : nodeId)
  }

  const addNewNode = () => {
    const x = 100 + Math.random() * 200
    const y = 100 + Math.random() * 200
    addNode({ label: 'NEW NODE', notes: '', x, y, w: 200, h: 110, color: '#00e5ff' })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border-dim)', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-void)', zIndex: 100, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 28, height: 28, border: '1px solid var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-cyan)' }}>
              <div style={{ width: 10, height: 10, background: 'var(--accent-cyan)' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 900, color: 'var(--accent-cyan)', letterSpacing: '0.2em', textShadow: 'var(--glow-cyan)' }}>
              NEXUS<span style={{ color: 'var(--text-mid)', fontWeight: 400 }}>::OS</span>
            </span>
          </Link>
          <div style={{ display: 'flex', gap: 1 }}>
            {[{ label: 'KANBAN', href: '/' }, { label: 'FLOW BOARD', href: '/timeline' }].map(({ label, href }) => {
              const active = href === '/timeline'
              return (
                <Link key={label} href={href} style={{ textDecoration: 'none', fontSize: 9, fontFamily: 'var(--font-display)', padding: '5px 14px', letterSpacing: '0.12em', background: active ? 'rgba(0,229,255,0.1)' : 'transparent', border: `1px solid ${active ? 'var(--accent-cyan)' : 'var(--border-dim)'}`, color: active ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            矢印クリックで削除 · カード下部のツールバーで接続
          </span>
          <button
            onClick={addNewNode}
            style={{ fontSize: 9, fontFamily: 'var(--font-display)', padding: '6px 16px', background: 'rgba(0,229,255,0.1)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', cursor: 'pointer', letterSpacing: '0.1em' }}
          >
            + NEW NODE
          </button>
        </div>
      </header>

      {/* Canvas */}
      <div
        style={{ flex: 1, overflow: 'auto', position: 'relative' }}
        onClick={handleCanvasClick}
      >
        <div
          style={{
            position: 'relative',
            width: canvasW,
            height: canvasH,
            backgroundImage: 'radial-gradient(circle, rgba(0,229,255,0.07) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        >
          {/* SVG connections */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
            <defs>
              <marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                <path d="M0,0 L0,7 L7,3.5 z" fill="rgba(0,229,255,0.55)" />
              </marker>
            </defs>
            <g style={{ pointerEvents: 'all' }}>
              {renderArrows()}
            </g>
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <div
              key={node.id}
              onClick={(e) => { e.stopPropagation(); handleNodeClick(node.id) }}
            >
              <NodeCard
                node={node}
                isSelected={selected === node.id}
                isConnSrc={connSrc === node.id}
                isConnTarget={connSrc !== null && connSrc !== node.id}
                onSelect={() => handleNodeClick(node.id)}
                onConnectClick={(e) => { e.stopPropagation(); setConnSrc(node.id); setSelected(null) }}
                onUpdate={(patch) => updateNode(node.id, patch)}
                onDelete={() => { deleteNode(node.id); setSelected(null) }}
                onDragStart={(e) => startDrag(e, node.id)}
                onResizeStart={(e) => startResize(e, node.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Connect mode banner */}
      {connSrc && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: 'rgba(0,229,255,0.08)', border: '1px solid var(--accent-cyan)', padding: '10px 24px', display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', color: 'var(--accent-cyan)', letterSpacing: '0.1em' }}>
            接続先ノードをクリック
          </span>
          <button onClick={() => setConnSrc(null)} style={{ fontSize: 9, fontFamily: 'var(--font-display)', padding: '3px 12px', background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-muted)', cursor: 'pointer' }}>CANCEL</button>
        </div>
      )}
    </div>
  )
}
