// NetLab — App.tsx
// ItsEliias // v1.0

import { useEffect, useState, useCallback } from 'react'
import { useNetLabStore } from './store'
import { BUILTIN_LABS } from '@shared/builtinLabs'
import { BUILTIN_SNIPPETS } from '@shared/builtinSnippets'

import TitleBar    from './components/TitleBar'
import Sidebar     from './components/Sidebar'
import StatusBar   from './components/StatusBar'
import LabsView    from './components/LabsView'
import ReferenceView from './components/ReferenceView'
import TopologyView  from './components/TopologyView'
import SnippetsView  from './components/SnippetsView'
import ProgressView  from './components/ProgressView'
import SettingsView  from './components/SettingsView'
import SearchModal   from './components/SearchModal'
import CommandPalette from './components/CommandPalette'

export default function App() {
  const activeView    = useNetLabStore(s => s.activeView)
  const setActiveView = useNetLabStore(s => s.setActiveView)
  const setLabs       = useNetLabStore(s => s.setLabs)
  const setProgress   = useNetLabStore(s => s.setProgress)
  const setSnippets   = useNetLabStore(s => s.setSnippets)

  const [searchOpen,   setSearchOpen]   = useState(false)
  const [paletteOpen,  setPaletteOpen]  = useState(false)

  const openSearch   = useCallback(() => setSearchOpen(true),  [])
  const closeSearch  = useCallback(() => setSearchOpen(false), [])
  const closePalette = useCallback(() => setPaletteOpen(false), [])

  // Tray-menu actions fired by the CyberTools Launcher.
  useEffect(() => {
    const off = window.electronAPI.onPendingAction?.(action => {
      if (action === 'new-lab') {
        setActiveView('labs')
      }
    })
    return () => { off?.() }
  }, [setActiveView])

  // ⌘K → command palette (actions). ⌘Shift+F → SearchModal (content search).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (mod && !e.shiftKey && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(v => !v)
      } else if (mod && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault()
        setSearchOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Bootstrap data on mount
  useEffect(() => {
    async function init() {
      // Load custom labs and merge with built-ins
      let custom: typeof BUILTIN_LABS = []
      try {
        custom = await window.electronAPI.labs.getAll()
      } catch { /* ignore */ }
      // Built-ins take precedence by id — user custom labs augment the list
      const builtinIds = new Set(BUILTIN_LABS.map(l => l.id))
      const merged = [...BUILTIN_LABS, ...custom.filter(l => !builtinIds.has(l.id))]
      setLabs(merged)

      // Load progress
      try {
        const prog = await window.electronAPI.labs.getProgress()
        setProgress(prog)
      } catch { /* ignore */ }
    }
    init()

    // Load built-in snippets
    setSnippets(BUILTIN_SNIPPETS)
  }, [setLabs, setProgress, setSnippets])

  return (
    <div
      className="flex flex-col"
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#0a0a0f' }}
    >
      <TitleBar onOpenSearch={openSearch} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0a0a0f' }}>
          <div className="flex-1 overflow-hidden">
            {activeView === 'labs'      && <LabsView />}
            {activeView === 'reference' && <ReferenceView />}
            {activeView === 'topology'  && <TopologyView />}
            {activeView === 'snippets'  && <SnippetsView />}
            {activeView === 'progress'  && <ProgressView />}
            {activeView === 'settings'  && <SettingsView />}
          </div>
        </main>
      </div>

      <StatusBar />
      <SearchModal open={searchOpen} onClose={closeSearch} />
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  )
}
