import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from './store'
import Header from './components/Header'
import Footer from './components/Footer'
import TargetPanel from './components/TargetPanel'
import AttackBoard from './components/AttackBoard'
import TargetAssets from './components/TargetAssets'

type Tab = 'board' | 'assets'

const TABS: { id: Tab; label: string }[] = [
  { id: 'board',  label: 'Board'  },
  { id: 'assets', label: 'Assets' },
]

export default function App() {
  const hydrate    = useStore(s => s.hydrate)
  const activeId   = useStore(s => s.activeTargetId)
  const [tab, setTab] = useState<Tab>('board')

  useEffect(() => {
    window.electronAPI.loadData().then(data => {
      if (data) hydrate(data)
    })
  }, [hydrate])

  // Reset to board when active target changes
  useEffect(() => { setTab('board') }, [activeId])

  return (
    <div className="flex flex-col h-full bg-bg text-text">
      <Header />

      <div className="flex flex-1 min-h-0">
        <TargetPanel />

        {/* Right panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-4 border-b border-border flex-shrink-0 h-9">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="relative px-3 py-1.5 text-xs transition-colors"
                style={{ color: tab === t.id ? '#c9d1d9' : '#8b949e' }}
              >
                {t.label}
                {tab === t.id && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-px bg-accent"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Panel content */}
          {tab === 'board'  && <AttackBoard />}
          {tab === 'assets' && <TargetAssets />}
        </div>
      </div>

      <Footer />
    </div>
  )
}
