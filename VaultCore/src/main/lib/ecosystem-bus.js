// ecosystem-bus.js
// CYBERTOOLS Ecosystem Event Bus — ItsEliias
// Shared local event bus. All apps write/read from a common JSON file.
// No network, no cloud — 100% local.

const path = require('path');
const fs   = require('fs');
const os   = require('os');

const BUS_DIR  = path.join(os.homedir(), 'Library', 'Application Support', 'CyberTools');
const BUS_FILE = path.join(BUS_DIR, 'ecosystem-events.json');
const MAX_EVENTS = 150;

function ensureDir() {
  if (!fs.existsSync(BUS_DIR)) fs.mkdirSync(BUS_DIR, { recursive: true });
}

function readEvents() {
  try {
    ensureDir();
    if (!fs.existsSync(BUS_FILE)) return [];
    const raw = fs.readFileSync(BUS_FILE, 'utf8');
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

function emitEvent(appName, eventType, data = {}) {
  try {
    ensureDir();
    const events = readEvents();
    events.unshift({
      id:        `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      app:       appName,
      event:     eventType,
      data
    });
    if (events.length > MAX_EVENTS) events.splice(MAX_EVENTS);
    fs.writeFileSync(BUS_FILE, JSON.stringify(events, null, 2), 'utf8');
  } catch (e) {
    console.error('[EcosystemBus] emit error:', e.message);
  }
}

function watchEvents(callback) {
  ensureDir();
  if (!fs.existsSync(BUS_FILE)) fs.writeFileSync(BUS_FILE, '[]', 'utf8');
  let debounce;
  const watcher = fs.watch(BUS_FILE, () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => callback(readEvents()), 80);
  });
  return watcher;
}

module.exports = { emitEvent, readEvents, watchEvents };
