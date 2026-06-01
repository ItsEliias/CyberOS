import { useEffect } from 'react'
import { useStore } from './store'
import LockScreen from './components/LockScreen'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import VaultView from './components/VaultView'
import ImportView from './components/ImportView'
import SettingsView from './components/SettingsView'

export default function App() {
  const isUnlocked  = useStore(s => s.isUnlocked)
  const isSetup     = useStore(s => s.isSetup)
  const activeView  = useStore(s => s.activeView)
  const setSetup    = useStore(s => s.setSetup)
  const setUnlocked = useStore(s => s.setUnlocked)
  const setCredentials = useStore(s => s.setCredentials)
  const setStats    = useStore(s => s.setStats)
  const setVersion  = useStore(s => s.setVersion)

  // Bootstrap: check if vault needs first-time setup
  useEffect(() => {
    window.electronAPI.needsSetup().then(needs => setSetup(!needs))
    window.electronAPI.getVersion().then(setVersion)
  }, [setSetup, setVersion])

  // Listen for vault:locked push event from main
  useEffect(() => {
    const handler = () => setUnlocked(false)
    window.electronAPI.onVaultLocked(handler)
    return () => window.electronAPI.offVaultLocked(handler)
  }, [setUnlocked])

  // Load credentials when unlocked
  useEffect(() => {
    if (!isUnlocked) { setCredentials([]); setStats(null); return }
    window.electronAPI.getCredentials().then(setCredentials)
    window.electronAPI.getStats().then(setStats)
  }, [isUnlocked, setCredentials, setStats])

  if (!isUnlocked) {
    return <LockScreen needsSetup={!isSetup} />
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto">
          {activeView === 'vault'    && <VaultView />}
          {activeView === 'import'   && <ImportView />}
          {activeView === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  )
}
