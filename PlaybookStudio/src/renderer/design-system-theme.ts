// Inline design system theme for PlaybookStudio — teal accent variant

export const chartColors = {
  accent:   '#2dd4bf',
  critical: '#f85149',
  high:     '#ff8c42',
  medium:   '#d29922',
  low:      '#4a9eff',
  info:     '#8b949e',
  success:  '#3fb950',
  purple:   '#b44fff',
  teal:     '#2dd4bf',
} as const

export const chartPalette: string[] = [
  chartColors.accent,
  chartColors.success,
  chartColors.medium,
  chartColors.critical,
  chartColors.purple,
  chartColors.teal,
  chartColors.low,
  chartColors.high,
]

export const severityPalette: string[] = [
  chartColors.critical, chartColors.high, chartColors.medium,
  chartColors.low, chartColors.info,
]

export const rechartsTheme = {
  cartesianGrid: { stroke: 'rgba(42,51,71,0.25)', strokeDasharray: '4 4', vertical: false },
  xAxis: {
    stroke: 'rgba(42,51,71,0.45)',
    tick: { fill: '#484f58', fontFamily: 'var(--font-mono)', fontSize: 11 },
    axisLine: { stroke: 'rgba(42,51,71,0.4)' },
    tickLine: false,
  },
  yAxis: {
    stroke: 'transparent',
    tick: { fill: '#484f58', fontFamily: 'var(--font-mono)', fontSize: 11 },
    axisLine: false,
    tickLine: false,
    width: 36,
  },
  tooltip: {
    contentStyle: {
      background: 'rgba(13,14,24,0.94)',
      border: '1px solid rgba(42,51,71,0.75)',
      borderRadius: '8px',
      backdropFilter: 'blur(16px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      color: '#e6edf3',
      padding: '8px 12px',
    },
    labelStyle: { color: '#8b949e', fontFamily: 'var(--font-display)', fontSize: '11px', marginBottom: '4px' },
    cursor: { stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 },
  },
} as const
