// CyberOS Dashboard — Config Watcher Hook
// Polls config and subscribes to push updates from main process

import { useEffect, useCallback, useRef } from 'react'
import { useDashboardStore } from '../stores/useDashboardStore'
import { buildAppCards } from '../utils/configParser'
import { evaluateAlerts } from '../utils/alertEngine'

export function useConfigWatcher() {
  const setConfig = useDashboardStore((s) => s.setConfig)
  const setAlerts = useDashboardStore((s) => s.setAlerts)
  const setError = useDashboardStore((s) => s.setError)
  const setFullscreen = useDashboardStore((s) => s.setFullscreen)
  const config = useDashboardStore((s) => s.config)
  const events = useDashboardStore((s) => s.events)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced config update to prevent UI jank
  const handleConfigUpdate = useCallback(
    (cfg: any) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setConfig(cfg)
      }, 50)
    },
    [setConfig]
  )

  // Initial load
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const cfg = await window.electronAPI.getState()
        setConfig(cfg)
      } catch (err) {
        setError(
          'Could not read cybertools-config.json — ensure the file exists at ~/cybertools-config.json'
        )
      }
    }

    loadInitial()

    // Subscribe to push updates from main process
    const unsubState = window.electronAPI.onStateUpdate(handleConfigUpdate)
    const unsubFullscreen = window.electronAPI.onFullscreenChange(setFullscreen)

    return () => {
      unsubState()
      unsubFullscreen()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [setConfig, setError, setFullscreen, handleConfigUpdate])

  // Recompute alerts whenever config or events change
  useEffect(() => {
    const cards = buildAppCards(config)
    const alerts = evaluateAlerts(cards, events, config)
    setAlerts(alerts)
  }, [config, events, setAlerts])
}
