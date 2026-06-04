import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from './store'
import TitleBar from './components/layout/TitleBar'
import Sidebar from './components/layout/Sidebar'
import StatusBar from './components/layout/StatusBar'
import FeedView from './components/feed/FeedView'
import TrendsView from './components/trends/TrendsView'
import SourcesView from './components/sources/SourcesView'
import SettingsView from './components/settings/SettingsView'
import BookmarksView from './components/bookmarks/BookmarksView'
import TimelineView from './components/timeline/TimelineView'
import SearchOverlay from './components/search/SearchOverlay'
import OnboardingModal, { useOnboarding } from './components/OnboardingModal'

export default function App() {
  const onboarding       = useOnboarding()
  const setItems         = useStore(s => s.setItems)
  const setSources       = useStore(s => s.setSources)
  const setRefreshing    = useStore(s => s.setRefreshing)
  const setLastRefreshed = useStore(s => s.setLastRefreshed)
  const setContext       = useStore(s => s.setContext)
  const setVersion       = useStore(s => s.setVersion)
  const setSettings      = useStore(s => s.setSettings)
  const setBookmarks     = useStore(s => s.setBookmarks)
  const setBookmarkTags  = useStore(s => s.setBookmarkTags)
  const setSelectedId    = useStore(s => s.setSelectedId)
  const setActiveView    = useStore(s => s.setActiveView)
  const activeView       = useStore(s => s.activeView)
  const searchOpen       = useStore(s => s.searchOpen)
  const setSearchOpen    = useStore(s => s.setSearchOpen)

  useEffect(() => {
    window.electronAPI.getState().then(state => {
      setItems(state.items)
      setSources(state.sources)
    })
    window.electronAPI.getContext().then(setContext)
    window.electronAPI.getVersion().then(setVersion)
    window.electronAPI.getSettings().then(setSettings)
    window.electronAPI.getBookmarks().then(bm => {
      setBookmarks(bm.ids)
      setBookmarkTags(bm.tags)
    })

    const unItems         = window.electronAPI.onItems(setItems)
    const unRefreshing    = window.electronAPI.onRefreshing(setRefreshing)
    const unLastRefreshed = window.electronAPI.onLastRefreshed(setLastRefreshed)
    const unContext       = window.electronAPI.onContext(setContext)
    const unSources       = window.electronAPI.onSources(setSources)
    const unBookmarks     = window.electronAPI.onBookmarks(bm => {
      setBookmarks(bm.ids)
      setBookmarkTags(bm.tags)
    })
    const unSelectItem    = window.electronAPI.onSelectItem(id => {
      setActiveView('feed')
      setSelectedId(id)
    })

    return () => {
      unItems()
      unRefreshing()
      unLastRefreshed()
      unContext()
      unSources()
      unBookmarks()
      unSelectItem()
    }
  }, [setItems, setSources, setRefreshing, setLastRefreshed, setContext, setVersion, setSettings, setBookmarks, setBookmarkTags, setSelectedId, setActiveView])

  // Cmd+K to open search
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [setSearchOpen])

  return (
    <div className="flex flex-col h-full bg-bg text-text" style={{ background: '#0a0a0f' }}>
      <TitleBar onHelp={onboarding.open} />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="flex-1 min-w-0 flex"
          >
            {activeView === 'feed'      && <FeedView />}
            {activeView === 'trends'    && <TrendsView />}
            {activeView === 'sources'   && <SourcesView />}
            {activeView === 'settings'  && <SettingsView />}
            {activeView === 'bookmarks' && <BookmarksView />}
            {activeView === 'timeline'  && <TimelineView />}
          </motion.div>
        </AnimatePresence>
      </div>
      <StatusBar />
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      {onboarding.show && <OnboardingModal onClose={onboarding.close} />}
    </div>
  )
}
