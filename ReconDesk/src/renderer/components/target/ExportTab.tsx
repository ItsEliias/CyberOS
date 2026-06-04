import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRecondeskStore } from '../../stores/useRecondeskStore'
import type { AttackStage, Target } from '../../types/recondesk'

const STAGES: AttackStage[] = ['recon', 'enum', 'exploit', 'post', 'privesc', 'loot']

function buildMarkdown(target: Target): string {
  if (!target) return ''
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
    lines.push('> Passwords and hashes omitted for security.')
  }
  lines.push('')

  lines.push('## Attack Cards')
  const doneCards = target.attackCards.filter(c => c.status === 'done')
  if (doneCards.length === 0 && target.attackCards.length === 0) {
    lines.push('No attack cards recorded.')
  } else {
    lines.push('### Done')
    if (doneCards.length === 0) {
      lines.push('None.')
    } else {
      doneCards.forEach(c => {
        lines.push(`- ${c.title}`)
        if (c.description) lines.push(`  ${c.description}`)
      })
    }
    lines.push('')
    STAGES.forEach(stage => {
      const sc = target.attackCards.filter(c => c.stage === stage && c.status !== 'done')
      if (sc.length === 0) return
      lines.push(`### ${stage.charAt(0).toUpperCase() + stage.slice(1)}`)
      sc.forEach(c => {
        lines.push(`- [${c.status}] ${c.title}`)
      })
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

export default function ExportTab({ targetId }: { targetId: string }) {
  const targets              = useRecondeskStore(s => s.targets)
  const exportTargetJSON     = useRecondeskStore(s => s.exportTargetJSON)
  const exportTargetMarkdown = useRecondeskStore(s => s.exportTargetMarkdown)
  const emitEvent            = useRecondeskStore(s => s.emitEvent)
  const showToast            = useRecondeskStore(s => s.showToast)

  const [exportingJson, setExportingJson] = useState(false)
  const [exportingMd,   setExportingMd]   = useState(false)
  const [exportingPdf,  setExportingPdf]  = useState(false)
  const [sentToForge,   setSentToForge]   = useState(false)
  const [preview,       setPreview]       = useState<'json' | 'md' | null>(null)

  const target = targets.find(t => t.id === targetId)
  if (!target) return null

  async function handleExportJSON() {
    setExportingJson(true)
    try {
      await exportTargetJSON(targetId)
      await emitEvent('target:exported', { format: 'json', name: target!.name })
    } finally {
      setExportingJson(false)
    }
  }

  async function handleExportMarkdown() {
    setExportingMd(true)
    try {
      await exportTargetMarkdown(targetId)
      await emitEvent('target:exported', { format: 'markdown', name: target!.name })
    } finally {
      setExportingMd(false)
    }
  }

  async function handleExportPdf() {
    if (!target) return
    setExportingPdf(true)
    try {
      const md = buildMarkdown(target)
      const openPorts = target.ports.filter(p => p.state === 'open')
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${target.name} Report</title>
<style>
body{font-family:sans-serif;color:#111;padding:32px;max-width:900px;margin:0 auto}
h1{color:#1a1a2e;border-bottom:2px solid #d29922;padding-bottom:8px}
h2{color:#333;margin-top:24px}
table{border-collapse:collapse;width:100%;margin:8px 0}
th,td{border:1px solid #ddd;padding:6px 10px;text-align:left;font-size:13px}
th{background:#f5f5f5;font-weight:600}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
.open{background:#dcfce7;color:#166534}
.done{background:#dbeafe;color:#1e40af}
pre{background:#f8f8f8;padding:12px;border-radius:6px;font-size:12px;overflow-x:auto}
</style></head><body>
<h1>${target.name}</h1>
<p><strong>IP:</strong> ${target.ip} &nbsp;|&nbsp; <strong>Platform:</strong> ${target.platform} &nbsp;|&nbsp; <strong>OS:</strong> ${target.os || 'Unknown'} &nbsp;|&nbsp; <strong>Status:</strong> ${target.status}</p>
${target.geo?.status === 'done' ? `<p><strong>Location:</strong> ${target.geo.flag} ${target.geo.city}, ${target.geo.country}</p>` : ''}
<h2>Open Ports (${openPorts.length})</h2>
${openPorts.length === 0 ? '<p>No open ports recorded.</p>' : `<table><tr><th>Port</th><th>Protocol</th><th>Service</th><th>Version</th></tr>${openPorts.map(p => `<tr><td>${p.port}</td><td>${p.protocol}</td><td>${p.service || '—'}</td><td>${p.version || '—'}</td></tr>`).join('')}</table>`}
<h2>Attack Cards</h2>
<table><tr><th>Title</th><th>Stage</th><th>Status</th></tr>${target.attackCards.map(c => `<tr><td>${c.title}</td><td>${c.stage}</td><td><span class="badge ${c.status === 'done' ? 'done' : 'open'}">${c.status}</span></td></tr>`).join('')}</table>
<h2>Timeline (${target.timeline.length} entries)</h2>
<table><tr><th>Time</th><th>Type</th><th>Description</th></tr>${target.timeline.slice().reverse().slice(0, 30).map(e => `<tr><td>${new Date(e.timestamp).toLocaleString()}</td><td>${e.type}</td><td>${e.description}</td></tr>`).join('')}</table>
${target.notes ? `<h2>Notes</h2><pre>${target.notes}</pre>` : ''}
<p style="color:#888;font-size:11px;margin-top:32px">Generated by ReconDesk — ${new Date().toLocaleString()}</p>
</body></html>`
      const result = await (window.electronAPI as any).exportPdf?.({ html, defaultName: `${target.name.replace(/[^a-z0-9]/gi, '_')}-report.pdf` })
      if (result?.ok) showToast('PDF exported', 'success')
      else showToast('PDF export cancelled', 'info')
    } catch { showToast('PDF export failed', 'error') }
    finally { setExportingPdf(false) }
  }

  async function handleSendToReportForge() {
    // Write target data to config for ReportForge to pick up
    const payload = {
      targetName: target.name,
      targetIP:   target.ip,
      markdown:   buildMarkdown(target),
      json:       JSON.stringify(target, null, 2),
      sentAt:     new Date().toISOString(),
    }
    await emitEvent('recondesk:send-to-reportforge', payload)
    setSentToForge(true)
    setTimeout(() => setSentToForge(false), 3000)
  }

  const mdPreview  = buildMarkdown(target)
  const jsonPreview = JSON.stringify(target, null, 2)

  const statGroups = [
    { label: 'Open Ports',    value: target.ports.filter(p => p.state === 'open').length,    color: '#4a9eff' },
    { label: 'All Ports',     value: target.ports.length,                                     color: '#4a5568' },
    { label: 'Credentials',   value: target.credentials.length,                               color: '#f85149' },
    { label: 'Attack Cards',  value: target.attackCards.length,                               color: '#d29922' },
    { label: 'Cards Done',    value: target.attackCards.filter(c => c.status === 'done').length, color: '#3fb950' },
    { label: 'Timeline Entries', value: target.timeline.length,                              color: '#8b949e' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-2xl flex flex-col gap-5">
        {/* Target summary */}
        <div className="bg-[#12131a] border border-[#2a3347] rounded-lg p-4">
          <p className="text-[10px] text-[#4a5568] uppercase tracking-widest mb-3">Export Summary</p>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base font-bold text-[#e2e8f0]">{target.name}</span>
            <span className="font-mono text-xs text-[#d29922]/70">{target.ip}</span>
            <span className="text-xs text-[#8b949e]">· {target.platform} · {target.os}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {statGroups.map(s => (
              <div key={s.label} className="flex flex-col">
                <span className="text-xl font-bold tabular-nums" style={{ color: s.color }}>
                  {s.value}
                </span>
                <span className="text-[10px] text-[#4a5568]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Export actions */}
        <div className="bg-[#12131a] border border-[#2a3347] rounded-lg p-4">
          <p className="text-[10px] text-[#4a5568] uppercase tracking-widest mb-4">Export Options</p>

          <div className="flex flex-col gap-3">
            {/* JSON */}
            <div className="flex items-center justify-between p-3 bg-[#0d0d14] rounded-lg border border-[#2a3347]">
              <div>
                <p className="text-xs font-medium text-[#e2e8f0]">JSON Export</p>
                <p className="text-[10px] text-[#4a5568] mt-0.5">
                  Full structured data — ports, credentials, attack cards, timeline
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreview(preview === 'json' ? null : 'json')}
                  className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                    preview === 'json'
                      ? 'bg-[#2a3347]/70 border-[#2a3347] text-[#8b949e]'
                      : 'border-[#2a3347] text-[#4a5568] hover:text-[#8b949e]'
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={handleExportJSON}
                  disabled={exportingJson}
                  className="px-3 py-1.5 text-xs bg-[#4a9eff]/10 border border-[#4a9eff]/25 text-[#4a9eff] rounded hover:bg-[#4a9eff]/20 transition-colors disabled:opacity-40"
                >
                  {exportingJson ? 'Saving…' : 'Save JSON'}
                </button>
              </div>
            </div>

            {/* Markdown */}
            <div className="flex items-center justify-between p-3 bg-[#0d0d14] rounded-lg border border-[#2a3347]">
              <div>
                <p className="text-xs font-medium text-[#e2e8f0]">Markdown Export</p>
                <p className="text-[10px] text-[#4a5568] mt-0.5">
                  Structured report — ports, credentials (no passwords), cards, notes
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreview(preview === 'md' ? null : 'md')}
                  className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                    preview === 'md'
                      ? 'bg-[#2a3347]/70 border-[#2a3347] text-[#8b949e]'
                      : 'border-[#2a3347] text-[#4a5568] hover:text-[#8b949e]'
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={handleExportMarkdown}
                  disabled={exportingMd}
                  className="px-3 py-1.5 text-xs bg-[#d29922]/10 border border-[#d29922]/25 text-[#d29922] rounded hover:bg-[#d29922]/20 transition-colors disabled:opacity-40"
                >
                  {exportingMd ? 'Saving…' : 'Save Markdown'}
                </button>
              </div>
            </div>

            {/* PDF */}
            <div className="flex items-center justify-between p-3 bg-[#0d0d14] rounded-lg border border-[#2a3347]">
              <div>
                <p className="text-xs font-medium text-[#e2e8f0]">PDF Report</p>
                <p className="text-[10px] text-[#4a5568] mt-0.5">
                  Print-ready PDF — summary, ports, attack cards, timeline
                </p>
              </div>
              <button
                onClick={handleExportPdf}
                disabled={exportingPdf}
                className="px-3 py-1.5 text-xs bg-[#b44fff]/10 border border-[#b44fff]/25 text-[#b44fff] rounded hover:bg-[#b44fff]/20 transition-colors disabled:opacity-40"
              >
                {exportingPdf ? 'Generating…' : 'Export PDF'}
              </button>
            </div>

            {/* ReportForge */}
            <div className="flex items-center justify-between p-3 bg-[#0d0d14] rounded-lg border border-[#2a3347]">
              <div>
                <p className="text-xs font-medium text-[#e2e8f0]">Send to ReportForge</p>
                <p className="text-[10px] text-[#4a5568] mt-0.5">
                  Signals ReportForge to import this target's Markdown report
                </p>
              </div>
              <button
                onClick={handleSendToReportForge}
                className={`px-3 py-1.5 text-xs border rounded transition-colors ${
                  sentToForge
                    ? 'bg-[#3fb950]/15 border-[#3fb950]/30 text-[#3fb950]'
                    : 'bg-[#3fb950]/10 border-[#3fb950]/20 text-[#3fb950] hover:bg-[#3fb950]/20'
                }`}
              >
                {sentToForge ? '✓ Sent' : 'Open in ReportForge'}
              </button>
            </div>
          </div>
        </div>

        {/* Preview pane */}
        {preview && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-[#0d0d14] border border-[#2a3347] rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-[#4a5568] uppercase tracking-widest">
                {preview === 'json' ? 'JSON Preview' : 'Markdown Preview'}
              </p>
              <button
                onClick={() => setPreview(null)}
                className="text-[10px] text-[#4a5568] hover:text-[#8b949e] transition-colors"
              >
                Close ×
              </button>
            </div>
            <pre className="text-[10px] font-mono text-[#8b949e] overflow-x-auto max-h-80 overflow-y-auto leading-relaxed whitespace-pre-wrap break-words">
              {preview === 'json' ? jsonPreview : mdPreview}
            </pre>
          </motion.div>
        )}
      </div>
    </div>
  )
}
