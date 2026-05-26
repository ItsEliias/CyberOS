import fs from 'fs';
import type {
  CyberlabStatus, VaultscraperStatus,
  ParsedCyberlabStatus, ParsedVaultscraperStatus
} from '../shared/types.js';

export function parseCyberlabStatus(raw: CyberlabStatus | null | undefined): ParsedCyberlabStatus {
  const empty: ParsedCyberlabStatus = {
    connected: false, sessionActive: false, currentLab: null,
    sessionTime: null, hintLevel: null, streak: 0, labsDone: 0,
    findingsCount: 0, lastActive: null, isStale: true
  };
  if (!raw || typeof raw !== 'object') return empty;

  const now        = Date.now();
  const lastActive = raw.lastActive ? new Date(raw.lastActive).getTime() : 0;
  const isStale    = lastActive > 0 ? (now - lastActive) > 60000 : true;

  let sessionTime: string | null = null;
  if (raw.sessionActive && raw.sessionStart) {
    const elapsedSec = Math.max(0, Math.floor((now - new Date(raw.sessionStart).getTime()) / 1000));
    sessionTime = formatDuration(elapsedSec);
  } else if (raw.sessionTime) {
    sessionTime = raw.sessionTime;
  }

  return {
    connected     : true,
    sessionActive : !!raw.sessionActive,
    currentLab    : raw.currentLab    || null,
    sessionTime,
    hintLevel     : raw.hintLevel     ?? null,
    streak        : Number(raw.streak)        || 0,
    labsDone      : Number(raw.labsDone)      || 0,
    findingsCount : Number(raw.findingsCount) || 0,
    lastActive    : raw.lastActive || null,
    isStale
  };
}

export function parseVaultscraperStatus(raw: VaultscraperStatus | null | undefined): ParsedVaultscraperStatus {
  const empty: ParsedVaultscraperStatus = {
    connected: false, activeScrape: null, progress: 0,
    lastScrape: null, nextScheduled: null, vaultNoteCount: 0,
    totalSources: 0, lastScrapeNew: 0, lastScrapeUpdated: 0,
    isStale: true, hasError: false
  };
  if (!raw || typeof raw !== 'object') return empty;

  const now        = Date.now();
  const lastActive = raw.lastActive ? new Date(raw.lastActive).getTime() : 0;
  const isStale    = lastActive > 0 ? (now - lastActive) > 60000 : true;

  return {
    connected         : true,
    activeScrape      : raw.activeScrape   || null,
    progress          : raw.activeScrape   ? (Number(raw.activeScrape.progress) || 0) : 0,
    lastScrape        : raw.lastScrape     || null,
    nextScheduled     : raw.nextScheduled  || null,
    vaultNoteCount    : Number(raw.vaultNoteCount)    || 0,
    totalSources      : Number(raw.totalSources)      || 0,
    lastScrapeNew     : Number(raw.lastScrapeNew)     || 0,
    lastScrapeUpdated : Number(raw.lastScrapeUpdated) || 0,
    isStale,
    hasError          : !!(raw.error)
  };
}

export function checkAppHealth(execPath: string): { healthy: boolean; reason: string | null } {
  if (!execPath || typeof execPath !== 'string' || execPath.trim() === '') {
    return { healthy: false, reason: 'not_configured' };
  }
  if (!fs.existsSync(execPath)) {
    return { healthy: false, reason: 'not_found' };
  }
  return { healthy: true, reason: null };
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatRelativeTime(isoString: string | null | undefined): string | null {
  if (!isoString) return null;
  try {
    const date    = new Date(isoString);
    const now     = new Date();
    const diffMs  = now.getTime() - date.getTime();
    if (isNaN(diffMs)) return null;

    const diffSec  = Math.floor(diffMs / 1000);
    const diffMin  = Math.floor(diffSec  / 60);
    const diffHour = Math.floor(diffMin  / 60);
    const diffDay  = Math.floor(diffHour / 24);

    if (diffSec  <  60)  return 'just now';
    if (diffMin  <  60)  return `${diffMin}m ago`;
    if (diffHour <  24)  return `${diffHour}h ago`;
    if (diffDay  === 1)  return 'Yesterday';
    if (diffDay  <   7)  return `${diffDay} days ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (_) {
    return null;
  }
}

export function formatFutureTime(isoString: string | null | undefined): string | null {
  if (!isoString) return null;
  try {
    const date   = new Date(isoString);
    const now    = new Date();
    const diffMs = date.getTime() - now.getTime();
    if (isNaN(diffMs) || diffMs < 0) return formatRelativeTime(isoString);

    const diffSec  = Math.floor(diffMs / 1000);
    const diffMin  = Math.floor(diffSec  / 60);
    const diffHour = Math.floor(diffMin  / 60);
    const diffDay  = Math.floor(diffHour / 24);

    if (diffSec  <  60)  return 'in <1m';
    if (diffMin  <  60)  return `in ${diffMin}m`;
    if (diffHour <  24)  return `in ${diffHour}h`;
    if (diffDay  === 1)  return 'Tomorrow';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (_) {
    return null;
  }
}
