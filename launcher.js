'use strict';
/**
 * launcher.js — status parsing, health checking, time formatting
 * Pure functions — no I/O, no side effects.
 */

const fs   = require('fs');

// ─── CyberLab status parser ───────────────────────────────────────────────────

/**
 * Parse the raw cyberlab_status object (written by CyberLab every 10s)
 * into a display-ready structure.
 */
function parseCyberlabStatus(raw) {
  const empty = {
    connected     : false,
    sessionActive : false,
    currentLab    : null,
    sessionTime   : null,
    hintLevel     : null,
    streak        : 0,
    labsDone      : 0,
    findingsCount : 0,
    lastActive    : null,
    isStale       : true
  };

  if (!raw || typeof raw !== 'object') return empty;

  const now        = Date.now();
  const lastActive = raw.lastActive ? new Date(raw.lastActive).getTime() : 0;
  const isStale    = lastActive > 0 ? (now - lastActive) > 60000 : true;

  // Compute elapsed session time string
  let sessionTime = null;
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
    hintLevel     : raw.hintLevel     || null,
    streak        : Number(raw.streak)        || 0,
    labsDone      : Number(raw.labsDone)      || 0,
    findingsCount : Number(raw.findingsCount) || 0,
    lastActive    : raw.lastActive || null,
    isStale
  };
}

// ─── Vault Scraper status parser ──────────────────────────────────────────────

/**
 * Parse the raw vaultscraper_status object into a display-ready structure.
 */
function parseVaultscraperStatus(raw) {
  const empty = {
    connected         : false,
    activeScrape      : null,
    progress          : 0,
    lastScrape        : null,
    nextScheduled     : null,
    vaultNoteCount    : 0,
    totalSources      : 0,
    lastScrapeNew     : 0,
    lastScrapeUpdated : 0,
    isStale           : true,
    hasError          : false
  };

  if (!raw || typeof raw !== 'object') return empty;

  const now        = Date.now();
  const lastActive = raw.lastActive ? new Date(raw.lastActive).getTime() : 0;
  const isStale    = lastActive > 0 ? (now - lastActive) > 60000 : true;

  return {
    connected         : true,
    activeScrape      : raw.activeScrape   || null,   // { name, progress }
    progress          : raw.activeScrape   ? (Number(raw.activeScrape.progress) || 0) : 0,
    lastScrape        : raw.lastScrape     || null,   // ISO string
    nextScheduled     : raw.nextScheduled  || null,   // ISO string
    vaultNoteCount    : Number(raw.vaultNoteCount)    || 0,
    totalSources      : Number(raw.totalSources)      || 0,
    lastScrapeNew     : Number(raw.lastScrapeNew)     || 0,
    lastScrapeUpdated : Number(raw.lastScrapeUpdated) || 0,
    isStale,
    hasError          : !!(raw.error)
  };
}

// ─── Health check ─────────────────────────────────────────────────────────────

/**
 * Returns { healthy: boolean, reason: string|null }
 */
function checkAppHealth(execPath) {
  if (!execPath || typeof execPath !== 'string' || execPath.trim() === '') {
    return { healthy: false, reason: 'not_configured' };
  }
  if (!fs.existsSync(execPath)) {
    return { healthy: false, reason: 'not_found' };
  }
  return { healthy: true, reason: null };
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

/**
 * Format elapsed seconds → "1h 23m", "45m 10s", "30s"
 */
function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Format an ISO timestamp to a human-readable relative string.
 * "just now" / "3m ago" / "2h ago" / "Yesterday" / "3 days ago" / date string
 */
function formatRelativeTime(isoString) {
  if (!isoString) return null;
  try {
    const date    = new Date(isoString);
    const now     = new Date();
    const diffMs  = now - date;
    if (isNaN(diffMs)) return null;

    const diffSec  = Math.floor(diffMs / 1000);
    const diffMin  = Math.floor(diffSec  / 60);
    const diffHour = Math.floor(diffMin  / 60);
    const diffDay  = Math.floor(diffHour / 24);

    if (diffSec  <  60)  return 'just now';
    if (diffMin  <  60)  return `${diffMin}m ago`;
    if (diffHour <  24)  return `${diffHour}h ago`;
    if (diffDay  ===  1) return 'Yesterday';
    if (diffDay  <    7) return `${diffDay} days ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (e) {
    return null;
  }
}

/**
 * Format an ISO timestamp for a future event.
 * "in 3m" / "in 2h" / "Tomorrow" / date string
 */
function formatFutureTime(isoString) {
  if (!isoString) return null;
  try {
    const date   = new Date(isoString);
    const now    = new Date();
    const diffMs = date - now;
    if (isNaN(diffMs) || diffMs < 0) return formatRelativeTime(isoString);

    const diffSec  = Math.floor(diffMs / 1000);
    const diffMin  = Math.floor(diffSec  / 60);
    const diffHour = Math.floor(diffMin  / 60);
    const diffDay  = Math.floor(diffHour / 24);

    if (diffSec  <  60)  return 'in <1m';
    if (diffMin  <  60)  return `in ${diffMin}m`;
    if (diffHour <  24)  return `in ${diffHour}h`;
    if (diffDay  ===  1) return 'Tomorrow';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (e) {
    return null;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  parseCyberlabStatus,
  parseVaultscraperStatus,
  checkAppHealth,
  formatDuration,
  formatRelativeTime,
  formatFutureTime
};
