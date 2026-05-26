import fs from 'fs';
import path from 'path';
import os from 'os';

const EVENTS_PATH = path.join(
  os.homedir(), 'Library', 'Application Support', 'CyberTools', 'ecosystem-events.json'
);
const MAX_EVENTS = 150;

interface EcosystemEvent {
  id: string;
  appName: string;
  eventType: string;
  data: Record<string, unknown>;
  timestamp: string;
}

function readEvents(): EcosystemEvent[] {
  try {
    if (!fs.existsSync(EVENTS_PATH)) return [];
    return JSON.parse(fs.readFileSync(EVENTS_PATH, 'utf8'));
  } catch { return []; }
}

export function emitEvent(appName: string, eventType: string, data: Record<string, unknown> = {}): void {
  try {
    const dir = path.dirname(EVENTS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const events = readEvents();
    events.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      appName, eventType, data, timestamp: new Date().toISOString()
    });
    if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
    const tmp = EVENTS_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(events, null, 2), 'utf8');
    fs.renameSync(tmp, EVENTS_PATH);
  } catch (err) {
    console.error('[ecosystem-bus]', (err as Error).message);
  }
}
