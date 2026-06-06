import path from 'path';
import fs from 'fs';
import os from 'os';
const BUS_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'CyberTools');
const BUS_FILE = path.join(BUS_DIR, 'ecosystem-events.json');
const MAX_EVENTS = 150;
function ensureDir() {
    if (!fs.existsSync(BUS_DIR))
        fs.mkdirSync(BUS_DIR, { recursive: true });
}
export function readEvents() {
    try {
        ensureDir();
        if (!fs.existsSync(BUS_FILE))
            return [];
        return JSON.parse(fs.readFileSync(BUS_FILE, 'utf8')) || [];
    }
    catch {
        return [];
    }
}
export function emitEvent(appName, eventType, data = {}) {
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
        if (events.length > MAX_EVENTS)
            events.splice(MAX_EVENTS);
        // Atomic write — every CyberTools app emits into this same file. A
        // sibling app reading mid-write would parse-throw or see a truncated
        // event list (we cap at MAX_EVENTS so the next emit would silently
        // drop history). tmp+rename keeps readers seeing either the previous
        // or the new bytes.
        const tmp = BUS_FILE + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(events, null, 2), 'utf8');
        fs.renameSync(tmp, BUS_FILE);
    }
    catch (e) {
        console.error('[EcosystemBus] emit error:', e.message);
    }
}
export function watchEvents(callback) {
    ensureDir();
    if (!fs.existsSync(BUS_FILE))
        fs.writeFileSync(BUS_FILE, '[]', 'utf8');
    let debounce;
    return fs.watch(BUS_FILE, () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => callback(readEvents()), 80);
    });
}
