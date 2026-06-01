import { useState } from 'react'
import { useStore } from '../store'
import type { Target, AttackCard } from '../../shared/types'

function buildMarkdown(target: Target, cards: AttackCard[]): string {
  const lines: string[] = []
  lines.push(`# Target: ${target.name} (${target.ip})`)
  lines.push(`**Platform:** ${target.platform}  **Status:** ${target.status}${target.os ? `  **OS:** ${target.os}` : ''}`)
  lines.push('')

  // Ports
  lines.push('## Ports')
  if (target.ports.length === 0) {
    lines.push('No ports recorded.')
  } else {
    lines.push('| Port | Protocol | State | Service | Version |')
    lines.push('|------|----------|-------|---------|---------|')
    target.ports.forEach(p => {
      lines.push(`| ${p.number} | ${p.protocol} | ${p.state} | ${p.service ?? '—'} | ${p.version ?? '—'} |`)
    })
  }
  lines.push('')

  // Credentials
  lines.push('## Credentials Found')
  if (target.credentials.length === 0) {
    lines.push('No credentials captured.')
  } else {
    lines.push('| Type | Username | Value | Service |')
    lines.push('|------|----------|-------|---------|')
    target.credentials.forEach(c => {
      const val = c.password ?? c.hash ?? '—'
      lines.push(`| ${c.type} | ${c.username ?? '—'} | ${val} | ${c.service ?? '—'} |`)
    })
  }
  lines.push('')

  // Attack Summary
  lines.push('## Attack Summary')
  const stages = ['recon', 'enum', 'exploit', 'post', 'privesc', 'loot'] as const
  stages.forEach(stage => {
    const stageCards = cards.filter(c => c.stage === stage)
    if (stageCards.length === 0) return
    lines.push(`\n### ${stage.charAt(0).toUpperCase() + stage.slice(1)}`)
    stageCards.forEach(c => {
      lines.push(`- [${c.status}] **${c.title}**${c.command ? `\n  \`${c.command}\`` : ''}${c.notes ? `\n  ${c.notes}` : ''}`)
    })
  })
  lines.push('')

  // Timeline
  lines.push('## Timeline')
  const events = [...(target.timeline ?? [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  if (events.length === 0) {
    lines.push('No events recorded.')
  } else {
    events.forEach(ev => {
      const ts = new Date(ev.timestamp).toLocaleString()
      lines.push(`- \`${ts}\` [${ev.type}] ${ev.description}`)
    })
  }

  return lines.join('\n')
}

export default function ExportButton({ targetId }: { targetId: string }) {
  const targets = useStore(s => s.targets)
  const cards   = useStore(s => s.cards)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<'ok' | 'err' | null>(null)

  const target = targets.find(t => t.id === targetId)
  if (!target) return null

  async function handleExport() {
    if (!target) return
    setBusy(true)

    const targetCards = cards.filter(c => c.targetId === target.id)
    const payload = {
      target,
      ports:       target.ports,
      credentials: target.credentials,
      attackCards: targetCards,
      timeline:    target.timeline ?? [],
    }

    const json = JSON.stringify(payload, null, 2)
    const md   = buildMarkdown(target, targetCards)
    const safeName = target.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()

    try {
      const result = await window.electronAPI.exportTarget({
        json,
        md,
        defaultName: `recondesk_${safeName}.json`,
      })
      setFlash(result.ok ? 'ok' : 'err')
    } catch {
      setFlash('err')
    } finally {
      setBusy(false)
      setTimeout(() => setFlash(null), 2000)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={busy}
      className={`px-3 py-1 text-xs rounded border transition-colors disabled:opacity-50 ${
        flash === 'ok'  ? 'border-success/40 text-success bg-success/10' :
        flash === 'err' ? 'border-error/40 text-error bg-error/10' :
        'border-border text-muted hover:text-text hover:border-accent/40 hover:bg-accent/5'
      }`}
    >
      {flash === 'ok' ? 'Exported' : flash === 'err' ? 'Error' : busy ? 'Exporting...' : 'Export'}
    </button>
  )
}
