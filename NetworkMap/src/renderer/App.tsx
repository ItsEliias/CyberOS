// NetworkMap — App.tsx
import { useState, useCallback, useEffect } from 'react'
import type { NetworkGraph, GraphSummary, ScanRecord } from '@shared/types'
import GraphLibrary from './components/GraphLibrary'
import GraphCanvas from './components/GraphCanvas'
import ImportModal from './components/ImportModal'
import SettingsView from './components/SettingsView'
import CommandPalette from './components/CommandPalette'
import OnboardingModal, { useOnboarding } from './components/OnboardingModal'

type View = 'library' | 'canvas' | 'settings'

export default function App() {
  const [view, setView]               = useState<View>('library')
  const [activeGraph, setActiveGraph] = useState<NetworkGraph | null>(null)
  const [savedGraphs, setSavedGraphs] = useState<GraphSummary[]>([])
  const [importOpen, setImportOpen]   = useState(false)
  // Track all imported scans for port timeline and diff features
  const [allScans, setAllScans]       = useState<ScanRecord[]>([])
  const [paletteOpen, setPaletteOpen] = useState(false)
  const onboarding = useOnboarding()

  // ⌘K toggles the command palette
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const handleNewEmptyGraph = useCallback(() => {
    const now = new Date().toISOString()
    const graph: NetworkGraph = {
      id:        `graph-${Date.now()}`,
      name:      'Untitled Graph',
      nodes:     [],
      edges:     [],
      createdAt: now,
      updatedAt: now,
    }
    setActiveGraph(graph)
    setView('canvas')
  }, [])

  const refreshGraphs = useCallback(() => {
    window.electronAPI.loadGraphs().then(setSavedGraphs).catch(console.error)
  }, [])

  useEffect(() => { refreshGraphs() }, [refreshGraphs])

  const handleOpenGraph = useCallback((graph: NetworkGraph) => {
    setActiveGraph(graph)
    setView('canvas')
    refreshGraphs()
  }, [refreshGraphs])

  const handleImportComplete = useCallback(async (graph: NetworkGraph) => {
    try {
      await window.electronAPI.saveGraph(graph)
    } catch (e) {
      console.error('[NetworkMap] save after import failed:', e)
    }
    // Register scan record for timeline/diff
    setAllScans(prev => [...prev, {
      scanName: graph.name,
      importedAt: graph.createdAt,
      nodes: graph.nodes,
    }])
    refreshGraphs()
    handleOpenGraph(graph)
    setImportOpen(false)
  }, [handleOpenGraph, refreshGraphs])

  const handleBack = useCallback(() => {
    setView('library')
    setActiveGraph(null)
    refreshGraphs()
  }, [refreshGraphs])

  const handleSwitchGraph = useCallback(async (id: string) => {
    const g = await window.electronAPI.loadGraph(id)
    if (g) setActiveGraph(g)
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>
      {view === 'library' && (
        <GraphLibrary
          onOpenGraph={handleOpenGraph}
          onOpenImport={() => setImportOpen(true)}
          onOpenSettings={() => setView('settings')}
          onOpenHelp={onboarding.open}
        />
      )}
      {view === 'canvas' && activeGraph && (
        <GraphCanvas
          graph={activeGraph}
          savedGraphs={savedGraphs}
          allScans={allScans}
          onBack={handleBack}
          onSwitchGraph={handleSwitchGraph}
        />
      )}
      {view === 'settings' && (
        <SettingsView onBack={() => setView('library')} />
      )}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImport={handleImportComplete}
        />
      )}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        savedGraphs={savedGraphs}
        onGoto={target => setView(target)}
        onNewGraph={handleNewEmptyGraph}
        onOpenImport={() => setImportOpen(true)}
        onOpenGraph={handleOpenGraph}
      />
      {onboarding.show && <OnboardingModal onClose={onboarding.close} />}
    </div>
  )
}
