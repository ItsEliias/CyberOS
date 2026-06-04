import { ResponsiveContainer, AreaChart, Area } from 'recharts'

interface SparklineChartProps {
  data: number[]
  color?: string
  height?: number
  width?: number
}

export function SparklineChart({
  data,
  color = 'var(--accent)',
  height = 36,
  width = 80,
}: SparklineChartProps) {
  const points = data.map((v, i) => ({ i, v }))

  return (
    <div style={{ width, height, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={`sg-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0}   />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#sg-${color.replace(/[^a-z0-9]/gi, '')})`}
            dot={false}
            isAnimationActive
            animationDuration={600}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
