// CyberOS Dashboard — Skill Radar Component
// SVG spider/radar chart with 7 axes, animated draw from center

import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface SkillRadarProps {
  skills: Record<string, number>
  size?: number
  showLabels?: boolean
  historicalSkills?: Record<string, number>
}

const SKILL_KEYS = ['web', 'network', 'activeDirectory', 'linux', 'windows', 'crypto', 'forensics']
const SKILL_LABELS = ['Web', 'Network', 'AD', 'Linux', 'Windows', 'Crypto', 'Forensics']
const MAX_VALUE = 100

export default function SkillRadar({ skills, size = 180, showLabels = true, historicalSkills }: SkillRadarProps) {
  const center = size / 2
  const radius = (size / 2) - (showLabels ? 30 : 10)
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

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1]

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Grid rings */}
      {rings.map((scale) => (
        <polygon
          key={scale}
          points={SKILL_KEYS.map((_, i) => {
            const [x, y] = getPoint(i, MAX_VALUE * scale)
            return `${x},${y}`
          }).join(' ')}
          fill="none"
          stroke="rgba(42, 51, 71, 0.5)"
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
            stroke="rgba(42, 51, 71, 0.4)"
            strokeWidth="0.5"
          />
        )
      })}

      {/* Historical polygon (faint) */}
      {historicalPoints && (
        <polygon
          points={historicalPoints}
          fill="rgba(74, 158, 255, 0.05)"
          stroke="rgba(74, 158, 255, 0.2)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      )}

      {/* Data polygon */}
      <motion.polygon
        points={polygonPoints}
        fill="rgba(74, 158, 255, 0.15)"
        stroke="#4a9eff"
        strokeWidth="1.5"
        style={{ filter: 'drop-shadow(0 0 4px rgba(74, 158, 255, 0.6))' }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        transform-origin={`${center} ${center}`}
      />

      {/* Data points */}
      {SKILL_KEYS.map((key, i) => {
        const val = skills[key] ?? 0
        const [x, y] = getPoint(i, val)
        return (
          <motion.circle
            key={key}
            cx={x}
            cy={y}
            r="3"
            fill="#4a9eff"
            stroke="#0a0a0f"
            strokeWidth="1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 + i * 0.05, duration: 0.2 }}
          >
            <title>{`${SKILL_LABELS[i]}: ${val}`}</title>
          </motion.circle>
        )
      })}

      {/* Labels */}
      {showLabels &&
        SKILL_KEYS.map((_, i) => {
          const [x, y] = getPoint(i, MAX_VALUE + 16)
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-text-secondary text-[9px] font-medium"
            >
              {SKILL_LABELS[i]}
            </text>
          )
        })}
    </svg>
  )
}
