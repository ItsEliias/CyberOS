// Inline the theme here so the TerminalLink build doesn't need to traverse
// outside the app's src root. Keep in sync with /design-system/chart-theme.ts.

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
