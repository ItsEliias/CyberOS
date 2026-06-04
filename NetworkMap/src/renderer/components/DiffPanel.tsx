// NetworkMap — DiffPanel.tsx — Feature 9: Scan comparison diff
import type { NetworkNode, ScanRecord } from '@shared/types'

export interface DiffResult {
  added: Set<string>
  removed: Set<string>
  changed: Set<string>
}

export function computeDiff(base: NetworkNode[], latest: NetworkNode[]): DiffResult {
  const baseIds  = new Set(base.map(n => n.id))
  const latestIds = new Set(latest.map(n => n.id))
  const added    = new Set<string>()
  const removed  = new Set<string>()
  const changed  = new Set<string>()

  for (const n of latest) {
    if (!baseIds.has(n.id)) added.add(n.id)
    else {
      const baseNode = base.find(b => b.id === n.id)!
      const basePorts = new Set(baseNode.ports.filter(p => p.state === 'open').map(p => p.port))
      const nowPorts  = new Set(n.ports.filter(p => p.state === 'open').map(p => p.port))
      const different = basePorts.size !== nowPorts.size ||
        [...basePorts].some(p => !nowPorts.has(p)) ||
        [...nowPorts].some(p => !basePorts.has(p))
      if (different) changed.add(n.id)
    }
  }
  for (const n of base) {
    if (!latestIds.has(n.id)) removed.add(n.id)
  }
  return { added, removed, changed }
}

interface Props {
  scans: ScanRecord[]
  diff: DiffResult | null
  selectedBase: number
  selectedLatest: number
  onSelectBase: (i: number) => void
  onSelectLatest: (i: number) => void
  onClose: () => void
}

export default function DiffPanel({ scans, diff, selectedBase, selectedLatest, onSelectBase, onSelectLatest, onClose }: Props) {
  const selectStyle: React.CSSProperties = {
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4,
    color: 'var(--text)', fontSize: 11, padding: '3px 6px', width: '100%',
  }

  return (
    <div style={{
      position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(22,27,34,0.97)', border: '1px solid var(--border)',
      borderRadius: 8, padding: 14, zIndex: 30, minWidth: 320,
      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.06em' }}>SCAN COMPARISON</span>
        <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: 16 }}>×</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>BASE SCAN</label>
          <select value={selectedBase} onChange={e => onSelectBase(Number(e.target.value))} style={selectStyle}>
            {scans.map((s, i) => <option key={i} value={i}>{s.scanName}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>LATEST SCAN</label>
          <select value={selectedLatest} onChange={e => onSelectLatest(Number(e.target.value))} style={selectStyle}>
            {scans.map((s, i) => <option key={i} value={i}>{s.scanName}</option>)}
          </select>
        </div>
      </div>

      {diff && (
        <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3fb950', display: 'inline-block' }} />
            <span style={{ color: '#3fb950' }}>{diff.added.size} new</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f85149', display: 'inline-block' }} />
            <span style={{ color: '#f85149' }}>{diff.removed.size} removed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d29922', display: 'inline-block' }} />
            <span style={{ color: '#d29922' }}>{diff.changed.size} changed</span>
          </div>
        </div>
      )}
    </div>
  )
}
