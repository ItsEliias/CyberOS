import { ResponsiveContainer, AreaChart, Area } from 'recharts'

interface SparklineChartProps {
  data: number[]
  color?: string
  height?: number
  width?: number
  shimmer?: boolean
}

/** Sanitize a color string into a safe CSS id fragment */
function colorId(color: string): string {
  return color.replace(/[^a-z0-9]/gi, '')
}

export function SparklineChart({
  data,
  color = 'var(--accent)',
  height = 36,
  width = 80,
  shimmer = false,
}: SparklineChartProps) {
  const points = data.map((v, i) => ({ i, v }))
  const id = `sg-${colorId(color)}`
  const shimId = `sg-shim-${colorId(color)}`

  return (
    <div style={{ width, height, flexShrink: 0, position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            {/* Dark base → accent at line: top is near-black, bottom is accent colour */}
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.55} />
              <stop offset="55%"  stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor="#0a0d17"  stopOpacity={0.0} />
            </linearGradient>

            {/* Shimmer sweep gradient — used as overlay when shimmer=true */}
            {shimmer && (
              <linearGradient id={shimId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="transparent" />
                <stop offset="40%"  stopColor="white" stopOpacity={0.06} />
                <stop offset="60%"  stopColor="white" stopOpacity={0.13} />
                <stop offset="100%" stopColor="transparent" />
                <animateTransform
                  attributeName="gradientTransform"
                  type="translate"
                  from="-1 0"
                  to="2 0"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
              </linearGradient>
            )}
          </defs>

          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.8}
            fill={`url(#${id})`}
            dot={false}
            isAnimationActive
            animationDuration={700}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Shimmer overlay rect rendered on top of the Recharts SVG */}
      {shimmer && (
        <svg
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          width="100%"
          height="100%"
        >
          <rect
            x="0" y="0" width="100%" height="100%"
            fill={`url(#${shimId})`}
            rx="2"
          />
        </svg>
      )}
    </div>
  )
}
