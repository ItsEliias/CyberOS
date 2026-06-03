// CyberOS Dashboard — Alert Engine
// Evaluates alert conditions against ecosystem state

import type { Alert, AppCardData, EcosystemEvent, EcosystemConfig } from '../types/ecosystem'
import { normalizeEvent } from './eventParser'

const OFFLINE_THRESHOLD = 5 * 60_000       // 5 minutes
const STALE_EVENTS_THRESHOLD = 30 * 60_000 // 30 minutes
const CREDVAULT_LOCK_THRESHOLD = 15 * 60_000 // 15 minutes
const SIGNALBOARD_UNREAD_THRESHOLD = 20

export function evaluateAlerts(
  cards: AppCardData[],
  events: EcosystemEvent[],
  config: EcosystemConfig
): Alert[] {
  const now = Date.now()
  const alerts: Alert[] = []

  // Alert: App offline > 5 minutes
  for (const card of cards) {
    if (card.id === 'dashboard') continue // self is always active
    if (!card.lastActive) continue
    const age = now - new Date(card.lastActive).getTime()
    if (!card.active && age > OFFLINE_THRESHOLD) {
      alerts.push({
        id: `offline-${card.id}`,
        type: 'app_offline',
        severity: 'warning',
        message: `${card.name} has been offline for ${Math.floor(age / 60_000)}m`,
        triggeredAt: new Date(),
        appKey: card.id,
      })
    }
  }

  // Alert: No ecosystem events > 30 minutes
  if (events.length > 0) {
    const normalized = normalizeEvent(events[0])
    const latestAge = now - new Date(normalized.timestamp).getTime()
    if (latestAge > STALE_EVENTS_THRESHOLD) {
      alerts.push({
        id: 'stale-events',
        type: 'no_events',
        severity: 'warning',
        message: `No ecosystem events for ${Math.floor(latestAge / 60_000)}m`,
        triggeredAt: new Date(),
      })
    }
  } else {
    alerts.push({
      id: 'no-events',
      type: 'no_events',
      severity: 'warning',
      message: 'No ecosystem events found',
      triggeredAt: new Date(),
    })
  }

  // Alert: CredVault locked during active session
  const credStatus = config.credvault_status
  const hasActiveSession = config.shared_context?.activeLab != null
  if (credStatus?.locked && hasActiveSession && credStatus.lastActive) {
    const lockAge = now - new Date(credStatus.lastActive).getTime()
    if (lockAge > CREDVAULT_LOCK_THRESHOLD) {
      alerts.push({
        id: 'credvault-locked',
        type: 'credvault_locked',
        severity: 'critical',
        message: `CredVault locked for ${Math.floor(lockAge / 60_000)}m during active session`,
        triggeredAt: new Date(),
        appKey: 'credvault',
      })
    }
  }

  // Alert: SignalBoard unread > 20
  const signalStatus = config.signalboard_status
  if (signalStatus?.unreadCount && signalStatus.unreadCount > SIGNALBOARD_UNREAD_THRESHOLD) {
    alerts.push({
      id: 'high-unread',
      type: 'high_unread',
      severity: 'warning',
      message: `SignalBoard has ${signalStatus.unreadCount} unread signals`,
      triggeredAt: new Date(),
      appKey: 'signalboard',
    })
  }

  return alerts
}
