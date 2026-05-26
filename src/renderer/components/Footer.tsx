import { useEffect, useState } from 'react'
import { useStore } from '../store'

export default function Footer() {
  const targets = useStore(s => s.targets)
  const cards   = useStore(s => s.cards)
  const [version, setVersion] = useState('1.0.0')

  useEffect(() => {
    window.electronAPI.getVersion().then(setVersion)
  }, [])

  const done    = cards.filter(c => c.status === 'done').length
  const active  = targets.filter(t => t.status === 'active').length

  return (
    <footer className="h-7 flex items-center justify-between px-4 border-t border-border flex-shrink-0">
      <span className="text-[11px] text-muted">ItsEliias // ReconDesk v{version}</span>
      <div className="flex items-center gap-4">
        <span className="text-[11px] text-muted">
          <span className="text-text">{active}</span> active target{active !== 1 ? 's' : ''}
        </span>
        <span className="text-[11px] text-muted">
          <span className="text-text">{done}</span> / <span className="text-text">{cards.length}</span> cards done
        </span>
      </div>
    </footer>
  )
}
