// ReconDesk — store utility functions (parsers, builders, calculators)
import type { Target, Port, AttackStage, PortState } from '../types/recondesk'

export function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ─── nmap XML parser ──────────────────────────────────────────────────────────

export function parseNmapXml(xml: string): { ports: Array<Omit<Port, 'id' | 'addedAt'>>; errors: string[] } {
  const errors: string[] = []
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'application/xml')
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      errors.push('Could not parse XML — ensure you\'re pasting nmap XML output with the -oX flag')
      return { ports: [], errors }
    }
    const portEls = doc.querySelectorAll('host ports port, ports port')
    if (portEls.length === 0) {
      errors.push('No port elements found — ensure you\'re pasting nmap XML output with the -oX flag')
      return { ports: [], errors }
    }
    const ports: Array<Omit<Port, 'id' | 'addedAt'>> = []
    portEls.forEach((portEl) => {
      try {
        const stateEl = portEl.querySelector('state')
        const state = stateEl?.getAttribute('state') as PortState | null
        if (!state || state !== 'open') return
        const portNum = parseInt(portEl.getAttribute('portid') ?? '0', 10)
        if (!portNum || portNum < 1 || portNum > 65535) return
        const protocol = (portEl.getAttribute('protocol') ?? 'tcp') as 'tcp' | 'udp'
        const serviceEl = portEl.querySelector('service')
        const serviceName = serviceEl?.getAttribute('name') ?? ''
        const product = serviceEl?.getAttribute('product') ?? ''
        const ver = serviceEl?.getAttribute('version') ?? ''
        const extraInfo = serviceEl?.getAttribute('extrainfo') ?? ''
        const versionStr = [product, ver, extraInfo].filter(Boolean).join(' ').trim()
        ports.push({ port: portNum, protocol, state: 'open', service: serviceName, version: versionStr, notes: '', source: 'nmap-import' })
      } catch { /* skip */ }
    })
    return { ports, errors }
  } catch (e) {
    errors.push('Parse error: ' + (e as Error).message)
    return { ports: [], errors }
  }
}

// ─── Markdown export ──────────────────────────────────────────────────────────

export function buildMarkdown(target: Target): string {
  const lines: string[] = []
  lines.push(`# Target: ${target.name}`)
  lines.push(`**IP:** ${target.ip} | **Platform:** ${target.platform} | **OS:** ${target.os || 'Unknown'}`)
  if (target.difficulty) lines.push(`**Difficulty:** ${target.difficulty}`)
  if (target.tags.length > 0) lines.push(`**Tags:** ${target.tags.join(', ')}`)
  lines.push('')
  const openPorts = target.ports.filter(p => p.state === 'open')
  lines.push('## Open Ports')
  if (openPorts.length === 0) {
    lines.push('No open ports recorded.')
  } else {
    lines.push('| Port | Protocol | Service | Version |')
    lines.push('|------|----------|---------|---------|')
    openPorts.forEach(p => {
      lines.push(`| ${p.port} | ${p.protocol} | ${p.service || '—'} | ${p.version || '—'} |`)
    })
  }
  lines.push('')
  lines.push('## Credentials')
  if (target.credentials.length === 0) {
    lines.push('No credentials captured.')
  } else {
    lines.push('| Username | Service | Port | Verified |')
    lines.push('|----------|---------|------|----------|')
    target.credentials.forEach(c => {
      lines.push(`| ${c.username || '—'} | ${c.service || '—'} | ${c.port ?? '—'} | ${c.verified ? 'Yes' : 'No'} |`)
    })
    lines.push('')
    lines.push('> Passwords and hashes omitted from Markdown export for security.')
  }
  lines.push('')
  const stages: AttackStage[] = ['recon', 'enum', 'exploit', 'post', 'privesc', 'loot']
  lines.push('## Attack Cards')
  const doneCards = target.attackCards.filter(c => c.status === 'done')
  if (doneCards.length === 0 && target.attackCards.length === 0) {
    lines.push('No attack cards recorded.')
  } else {
    lines.push('### Done')
    doneCards.forEach(c => {
      lines.push(`- ${c.title}`)
      if (c.description) lines.push(`  ${c.description}`)
    })
    lines.push('')
    stages.forEach(stage => {
      const stageCards = target.attackCards.filter(c => c.stage === stage && c.status !== 'done')
      if (stageCards.length === 0) return
      lines.push(`### ${stage.charAt(0).toUpperCase() + stage.slice(1)}`)
      stageCards.forEach(c => { lines.push(`- [${c.status}] ${c.title}`) })
    })
  }
  lines.push('')
  if (target.notes) {
    lines.push('## Notes')
    lines.push(target.notes)
    lines.push('')
  }
  return lines.join('\n')
}

// ─── Engagement HTML export ───────────────────────────────────────────────────

