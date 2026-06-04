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
      className="h-6 flex items-center px-4 flex-shrink-0 text-[11px]"
      style={{ background: 'rgba(7,8,15,0.98)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      {/* Brand + version */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: activeCount > 0 ? '#d29922' : '#484f58' }}
        />
        <span style={{ color: '#484f58' }}>ItsEliias // ReconDesk</span>
        <span
          className="font-mono px-1 py-0 rounded text-[10px]"
          style={{ background: 'rgba(210,153,34,0.06)', color: 'rgba(210,153,34,0.6)', border: '1px solid rgba(210,153,34,0.12)' }}
        >
          v{version}
        </span>
      </div>

      <span className="mx-2.5" style={{ color: 'rgba(72,79,88,0.3)' }}>|</span>

      {/* Stats */}
      <div className="flex items-center gap-3">
        <span style={{ color: '#484f58' }}>
          <span style={{ color: '#e6edf3' }}>{activeCount}</span> active
        </span>
        <span style={{ color: '#484f58' }}>
          <span style={{ color: '#e6edf3' }}>{totalPorts}</span> ports
        </span>
        <span style={{ color: '#484f58' }}>
          <span style={{ color: '#e6edf3' }}>{totalCreds}</span> creds
        </span>
        <span style={{ color: '#484f58' }}>
          <span style={{ color: '#e6edf3' }}>{totalDoneCards}</span> done
        </span>
      </div>

      <div className="flex-1" />

      {/* UTC clock */}
      <span className="font-mono tabular-nums" style={{ color: '#484f58' }}>{utcTime}</span>
    </footer>
  )
}
