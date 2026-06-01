import fs from 'fs';
import path from 'path';
import os from 'os';
import type { EcosystemEvent } from '../shared/types.js';

const EVENTS_PATH = path.join(
  os.homedir(), 'Library', 'Application Support', 'CyberTools', 'ecosystem-events.json'
);
const MAX_EVENTS = 150;
const DEBOUNCE_MS = 80;

let watchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let fsWatcher: fs.FSWatcher | null = null;

export function readEvents(): EcosystemEvent[] {
  try {
    if (!fs.existsSync(EVENTS_PATH)) return [];
    const raw = fs.readFileSync(EVENTS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function emitEvent(appName: string, eventType: string, data: Record<string, unknown> = {}): void {
  try {
    const dir = path.dirname(EVENTS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const events = readEvents();
    events.unshift({
      id       : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      appName,
      eventType,
      data,
      timestamp: new Date().toISOString()
    });

    if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;

    const tmp = EVENTS_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(events, null, 2), 'utf8');
    fs.renameSync(tmp, EVENTS_PATH);
  } catch (err) {
    console.error('[ecosystem-bus] emitEvent error:', (err as Error).message);
  }
}

export function watchEvents(callback: (events: EcosystemEvent[]) => void): () => void {
  try {
    const dir = path.dirname(EVENTS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(EVENTS_PATH)) fs.writeFileSync(EVENTS_PATH, '[]', 'utf8');

    fsWatcher = fs.watch(EVENTS_PATH, () => {
      if (watchDebounceTimer) clearTimeout(watchDebounceTimer);
      watchDebounceTimer = setTimeout(() => {
        callback(readEvents());
      }, DEBOUNCE_MS);
    });
  } catch (err) {
    console.error('[ecosystem-bus] watchEvents error:', (err as Error).message);
  }

  return () => {
    if (watchDebounceTimer) clearTimeout(watchDebounceTimer);
    if (fsWatcher) { fsWatcher.close(); fsWatcher = null; }
  };
}
