import { useEffect, useState } from 'react'
import { useRecondeskStore } from '../../stores/useRecondeskStore'

function getUTC(): string {
  const now = new Date()
  return now.toUTCString().slice(17, 25) + ' UTC'
}

export default function StatusBar() {
  const targets = useRecondeskStore(s => s.targets)
  const [version, setVersion]   = useState('2.0.0')
  const [utcTime, setUtcTime]   = useState(getUTC())

  useEffect(() => {
    window.electronAPI.getVersion().then(setVersion).catch(() => {})
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setUtcTime(getUTC()), 1000)
    return () => clearInterval(interval)
  }, [])

  const activeCount    = targets.filter(t => t.status === 'active').length
  const totalPorts     = targets.reduce((n, t) => n + t.ports.length, 0)
  const totalCreds     = targets.reduce((n, t) => n + t.credentials.length, 0)
  const totalDoneCards = targets.reduce((n, t) => n + t.attackCards.filter(c => c.status === 'done').length, 0)

  return (
    <footer
      className="h-6 flex items-center px-4 flex-shrink-0"
      style={{
        background: 'var(--surface-0, #07080f)',
        borderTop: '1px solid var(--border-subtle, rgba(42,51,71,0.35))',
      }}
    >
      {/* Brand */}
      <span className="status-metric">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
          style={{ backgroundColor: activeCount > 0 ? '#d29922' : 'var(--text-muted, #484f58)' }}
        />
        ItsEliias ╱ ReconDesk
      </span>

      <span className="status-sep mx-2">·</span>

      {/* Flat metric strip */}
      <div className="flex items-center gap-0">
        <span className="status-metric">
          <span style={{ color: 'var(--text-primary, #e6edf3)' }}>{activeCount}</span> active
        </span>
        <span className="status-sep mx-2">·</span>
        <span className="status-metric">
          <span style={{ color: 'var(--text-primary, #e6edf3)' }}>{totalPorts}</span> ports
        </span>
        <span className="status-sep mx-2">·</span>
        <span className="status-metric">
          <span style={{ color: 'var(--text-primary, #e6edf3)' }}>{totalCreds}</span> creds
        </span>
        <span className="status-sep mx-2">·</span>
        <span className="status-metric">
          <span style={{ color: 'var(--text-primary, #e6edf3)' }}>{totalDoneCards}</span> done
        </span>
      </div>

      <div className="flex-1" />

      {/* UTC clock */}
      <span className="status-metric font-mono tabular-nums">{utcTime}</span>
    </footer>
  )
}
