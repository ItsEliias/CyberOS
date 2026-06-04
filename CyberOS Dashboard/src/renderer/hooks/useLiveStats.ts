// CyberOS Dashboard — Live Stats Hook
// Samples numeric metrics from the config on every config update
// and appends them into the liveStats ring buffers in the store.

import { useEffect, useRef } from 'react'
import { useDashboardStore } from '../stores/useDashboardStore'
import type { EcosystemConfig } from '../types/ecosystem'

// Extract the primary numeric metric value for each app
function extractMetrics(cfg: EcosystemConfig): Record<string, number> {
  const cv = cfg.credvault_status
  const gv = cfg.ghostvault_status
  const nm = cfg.networkmap_status
  const ps = cfg.playbookstudio_status
  const rd = cfg.recondesk_status
  const rf = cfg.reportforge_status
  const sb = cfg.signalboard_status
  const tl = cfg.terminallink_status
  const vc = cfg.vaultscraper_status
  const cl = cfg.cyberlab_status

  return {
    credvault: cv?.credentialCount ?? 0,
    ghostvault: gv?.noteCount ?? 0,
    networkmap: nm?.nodeCount ?? 0,
    playbookstudio: ps?.active ? 1 : 0,
    recondesk: rd?.targetCount ?? 0,
    reportforge: rf?.reportCount ?? 0,
    signalboard: sb?.unreadCount ?? 0,
    terminallink: tl?.commandCount ?? 0,
    vaultcore: vc?.vaultNoteCount ?? 0,
    cyberlab: cl?.findingsCount ?? 0,
  }
}

export function useLiveStats(): void {
  const config = useDashboardStore((s) => s.config)
  const appendLiveSnapshot = useDashboardStore((s) => s.appendLiveSnapshot)
  const lastConfigRef = useRef<EcosystemConfig | null>(null)

  useEffect(() => {
    // Only sample when config actually changes (reference equality)
    if (config === lastConfigRef.current) return
    lastConfigRef.current = config

    const metrics = extractMetrics(config)
    for (const [appKey, value] of Object.entries(metrics)) {
      appendLiveSnapshot(appKey, value)
    }
  }, [config, appendLiveSnapshot])
}
