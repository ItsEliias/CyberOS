import { useEffect, useRef, useState } from 'react'
import { useStore } from './store'
import { playAutoLock } from './utils/audioNotify'
import LockScreen from './components/LockScreen'
import TitleBar from './components/TitleBar'
import StatusBar from './components/StatusBar'
import Sidebar from './components/Sidebar'
import VaultView from './components/VaultView'
import ImportView from './components/ImportView'
import SettingsView from './components/SettingsView'
import OnboardingModal, { useOnboarding } from './components/OnboardingModal'
import CommandPalette from './components/CommandPalette'

const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'] as const

export default function App() {
  const onboarding      = useOnboarding()
  const isUnlocked      = useStore(s => s.isUnlocked)
  const isSetup         = useStore(s => s.isSetup)
  const activeView      = useStore(s => s.activeView)
  const autoLockMs      = useStore(s => s.autoLockMs)
  const setSetup        = useStore(s => s.setSetup)
  const setUnlocked     = useStore(s => s.setUnlocked)
  const setCredentials  = useStore(s => s.setCredentials)
  const setStats        = useStore(s => s.setStats)
  const setVersion      = useStore(s => s.setVersion)
  const setPendingCount = useStore(s => s.setPendingCount)

  // ⌘K command palette
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Idle timer — throttle to at most one reset per 10s
  const lastResetRef = useRef(0)

  // Global ⌘K listener — only when vault is unlocked
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Bootstrap: check if vault needs first-time setup
  useEffect(() => {
    window.electronAPI.needsSetup().then(needs => setSetup(!needs))
    window.electronAPI.getVersion().then(setVersion)
  }, [setSetup, setVersion])

  // Listen for vault:locked push event from main
  useEffect(() => {
    const handler = () => {
      playAutoLock()
      setUnlocked(false)
    }
    window.electronAPI.onVaultLocked(handler)
    return () => window.electronAPI.offVaultLocked(handler)
  }, [setUnlocked])

  // Load credentials when unlocked
  useEffect(() => {
    if (!isUnlocked) { setCredentials([]); setStats(null); return }
    window.electronAPI.getCredentials().then(setCredentials)
    window.electronAPI.getStats().then(setStats)
  }, [isUnlocked, setCredentials, setStats])

  // Subscribe to live pending-count push from main and seed on mount
  useEffect(() => {
    window.electronAPI.pending.get().then(items => setPendingCount(items.length))
    const handler = (count: number) => setPendingCount(count)
    window.electronAPI.pending.on(handler)
    return () => window.electronAPI.pending.off(handler)
  }, [setPendingCount])

  // Idle timer — reset on any user interaction when vault is unlocked and auto-lock is enabled
  useEffect(() => {
    if (!isUnlocked || autoLockMs <= 0) return

    function onActivity() {
      const now = Date.now()
      if (now - lastResetRef.current < 10_000) return   // throttle
      lastResetRef.current = now
      window.electronAPI.resetIdleTimer(autoLockMs)
    }

    IDLE_EVENTS.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }))
    return () => {
      IDLE_EVENTS.forEach(ev => window.removeEventListener(ev, onActivity))
    }
  }, [isUnlocked, autoLockMs])

  const theme = useStore(s => s.theme)

  if (!isUnlocked) {
    return <LockScreen needsSetup={!isSetup} />
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{
        '--app-accent': theme.accentColor,
        '--app-bg':     theme.bgColor,
        '--app-text':   theme.textColor,
        background: `radial-gradient(ellipse at 20% 0%, ${theme.accentColor}0a 0%, ${theme.bgColor} 50%)`,
      } as React.CSSProperties}
    >
      <TitleBar onHelp={onboarding.open} />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto">
          {activeView === 'vault'    && <VaultView />}
          {activeView === 'import'   && <ImportView />}
          {activeView === 'settings' && <SettingsView />}
        </main>
      </div>
      <StatusBar />
      {onboarding.show && <OnboardingModal onClose={onboarding.close} />}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
