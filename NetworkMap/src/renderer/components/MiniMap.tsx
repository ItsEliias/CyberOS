// NetworkMap — MiniMap.tsx — Feature 7: 160x120 mini-map with viewport rect
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
              fill={n.status === 'up' ? 'rgba(255,140,66,0.55)' : 'rgba(72,79,88,0.5)'}
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
    </div>
  )
}
