/**
 * CyberOS Shared Chart Theme
 * Consumed by Recharts, ECharts, and any custom viz.
 * Import chartTheme / chartColors in any component that renders charts.
 */

export const chartColors = {
  accent:   'var(--accent)',
  critical: '#f85149',
  high:     '#ff8c42',
  medium:   '#d29922',
  low:      '#4a9eff',
  info:     '#8b949e',
  success:  '#3fb950',
  purple:   '#b44fff',
  teal:     '#2dd4bf',
  pink:     '#ff6b9d',
} as const

/** Ordered series palette — accent first, then severity ramp */
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

/** Severity-ordered palette for donuts / stacked bars */
export const severityPalette: string[] = [
  chartColors.critical,
  chartColors.high,
  chartColors.medium,
  chartColors.low,
  chartColors.info,
]

/** Recharts common props — spread onto CartesianGrid, XAxis, YAxis, Tooltip */
export const rechartsTheme = {
  cartesianGrid: {
    stroke: 'rgba(42, 51, 71, 0.25)',
    strokeDasharray: '4 4',
    vertical: false,
  },
  xAxis: {
    stroke: 'rgba(42, 51, 71, 0.45)',
    tick: { fill: '#484f58', fontFamily: 'var(--font-mono)', fontSize: 11 },
    axisLine: { stroke: 'rgba(42, 51, 71, 0.4)' },
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
      background: 'rgba(13, 14, 24, 0.94)',
      border: '1px solid rgba(42, 51, 71, 0.75)',
      borderRadius: '8px',
      backdropFilter: 'blur(16px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      color: '#e6edf3',
      padding: '8px 12px',
    },
    labelStyle: {
      color: '#8b949e',
      fontFamily: 'var(--font-display)',
      fontSize: '11px',
      marginBottom: '4px',
    },
    cursor: { stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 },
  },
  legend: {
    wrapperStyle: {
      fontFamily: 'var(--font-display)',
      fontSize: '11px',
      color: '#8b949e',
      paddingTop: '8px',
    },
  },
} as const

/** ECharts base theme option — merge into your option object */
export const echartsTheme = {
  backgroundColor: 'transparent',
  textStyle: { fontFamily: 'var(--font-display)', color: '#8b949e', fontSize: 12 },
  title: { textStyle: { color: '#e6edf3', fontFamily: 'var(--font-display)', fontWeight: 600 } },
  legend: {
    textStyle: { color: '#8b949e', fontFamily: 'var(--font-display)', fontSize: 11 },
    itemStyle: { borderWidth: 0 },
  },
  grid: { borderColor: 'transparent' },
  categoryAxis: {
    axisLine: { lineStyle: { color: 'rgba(42,51,71,0.45)' } },
    axisTick: { show: false },
    axisLabel: { color: '#484f58', fontFamily: 'var(--font-mono)', fontSize: 11 },
    splitLine: { lineStyle: { color: 'rgba(42,51,71,0.2)', type: 'dashed' } },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#484f58', fontFamily: 'var(--font-mono)', fontSize: 11 },
    splitLine: { lineStyle: { color: 'rgba(42,51,71,0.2)', type: 'dashed' } },
  },
  tooltip: {
    backgroundColor: 'rgba(13,14,24,0.94)',
    borderColor: 'rgba(42,51,71,0.75)',
    borderWidth: 1,
    textStyle: { color: '#e6edf3', fontFamily: 'var(--font-mono)', fontSize: 12 },
    extraCssText: 'backdrop-filter:blur(16px);border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.55)',
  },
  color: chartPalette,
} as const
