import { useEffect, useState } from 'react'
import { useRecondeskStore } from '../../stores/useRecondeskStore'

export default function StatusBar() {
  const targets = useRecondeskStore(s => s.targets)
  const [version, setVersion] = useState('2.0.0')

  useEffect(() => {
    window.electronAPI.getVersion().then(setVersion).catch(() => {})
  }, [])

  const activeCount    = targets.filter(t => t.status === 'active').length
  const totalPorts     = targets.reduce((n, t) => n + t.ports.length, 0)
  const totalCreds     = targets.reduce((n, t) => n + t.credentials.length, 0)
  const totalDoneCards = targets.reduce((n, t) => n + t.attackCards.filter(c => c.status === 'done').length, 0)

  return (
    <footer className="h-7 flex items-center justify-between px-4 border-t border-[#2a3347] flex-shrink-0">
      <span className="text-[11px] text-[#4a5568]">ItsEliias // ReconDesk v{version}</span>
      <div className="flex items-center gap-4">
        <span className="text-[11px] text-[#4a5568]">
          <span className="text-[#e2e8f0]">{activeCount}</span> active
        </span>
        <span className="text-[11px] text-[#4a5568]">
          <span className="text-[#e2e8f0]">{totalPorts}</span> ports
        </span>
        <span className="text-[11px] text-[#4a5568]">
          <span className="text-[#e2e8f0]">{totalCreds}</span> creds
        </span>
        <span className="text-[11px] text-[#4a5568]">
          <span className="text-[#e2e8f0]">{totalDoneCards}</span> cards done
        </span>
      </div>
    </footer>
  )
}
