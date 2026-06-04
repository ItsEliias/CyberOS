// CyberOS Dashboard — Skill Radar Component
// SVG spider/radar chart with 7 axes, animated draw from center
// Fix #2: fillColor/strokeColor props, labels text-xs font-mono text-secondary

import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface SkillRadarProps {
  skills: Record<string, number>
  size?: number
  showLabels?: boolean
  historicalSkills?: Record<string, number>
  fillColor?: string
  strokeColor?: string
}

const SKILL_KEYS = ['web', 'network', 'activeDirectory', 'linux', 'windows', 'crypto', 'forensics']
const SKILL_LABELS = ['Web', 'Network', 'AD', 'Linux', 'Windows', 'Crypto', 'Forensics']
const MAX_VALUE = 100

export default function SkillRadar({
  skills,
  size = 280,
  showLabels = true,
  historicalSkills,
  fillColor = 'rgba(74, 158, 255, 0.15)',
  strokeColor = '#4a9eff',
}: SkillRadarProps) {
  const center = size / 2
  const radius = (size / 2) - (showLabels ? 38 : 12)
  const angleStep = (2 * Math.PI) / SKILL_KEYS.length

  const getPoint = (index: number, value: number): [number, number] => {
    const angle = angleStep * index - Math.PI / 2
    const r = (value / MAX_VALUE) * radius
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)]
  }

  const polygonPoints = useMemo(() => {
    return SKILL_KEYS.map((key, i) => {
      const val = skills[key] ?? 0
      const [x, y] = getPoint(i, val)
      return `${x},${y}`
    }).join(' ')
  }, [skills, radius, center])

  const historicalPoints = useMemo(() => {
    if (!historicalSkills) return null
    return SKILL_KEYS.map((key, i) => {
      const val = historicalSkills[key] ?? 0
      const [x, y] = getPoint(i, val)
      return `${x},${y}`
    }).join(' ')
  }, [historicalSkills, radius, center])

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1]

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <defs>
        <filter id="radarGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid rings */}
      {rings.map((scale) => (
        <polygon
          key={scale}
          points={SKILL_KEYS.map((_, i) => {
            const [x, y] = getPoint(i, MAX_VALUE * scale)
            return `${x},${y}`
          }).join(' ')}
          fill="none"
          stroke="rgba(42, 51, 71, 0.4)"
          strokeWidth="0.5"
        />
      ))}

      {/* Axis lines */}
      {SKILL_KEYS.map((_, i) => {
        const [x, y] = getPoint(i, MAX_VALUE)
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            stroke="rgba(42, 51, 71, 0.3)"
            strokeWidth="0.5"
          />
        )
      })}

      {/* Historical polygon (faint) */}
      {historicalPoints && (
        <polygon
          points={historicalPoints}
          fill="rgba(74, 158, 255, 0.03)"
          stroke="rgba(74, 158, 255, 0.15)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      )}

      {/* Data polygon — configurable fill/stroke with glow */}
      <motion.polygon
        points={polygonPoints}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2"
        filter="url(#radarGlow)"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ transformOrigin: `${center}px ${center}px` }}
      />

      {/* Data points with glow */}
      {SKILL_KEYS.map((key, i) => {
        const val = skills[key] ?? 0
        const [x, y] = getPoint(i, val)
        return (
          <motion.circle
            key={key}
            cx={x}
            cy={y}
            r="3.5"
            fill={strokeColor}
            stroke="#0a0a0f"
            strokeWidth="1.5"
            filter="url(#radarGlow)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 + i * 0.05, duration: 0.2 }}
          >
            <title>{`${SKILL_LABELS[i]}: ${val}`}</title>
          </motion.circle>
        )
      })}

      {/* Labels — quadrant-aware textAnchor so text doesn't clip at edges */}
      {showLabels &&
        SKILL_KEYS.map((key, i) => {
          const labelRadius = MAX_VALUE + 22
          const [x, y] = getPoint(i, labelRadius)
          const val = skills[key] ?? 0

          // Compute the angle for this spoke (same as getPoint)
          const angle = angleStep * i - Math.PI / 2
          // Normalise to [0, 2π)
          const a = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

          // textAnchor: spokes pointing right → start, left → end, top/bottom → middle
          let anchor: 'start' | 'middle' | 'end' = 'middle'
          if (a > Math.PI * 0.15 && a < Math.PI * 0.85)       anchor = 'start'
          else if (a > Math.PI * 1.15 && a < Math.PI * 1.85)  anchor = 'end'

          // dominantBaseline: spokes pointing down → hanging, up → auto, sides → middle
          let baseline: string = 'middle'
          if (a > Math.PI * 0.35 && a < Math.PI * 0.65)       baseline = 'hanging'
          else if (a > Math.PI * 1.35 && a < Math.PI * 1.65)  baseline = 'auto'

          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline={baseline}
              style={{
                fontSize: '10px',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 400,
                fill: '#8b949e',
              }}
            >
              {SKILL_LABELS[i]}
              <tspan style={{ fontSize: '9px', fill: '#6e7681' }}> {val}</tspan>
            </text>
          )
        })}
    </svg>
  )
}
