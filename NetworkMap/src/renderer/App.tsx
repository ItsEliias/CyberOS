// NetworkMap — App.tsx
import { useState, useCallback } from 'react'
import type { NetworkGraph, GraphSummary } from '@shared/types'
import GraphLibrary from './components/GraphLibrary'
import GraphCanvas from './components/GraphCanvas'

type View = 'library' | 'canvas'

export default function App() {
  const [view, setView]               = useState<View>('library')
  const [activeGraph, setActiveGraph] = useState<NetworkGraph | null>(null)
  const [savedGraphs, setSavedGraphs] = useState<GraphSummary[]>([])

  const handleOpenGraph = useCallback((graph: NetworkGraph) => {
    setActiveGraph(graph)
    setView('canvas')
    // Refresh saved list for sidebar
    window.electronAPI.loadGraphs().then(setSavedGraphs).catch(console.error)
  }, [])

  const handleBack = useCallback(() => {
    setView('library')
    setActiveGraph(null)
  }, [])

  const handleSwitchGraph = useCallback(async (id: string) => {
    const g = await window.electronAPI.loadGraph(id)
    if (g) setActiveGraph(g)
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>
      {view === 'library' && (
        <GraphLibrary onOpenGraph={handleOpenGraph} />
      )}
      {view === 'canvas' && activeGraph && (
        <GraphCanvas
          graph={activeGraph}
          savedGraphs={savedGraphs}
          onBack={handleBack}
          onSwitchGraph={handleSwitchGraph}
        />
      )}
    </div>
  )
}
