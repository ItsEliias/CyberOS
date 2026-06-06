import path from 'path';
import fs from 'fs';
import os from 'os';
import { ecosystemBusPath } from './platform';

const BUS_FILE = ecosystemBusPath();
const BUS_DIR  = path.dirname(BUS_FILE);
const MAX_EVENTS = 150;

function ensureDir() {
  if (!fs.existsSync(BUS_DIR)) fs.mkdirSync(BUS_DIR, { recursive: true });
}

export function readEvents() {
  try {
    ensureDir();
    if (!fs.existsSync(BUS_FILE)) return [];
    return JSON.parse(fs.readFileSync(BUS_FILE, 'utf8')) || [];
  } catch { return []; }
}

export function emitEvent(appName: string, eventType: string, data: Record<string, unknown> = {}) {
  try {
    ensureDir();
    const events = readEvents();
    events.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      app: appName,
      event: eventType,
      data,
    });
    if (events.length > MAX_EVENTS) events.splice(MAX_EVENTS);

    // Atomic write — every CyberTools app emits into this same file. A
    // sibling app reading mid-write would parse-throw or see a truncated
    // event list (we cap at MAX_EVENTS so the next emit would silently
    // drop history). tmp+rename keeps readers seeing either the previous
    // or the new bytes.
    const tmp = BUS_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(events, null, 2), 'utf8');
    fs.renameSync(tmp, BUS_FILE);
  } catch (e: unknown) {
    console.error('[EcosystemBus] emit error:', (e as Error).message);
  }
}

export function watchEvents(callback: (events: unknown[]) => void) {
  ensureDir();
  if (!fs.existsSync(BUS_FILE)) fs.writeFileSync(BUS_FILE, '[]', 'utf8');
  let debounce: ReturnType<typeof setTimeout>;
  return fs.watch(BUS_FILE, () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => callback(readEvents()), 80);
  });
}
