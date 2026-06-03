// CyberOS Dashboard — Event Feed Hook
// Loads and subscribes to ecosystem events

import { useEffect, useCallback } from 'react'
import { useDashboardStore } from '../stores/useDashboardStore'

export function useEventFeed() {
  const setEvents = useDashboardStore((s) => s.setEvents)

  const loadEvents = useCallback(async () => {
    try {
      const events = await window.electronAPI.getEvents()
      setEvents(events)
    } catch {
      // Silently handle — events file may not exist yet
    }
  }, [setEvents])

  useEffect(() => {
    // Initial load
    loadEvents()

    // Subscribe to push updates
    const unsub = window.electronAPI.onEventsUpdate(setEvents)

    // Refresh event history every 30 seconds
    const interval = setInterval(loadEvents, 30_000)

    return () => {
      unsub()
      clearInterval(interval)
    }
  }, [loadEvents, setEvents])
}