export function buildEngagementHtml(engName: string, targets: Target[]): string {
  const date = new Date().toLocaleDateString()
  const rows = targets.map(t => {
    const cards = t.attackCards.filter(c => c.status !== 'done').length
    return `<tr><td>${t.name}</td><td>${t.ip}</td><td>${t.platform}</td><td>${t.status}</td><td>${t.ports.filter(p => p.state === 'open').length}</td><td>${t.credentials.length}</td><td>${cards}</td></tr>`
  }).join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${engName} Report</title>
  <style>body{font-family:sans-serif;color:#1a1a2e;padding:32px}h1{color:#d29922}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px 12px;text-align:left}th{background:#f0f0f0}</style>
  </head><body><h1>Engagement Report: ${engName}</h1><p>Generated: ${date} — ${targets.length} targets</p>
  <table><tr><th>Target</th><th>IP</th><th>Platform</th><th>Status</th><th>Open Ports</th><th>Creds</th><th>Open Cards</th></tr>${rows}</table>
  </body></html>`
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchResult {
  type: 'target' | 'finding' | 'note'
  targetId: string
  targetName: string
  text: string
  matchField: string
}

export function searchTargets(targets: Target[], query: string): SearchResult[] {
  const q = query.toLowerCase().trim()
  const results: SearchResult[] = []
  const seen = new Set<string>()
  function push(r: SearchResult) {
    const key = `${r.targetId}-${r.matchField}-${r.text.slice(0, 40)}`
    if (!seen.has(key)) { seen.add(key); results.push(r) }
  }
  targets.forEach(target => {
    if (target.name.toLowerCase().includes(q) || target.ip.includes(q) || target.os?.toLowerCase().includes(q))
      push({ type: 'target', targetId: target.id, targetName: target.name, text: `${target.name} (${target.ip})`, matchField: 'name' })
    target.tags.forEach(tag => {
      if (tag.toLowerCase().includes(q)) push({ type: 'target', targetId: target.id, targetName: target.name, text: `Tag: ${tag}`, matchField: 'tag' })
    })
    target.attackCards.forEach(card => {
      const haystack = `${card.title} ${card.description} ${card.notes}`.toLowerCase()
      if (haystack.includes(q)) push({ type: 'finding', targetId: target.id, targetName: target.name, text: card.title, matchField: 'card' })
      card.subtasks?.forEach(st => {
        if (st.title.toLowerCase().includes(q)) push({ type: 'finding', targetId: target.id, targetName: target.name, text: `Subtask: ${st.title}`, matchField: 'subtask' })
      })
    })
    if (target.notes?.toLowerCase().includes(q))
      push({ type: 'note', targetId: target.id, targetName: target.name, text: target.notes.slice(0, 80), matchField: 'notes' })
    target.ports.forEach(p => {
      if (p.service?.toLowerCase().includes(q) || p.version?.toLowerCase().includes(q))
        push({ type: 'finding', targetId: target.id, targetName: target.name, text: `Port ${p.port}/${p.protocol} — ${p.service}`, matchField: 'port' })
    })
  })
  return results
}

// ─── Target normalizer (raw JSON → typed Target) ─────────────────────────────

export function normalizeTarget(t: any): Target {
  const now = new Date().toISOString()
  const validStatuses = ['active', 'completed', 'abandoned', 'paused']
  return {
    id: t.id,
    name: t.name,
    ip: t.ip,
    os: t.os || '',
    platform: t.platform || 'HTB',
    status: (validStatuses.includes(t.status) ? t.status : 'active') as Target['status'],
    tags: t.tags || [],
    notes: t.notes || '',
    difficulty: t.difficulty,
    createdAt: t.createdAt || now,
    completedAt: t.completedAt,
    dueDate: t.dueDate,
    engagementId: t.engagementId || 'default',
    enrichment: t.enrichment,
    geo: t.geo,
    checklist: t.checklist || [],
    screenshots: t.screenshots || [],
    linkedCredentialIds: t.linkedCredentialIds || [],
    wordlists: t.wordlists || [],
    ports: (t.ports || []).map((p: any) => ({
      id: p.id, port: p.port ?? p.number ?? 0, protocol: p.protocol || 'tcp',
      state: p.state || 'open', service: p.service || '', version: p.version || '',
      notes: p.notes || '', addedAt: p.addedAt || now, source: p.source || 'manual',
    })),
    credentials: (t.credentials || []).map((c: any) => ({
      id: c.id, username: c.username || '', password: c.password, hash: c.hash,
      hashType: c.hashType, service: c.service || '', port: c.port,
      notes: c.notes || '', source: c.source || '', verified: c.verified || false,
      addedAt: c.addedAt || now,
    })),
    attackCards: (t.attackCards || []).map((c: any) => ({
      id: c.id, title: c.title, description: c.description || c.notes || '',
      stage: c.stage, status: c.status, linkedPortIds: c.linkedPortIds || [],
      linkedCredentialIds: c.linkedCredentialIds || [], notes: c.notes || '',
      createdAt: c.createdAt, completedAt: c.completedAt, cvss: c.cvss,
      subtasks: (c.subtasks || []).map((s: any) => ({ id: s.id, title: s.title, done: s.done ?? false })),
    })),
    timeline: (t.timeline || []).map((e: any) => ({
      id: e.id, timestamp: e.timestamp, type: e.type || 'status_changed', description: e.description,
    })),
  }
}

// ─── Health score ─────────────────────────────────────────────────────────────

export function calcHealthScore(target: Target): number {
  let score = 50
  if (target.enrichment?.status === 'done') score += 20
  if (target.notes && target.notes.length > 10) score += 20
  const criticalOpen = target.attackCards.filter(c => c.status !== 'done' && c.notes?.toLowerCase().includes('critical')).length
  const highOpen = target.attackCards.filter(c => c.status !== 'done' && c.notes?.toLowerCase().includes('high')).length
  score -= criticalOpen * 10
  score -= highOpen * 5
  const checklistDone = target.checklist.filter(i => i.done).length
  if (target.checklist.length > 0 && checklistDone === target.checklist.length) score += 10
  return Math.max(0, Math.min(100, score))
}
