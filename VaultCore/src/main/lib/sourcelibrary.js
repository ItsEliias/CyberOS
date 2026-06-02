'use strict';
// sourcelibrary.js — Source CRUD, scheduler management, health summaries
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const SOURCES_FILE = path.join(os.homedir(), 'cybertools-sources.json');

// ─── CRUD ─────────────────────────────────────────────────────────────────────

function readSources() {
  try {
    if (fs.existsSync(SOURCES_FILE)) {
      return JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[sourcelibrary] Read error:', e.message);
  }
  return [];
}

function writeSources(sources) {
  try {
    fs.writeFileSync(SOURCES_FILE, JSON.stringify(sources, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[sourcelibrary] Write error:', e.message);
    return false;
  }
}

function getAllSources() {
  return readSources();
}

function getSourceById(id) {
  return readSources().find(s => s.id === id) || null;
}

function getSourceByName(name) {
  return readSources().find(s => s.name === name) || null;
}

function addSource(source) {
  const sources = readSources();
  const newSource = {
    id: crypto.randomUUID ? crypto.randomUUID() : crypto.createHash('md5').update(Date.now() + Math.random().toString()).digest('hex'),
    createdAt: new Date().toISOString(),
    lastScraped: null,
    noteCount: 0,
    status: 'never-scraped', // never-scraped | up-to-date | updates-available | error
    schedule: {
      enabled: false,
      frequency: 'manual',
      cronExpression: null,
      conflictStrategy: 'skip'
    },
    ...source
  };
  sources.push(newSource);
  writeSources(sources);
  return newSource;
}

function updateSource(id, updates) {
  const sources = readSources();
  const idx = sources.findIndex(s => s.id === id);
  if (idx === -1) return null;
  sources[idx] = { ...sources[idx], ...updates };
  writeSources(sources);
  // Rebuild cron expression if frequency changed
  if (updates.schedule) {
    sources[idx].schedule.cronExpression = frequencyToCron(updates.schedule.frequency, updates.schedule.time);
  }
  writeSources(sources);
  return sources[idx];
}

function deleteSource(id) {
  const sources = readSources();
  const filtered = sources.filter(s => s.id !== id);
  writeSources(filtered);
  return true;
}

function updateSourceLastScraped(id, timestamp, result) {
  const sources = readSources();
  const idx = sources.findIndex(s => s.id === id);
  if (idx === -1) return;

  sources[idx].lastScraped = timestamp;
  sources[idx].noteCount = (result.saved || 0) + (result.updated || 0) + (sources[idx].noteCount || 0);
  sources[idx].status = result.failed > 0 ? 'error' : 'up-to-date';
  sources[idx].lastResult = {
    saved: result.saved || 0,
    updated: result.updated || 0,
    skipped: result.skipped || 0,
    failed: result.failed || 0
  };

  // Update health record on success
  const prevHealth = sources[idx].health || { consecutiveFailures: 0, status: 'unknown' };
  sources[idx].health = {
    lastChecked: timestamp,
    lastSuccess: timestamp,
    consecutiveFailures: 0,
    lastError: undefined,
    status: 'healthy'
  };

  // Calculate next run
  if (sources[idx].schedule && sources[idx].schedule.cronExpression) {
    try {
      sources[idx].schedule.nextRun = estimateNextRun(sources[idx].schedule.cronExpression);
    } catch (_) {}
  }

  writeSources(sources);
}

function updateSourceHealthFailure(id, errorMessage) {
  const sources = readSources();
  const idx = sources.findIndex(s => s.id === id);
  if (idx === -1) return;

  const prev = sources[idx].health || { consecutiveFailures: 0, status: 'unknown' };
  const failures = (prev.consecutiveFailures || 0) + 1;
  let status;
  if (failures >= 3) status = 'error';
  else if (failures >= 1) status = 'warning';
  else status = 'healthy';

  sources[idx].health = {
    lastChecked: new Date().toISOString(),
    lastSuccess: prev.lastSuccess,
    consecutiveFailures: failures,
    lastError: errorMessage,
    status
  };
  sources[idx].status = 'error';
  writeSources(sources);
}

function clearAll() {
  writeSources([]);
}

// ─── Health Summary ───────────────────────────────────────────────────────────

function getHealthSummary(vaultPath) {
  const sources = readSources();
  const totalNotes = sources.reduce((sum, s) => sum + (s.noteCount || 0), 0);

  let lastActivity = null;
  for (const s of sources) {
    if (s.lastScraped) {
      if (!lastActivity || new Date(s.lastScraped) > new Date(lastActivity)) {
        lastActivity = s.lastScraped;
      }
    }
  }

  let storageUsed = '—';
  if (vaultPath && fs.existsSync(vaultPath)) {
    try {
      const bytes = getDirSize(vaultPath);
      storageUsed = formatBytes(bytes);
    } catch (_) {}
  }

  return {
    totalSources: sources.length,
    totalNotes,
    lastActivity,
    storageUsed,
    statusBreakdown: {
      upToDate: sources.filter(s => s.status === 'up-to-date').length,
      neverScraped: sources.filter(s => s.status === 'never-scraped').length,
      error: sources.filter(s => s.status === 'error').length,
      updatesAvailable: sources.filter(s => s.status === 'updates-available').length
    }
  };
}

// ─── Cron helpers ─────────────────────────────────────────────────────────────

function frequencyToCron(frequency, time) {
  const [hour, minute] = parseTime(time || '09:00');

  switch (frequency) {
    case 'daily': return `${minute} ${hour} * * *`;
    case 'every-3-days': return `${minute} ${hour} */3 * *`;
    case 'weekly': return `${minute} ${hour} * * 1`; // Monday
    case 'every-2-weeks': return `${minute} ${hour} 1,15 * *`;
    case 'manual': return null;
    default: return null;
  }
}

function parseTime(timeStr) {
  try {
    const [h, m] = timeStr.split(':').map(Number);
    return [h || 9, m || 0];
  } catch (_) {
    return [9, 0];
  }
}

function estimateNextRun(cronExpr) {
  // Simple estimation — in production this would parse the cron expression properly
  const now = new Date();
  const next = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return next.toISOString();
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function getDirSize(dirPath) {
  let size = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const fullPath = path.join(dirPath, e.name);
    if (e.isDirectory()) size += getDirSize(fullPath);
    else size += fs.statSync(fullPath).size;
  }
  return size;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

module.exports = {
  getAllSources,
  getSourceById,
  getSourceByName,
  addSource,
  updateSource,
  deleteSource,
  updateSourceLastScraped,
  updateSourceHealthFailure,
  clearAll,
  getHealthSummary,
  frequencyToCron
};
