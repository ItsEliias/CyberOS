// Lightweight SVG sparkline — no recharts dependency required

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
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pad = 2

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2)
    const y = pad + ((1 - (v - min) / range) * (height - pad * 2))
    return `${x},${y}`
  })

  const polyline = pts.join(' ')
  const first = pts[0]
  const last  = pts[pts.length - 1]
  const area  = `M ${first} L ${polyline} L ${last.split(',')[0]},${height} L ${pad},${height} Z`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkfill)" />
      <polyline points={polyline} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
