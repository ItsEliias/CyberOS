// NetworkMap — SubnetBubbles.tsx — Feature 1: Node grouping by /24 subnet
import type { NetworkNode } from '@shared/types'
import { groupBySubnet, groupBoundingBox } from '../lib/graphAlgorithms'

interface Props {
  nodes: NetworkNode[]
  enabled: boolean
}

const SUBNET_COLORS = [
  'rgba(88,166,255,0.06)',
  'rgba(63,185,80,0.06)',
  'rgba(210,153,34,0.06)',
  'rgba(248,81,73,0.06)',
  'rgba(163,113,247,0.06)',
]
const SUBNET_STROKE = [
  'rgba(88,166,255,0.25)',
  'rgba(63,185,80,0.25)',
  'rgba(210,153,34,0.25)',
  'rgba(248,81,73,0.25)',
  'rgba(163,113,247,0.25)',
]

export default function SubnetBubbles({ nodes, enabled }: Props) {
  if (!enabled) return null

  const groups = groupBySubnet(nodes)
  const subnets = Array.from(groups.entries()).filter(([, ns]) => ns.length > 1)

  return (
    <>
      {subnets.map(([subnet, subNodes], i) => {
        const bb = groupBoundingBox(subNodes, 48)
        const cx = (bb.minX + bb.maxX) / 2
        const cy = (bb.minY + bb.maxY) / 2
        const rx = (bb.maxX - bb.minX) / 2
        const ry = (bb.maxY - bb.minY) / 2
        const ci = i % SUBNET_COLORS.length

        return (
          <g key={subnet}>
            <ellipse
              cx={cx} cy={cy}
              rx={Math.max(rx, 40)} ry={Math.max(ry, 40)}
              fill={SUBNET_COLORS[ci]}
              stroke={SUBNET_STROKE[ci]}
              strokeWidth={1.5}
              strokeDasharray="6 3"
            />
            <text
              x={cx} y={bb.minY - 6}
              textAnchor="middle"
              fontSize={10}
              fill={SUBNET_STROKE[ci].replace('0.25', '0.8')}
              style={{ pointerEvents: 'none' }}
              fontFamily="monospace"
            >{subnet}</text>
          </g>
        )
      })}
    </>
  )
}
