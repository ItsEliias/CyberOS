// SkillRadar — SVG radar chart for operator skill levels
// ItsEliias // CyberOS

const SKILLS = [
  { key: 'web',             label: 'Web' },
  { key: 'network',         label: 'Network' },
  { key: 'activeDirectory', label: 'Active Dir' },
  { key: 'linux',           label: 'Linux' },
  { key: 'windows',         label: 'Windows' },
  { key: 'crypto',          label: 'Crypto' },
  { key: 'forensics',       label: 'Forensics' },
]

const SIZE       = 220
const CX         = SIZE / 2
const CY         = SIZE / 2
const RADIUS     = 80
const LABEL_GAP  = 16
const RINGS      = 5

interface SkillRadarProps {
  skills: Record<string, number>
}

function polarToCart(angleDeg: number, r: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

export default function SkillRadar({ skills }: SkillRadarProps) {
  const n         = SKILLS.length
  const angleStep = 360 / n

  // Normalise: max observed score or 50, whichever is higher
  const maxScore  = Math.max(50, ...SKILLS.map(s => skills[s.key] ?? 0))

  // Build radar polygon points
  const dataPoints = SKILLS.map((s, i) => {
    const val  = Math.min(skills[s.key] ?? 0, maxScore)
    const norm = val / maxScore
    const r    = norm * RADIUS
    return polarToCart(i * angleStep, r)
  })

  const polygonPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ' Z'

  // Axis lines + ring points
  const axes = SKILLS.map((_, i) => {
    const tip = polarToCart(i * angleStep, RADIUS)
    return { x2: tip.x, y2: tip.y }
  })

  const rings = Array.from({ length: RINGS }, (_, ri) => {
    const r = ((ri + 1) / RINGS) * RADIUS
    return SKILLS.map((_, i) => polarToCart(i * angleStep, r))
  })

  // Labels — pushed further out than tip
  const labels = SKILLS.map((s, i) => {
    const pt    = polarToCart(i * angleStep, RADIUS + LABEL_GAP)
    const angle = i * angleStep
    // left half → end, right half → start, top/bottom → middle
    const ta: 'middle' | 'end' | 'start' =
      angle < 15 || angle > 345   ? 'middle' :
      angle >= 15 && angle <= 165 ? 'end'    :
      angle >= 195 && angle <= 345 ? 'start'  :
      'middle'
    const score = skills[s.key] ?? 0
    return { x: pt.x, y: pt.y, label: s.label, anchor: ta, score }
  })

  const scores = SKILLS.map(s => skills[s.key] ?? 0)

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-label="Skill radar chart"
    >
      {/* Concentric rings */}
      {rings.map((pts, ri) => (
        <polygon
          key={ri}
          points={pts.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')}
          fill="none"
          stroke="var(--border)"
          strokeWidth="0.8"
          opacity="0.6"
        />
      ))}

      {/* Axis spokes */}
      {axes.map((ax, i) => (
        <line
          key={i}
          x1={CX} y1={CY}
          x2={ax.x2.toFixed(2)} y2={ax.y2.toFixed(2)}
          stroke="var(--border)"
          strokeWidth="0.8"
          opacity="0.5"
        />
      ))}

      {/* Data polygon fill */}
      <path
        d={polygonPath}
        fill="var(--accent)"
        fillOpacity="0.25"
        stroke="none"
      />

      {/* Data polygon stroke */}
      <path
        d={polygonPath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Data point dots */}
      {dataPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x.toFixed(2)}
          cy={p.y.toFixed(2)}
          r="2.5"
          fill="var(--accent)"
        >
          <title>{SKILLS[i].label}: {scores[i]}</title>
        </circle>
      ))}

      {/* Axis labels */}
      {labels.map((lb, i) => (
        <text
          key={i}
          x={lb.x.toFixed(2)}
          y={lb.y.toFixed(2)}
          textAnchor={lb.anchor}
          dominantBaseline="middle"
          fontSize="8"
          fill="var(--text-dim)"
          letterSpacing="0.04em"
        >
          {lb.label}
          <title>{lb.label}: {lb.score}</title>
        </text>
      ))}

      {/* Centre dot */}
      <circle cx={CX} cy={CY} r="2" fill="var(--border)" />
    </svg>
  )
}
