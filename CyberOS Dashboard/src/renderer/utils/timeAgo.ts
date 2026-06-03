// CyberOS Dashboard — Time Ago Utility

export function timeAgo(iso: string | undefined | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return 'just now'
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatUTC(iso: string): string {
  const d = new Date(iso)
  return d.toUTCString().slice(17, 25) + ' UTC'
}

export function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().slice(0, 10)
  return dateStr.slice(0, 10) === today
}

export function isYesterday(dateStr: string): boolean {
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  return dateStr.slice(0, 10) === yesterday
}

export function getStreakStatus(lastActiveDate: string | undefined): 'active' | 'at_risk' | 'broken' {
  if (!lastActiveDate) return 'broken'
  if (isToday(lastActiveDate)) return 'active'
  if (isYesterday(lastActiveDate)) return 'at_risk'
  return 'broken'
}
