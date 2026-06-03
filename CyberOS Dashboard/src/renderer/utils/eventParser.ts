// CyberOS Dashboard — Event Parser Utility
// Handles both new schema (app/event) and legacy schema (appName/eventType)

import type { EcosystemEvent } from '../types/ecosystem'

interface NormalizedEvent {
  id: string
  timestamp: string
  app: string
  event: string
  data: Record<string, unknown>
}

export function normalizeEvent(raw: EcosystemEvent): NormalizedEvent {
  return {
    id: raw.id,
    timestamp: raw.timestamp,
    app: raw.app ?? raw.appName ?? 'Unknown',
    event: raw.event ?? raw.eventType ?? 'unknown',
    data: raw.data ?? {},
  }
}

export function normalizeEvents(events: EcosystemEvent[]): NormalizedEvent[] {
  return events.map(normalizeEvent)
}

export function humanizeEventType(eventType: string): string {
  const mappings: Record<string, string> = {
    'session:started': 'Started session',
    'session:ended': 'Ended session',
    'session:saved': 'Saved session',
    'target:added': 'Added target',
    'target:removed': 'Removed target',
    'note:saved': 'Saved note',
    'note:created': 'Created note',
    'vault:unlocked': 'Unlocked vault',
    'vault:locked': 'Locked vault',
    'credential:added': 'Added credential',
    'credential:search': 'Searched credentials',
    'playbook:started': 'Started playbook',
    'playbook:completed': 'Completed playbook',
    'report:generated': 'Generated report',
    'report:exported': 'Exported report',
    'scrape:started': 'Started scrape',
    'scrape:completed': 'Completed scrape',
    'signal:received': 'Received signal',
    'graph:imported': 'Imported graph',
    'command:executed': 'Executed command',
    'dashboard:launched': 'Dashboard launched',
    'dashboard:closed': 'Dashboard closed',
    'lab:started': 'Started lab',
    'lab:completed': 'Completed lab',
    'lab:end': 'Ended lab',
    'flag:captured': 'Captured flag',
    'config:updated': 'Config updated',
  }

  return mappings[eventType] ?? eventType.replace(/[_:]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getAppAccentColor(appName: string): string {
  const colorMap: Record<string, string> = {
    'CyberLab': '#b44fff',
    'Cyberlab': '#b44fff',
    'CyberLab Companion': '#b44fff',
    'ReconDesk': '#d29922',
    'GhostVault': '#7bb8ff',
    'VaultCore': '#3fb950',
    'VaultScraper': '#3fb950',
    'SignalBoard': '#ff6b6b',
    'CredVault': '#f78166',
    'PlaybookStudio': '#4a9eff',
    'ReportForge': '#3fb950',
    'TerminalLink': '#00ff41',
    'NetworkMap': '#d29922',
    'CyberOS': '#b44fff',
    'Launcher': '#b44fff',
    'Dashboard': '#4a9eff',
    'AgenticOS': '#ff9500',
  }

  return colorMap[appName] ?? '#4a9eff'
}

export function filterEvents(
  events: NormalizedEvent[],
  filter: { app?: string | null; search?: string; dateRange?: [string, string] }
): NormalizedEvent[] {
  let filtered = events

  if (filter.app) {
    filtered = filtered.filter((e) => e.app.toLowerCase() === filter.app!.toLowerCase())
  }

  if (filter.search) {
    const q = filter.search.toLowerCase()
    filtered = filtered.filter(
      (e) =>
        e.app.toLowerCase().includes(q) ||
        e.event.toLowerCase().includes(q) ||
        JSON.stringify(e.data).toLowerCase().includes(q)
    )
  }

  if (filter.dateRange) {
    const [start, end] = filter.dateRange
    filtered = filtered.filter((e) => e.timestamp >= start && e.timestamp <= end)
  }

  return filtered
}
