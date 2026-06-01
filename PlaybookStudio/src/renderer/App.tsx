import { useEffect } from 'react'
import { useStore } from './store'
import Header from './components/Header'
import LibraryView from './components/LibraryView'
import EditorView from './components/EditorView'
import RunView from './components/RunView'
import HistoryView from './components/HistoryView'

export default function App() {
  const view        = useStore(s => s.view)
  const setPlaybooks = useStore(s => s.setPlaybooks)
  const setRuns      = useStore(s => s.setRuns)
  const setContext   = useStore(s => s.setContext)

  useEffect(() => {
    window.electronAPI.getState().then(state => {
      setPlaybooks(state.playbooks)
      setRuns(state.runs)
      setContext(state.sharedContext)
    })

    const unCtx = window.electronAPI.onContextUpdated(setContext)
    return () => { unCtx() }
  }, [setPlaybooks, setRuns, setContext])

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <Header />
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === 'library' && <LibraryView />}
        {view === 'editor'  && <EditorView />}
        {view === 'run'     && <RunView />}
        {view === 'history' && <HistoryView />}
      </div>
    </div>
  )
}
