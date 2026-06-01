import { useEffect } from 'react'
import { useStore } from './store'
import Header from './components/Header'
import Footer from './components/Footer'
import SourcePanel from './components/SourcePanel'
import FeedList from './components/FeedList'
import ReadingPane from './components/ReadingPane'

export default function App() {
  const setItems         = useStore(s => s.setItems)
  const setSources       = useStore(s => s.setSources)
  const setRefreshing    = useStore(s => s.setRefreshing)
  const setLastRefreshed = useStore(s => s.setLastRefreshed)
  const setContext       = useStore(s => s.setContext)
  const setVersion       = useStore(s => s.setVersion)

  useEffect(() => {
    // Initial load
    window.electronAPI.getState().then(state => {
      setItems(state.items)
      setSources(state.sources)
    })
    window.electronAPI.getContext().then(setContext)
    window.electronAPI.getVersion().then(setVersion)

    // Subscribe to live pushes
    const unItems         = window.electronAPI.onItems(setItems)
    const unRefreshing    = window.electronAPI.onRefreshing(setRefreshing)
    const unLastRefreshed = window.electronAPI.onLastRefreshed(setLastRefreshed)

    return () => { unItems(); unRefreshing(); unLastRefreshed() }
  }, [setItems, setSources, setRefreshing, setLastRefreshed, setContext, setVersion])

  return (
    <div className="flex flex-col h-full bg-bg text-text">
      <Header />
      <div className="flex flex-1 min-h-0">
        <SourcePanel />
        <FeedList />
        <ReadingPane />
      </div>
      <Footer />
    </div>
  )
}
