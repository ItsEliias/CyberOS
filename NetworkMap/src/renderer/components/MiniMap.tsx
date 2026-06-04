// NetworkMap — MiniMap.tsx — Feature 7: 160x120 mini-map with viewport rect + node type legend
import { useCallback } from 'react'
import type { NetworkNode } from '@shared/types'

interface Transform { x: number; y: number; scale: number }

interface Props {
  nodes: NetworkNode[]
  transform: Transform
  canvasW: number
  canvasH: number
  onPan: (x: number, y: number) => void
}

const W = 160
const H = 120
const PAD = 8

// Map a node to a minimap color matching GraphCanvas legend (by port count)
function nodeColor(n: NetworkNode): string {
  if (n.status !== 'up') return 'rgba(72,79,88,0.55)'
  const open = n.openPortCount ?? n.ports.filter(p => p.state === 'open').length
  if (open >= 6) return 'rgba(248,81,73,0.7)'
  if (open >= 3) return 'rgba(210,153,34,0.7)'
  if (open >= 1) return 'rgba(63,185,80,0.7)'
  return 'rgba(255,140,66,0.5)'  // up but no open ports
}

// Legend entries — match GraphCanvas sidebar legend
const LEGEND_ENTRIES = [
  { color: '#3fb950', label: '1–2 ports' },
  { color: '#d29922', label: '3–5 ports' },
  { color: '#f85149', label: '6+ ports'  },
  { color: '#484f58', label: 'Down'      },
]

export default function MiniMap({ nodes, transform, canvasW, canvasH, onPan }: Props) {
  if (nodes.length === 0) return null

  const xs = nodes.map(n => n.x)
  const ys = nodes.map(n => n.y)
  const minX = Math.min(...xs) - 60
  const minY = Math.min(...ys) - 60
  const maxX = Math.max(...xs) + 60
  const maxY = Math.max(...ys) + 60
  const graphW = maxX - minX || 1
  const graphH = maxY - minY || 1

  const scaleX = (W - PAD * 2) / graphW
  const scaleY = (H - PAD * 2) / graphH
  const mmScale = Math.min(scaleX, scaleY)

  function toMM(wx: number, wy: number): [number, number] {
    return [PAD + (wx - minX) * mmScale, PAD + (wy - minY) * mmScale]
  }

  // Viewport rect in world coords
  const vpLeft   = -transform.x / transform.scale
  const vpTop    = -transform.y / transform.scale
  const vpRight  = vpLeft  + canvasW / transform.scale
  const vpBottom = vpTop   + canvasH / transform.scale

  const [r1x, r1y] = toMM(vpLeft, vpTop)
  const [r2x, r2y] = toMM(vpRight, vpBottom)
  const rectW = Math.max(4, r2x - r1x)
  const rectH = Math.max(4, r2y - r1y)

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
    const mmX = e.clientX - rect.left
    const mmY = e.clientY - rect.top
    const worldX = (mmX - PAD) / mmScale + minX
    const worldY = (mmY - PAD) / mmScale + minY
    onPan(canvasW / 2 - worldX * transform.scale, canvasH / 2 - worldY * transform.scale)
  }, [mmScale, minX, minY, canvasW, canvasH, transform.scale, onPan])

  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 16, zIndex: 20,
      background: 'rgba(13,14,24,0.92)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 10, overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.6), 0 2px 6px rgba(0,0,0,0.4)',
      backdropFilter: 'blur(12px)',
    }}>
      {/* Header label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '3px 7px 2px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,140,66,0.5)' }} />
        <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'rgba(139,148,158,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          overview
        </span>
        <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'rgba(139,148,158,0.3)', marginLeft: 'auto' }}>
          {nodes.length}n
        </span>
      </div>

      {/* SVG minimap */}
      <svg
        width={W} height={H}
        onClick={handleClick}
        style={{ cursor: 'crosshair', display: 'block' }}
      >
        {nodes.map(n => {
          const [nx, ny] = toMM(n.x, n.y)
          return (
            <circle
              key={n.id}
              cx={nx} cy={ny} r={2.5}
              fill={nodeColor(n)}
            />
          )
        })}
        <rect
          x={r1x} y={r1y}
          width={rectW} height={rectH}
          fill="rgba(255,140,66,0.05)"
          stroke="rgba(255,140,66,0.5)"
          strokeWidth={1.5}
          rx={2}
        />
      </svg>

      {/* Node type legend + zoom */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        padding: '5px 8px 6px',
        background: 'rgba(7,8,15,0.6)',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '3px 8px',
      }}>
        {LEGEND_ENTRIES.map(entry => (
          <div key={entry.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: entry.color,
              boxShadow: entry.color !== '#484f58' ? `0 0 4px ${entry.color}80` : 'none',
            }} />
            <span style={{ fontSize: 8, color: 'rgba(139,148,158,0.55)', lineHeight: 1 }}>
              {entry.label}
            </span>
          </div>
        ))}
      </div>
      {/* Zoom level footer */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.03)',
        padding: '3px 7px',
        background: 'rgba(7,8,15,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 8, fontFamily: 'var(--font-mono)', color: 'rgba(139,148,158,0.4)', letterSpacing: '0.04em' }}>
          zoom
        </span>
        <span style={{
          fontSize: 9, fontFamily: 'var(--font-mono)',
          color: transform.scale !== 1 ? 'rgba(255,140,66,0.7)' : 'rgba(139,148,158,0.55)',
          fontWeight: 600, letterSpacing: '0.04em',
        }}>
          {Math.round(transform.scale * 100)}%
        </span>
      </div>
    </div>
  )
}
