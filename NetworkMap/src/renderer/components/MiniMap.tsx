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
    <svg
      width={W} height={H}
      onClick={handleClick}
      style={{
        position: 'absolute', bottom: 16, right: 16,
        background: 'rgba(15,17,23,0.92)', border: '1px solid rgba(42,51,71,0.8)',
        borderRadius: 6, cursor: 'crosshair', zIndex: 20,
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}
    >
      {nodes.map(n => {
        const [nx, ny] = toMM(n.x, n.y)
        return <circle key={n.id} cx={nx} cy={ny} r={2} fill="rgba(139,148,158,0.7)" />
      })}
      <rect
        x={r1x} y={r1y}
        width={rectW} height={rectH}
        fill="rgba(210,153,34,0.08)"
        stroke="rgba(210,153,34,0.6)"
        strokeWidth={1}
      />
      <text x={4} y={H - 4} fontSize={8} fill="rgba(139,148,158,0.5)">mini-map</text>
    </svg>
  )
}
