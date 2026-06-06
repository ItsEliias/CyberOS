// cron.ts — Renderer-side cron helpers.
// The authoritative next-run computation lives in main (via cron-parser); this
// file provides a lightweight local fallback for instant feedback as the user
// types, plus a relative-time formatter for "Next: in 2h 14m".

interface CronField {
  list: number[];
  any: boolean; // '*' or every-step covering full range
}

const RANGES = [
  [0, 59],   // minute
  [0, 23],   // hour
  [1, 31],   // day-of-month
  [1, 12],   // month
  [0, 6],    // day-of-week (0=Sun)
];

function parseField(token: string, min: number, max: number): CronField | null {
  if (token === '*') return { list: range(min, max), any: true };
  const parts = token.split(',');
  const values = new Set<number>();
  for (const p of parts) {
    let step = 1;
    let body = p;
    if (p.includes('/')) {
      const [b, s] = p.split('/');
      body = b;
      step = parseInt(s, 10);
      if (!Number.isFinite(step) || step <= 0) return null;
    }
    let from = min, to = max;
    if (body === '*' || body === '') {
      from = min; to = max;
    } else if (body.includes('-')) {
      const [a, b] = body.split('-').map(n => parseInt(n, 10));
      if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
      from = a; to = b;
    } else {
      const n = parseInt(body, 10);
      if (!Number.isFinite(n)) return null;
      from = n; to = n;
    }
    for (let v = from; v <= to; v += step) values.add(v);
  }
  return { list: [...values].sort((a, b) => a - b), any: values.size === (max - min + 1) };
}

function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
}

/**
 * Compute next-run for a standard 5-field cron expression. Returns ISO string
 * or null on invalid input. This is a best-effort local previewer — the main
 * process uses cron-parser for the authoritative answer.
 */
export function computeNextRunLocal(expression: string): string | null {
  const tokens = expression.trim().split(/\s+/);
  if (tokens.length !== 5) return null;
  const fields: CronField[] = [];
  for (let i = 0; i < 5; i++) {
    const f = parseField(tokens[i]!, RANGES[i]![0]!, RANGES[i]![1]!);
    if (!f) return null;
    fields.push(f);
  }

  const [minF, hourF, domF, monF, dowF] = fields as [CronField, CronField, CronField, CronField, CronField];
  const minSet = new Set(minF.list);
  const hourSet = new Set(hourF.list);
  const monSet = new Set(monF.list);
  const domSet = new Set(domF.list);
  const dowSet = new Set(dowF.list);

  // Search up to 4 years out — enough for monthly/weekly patterns.
  const now = new Date();
  const cursor = new Date(now.getTime() + 60_000);
  cursor.setSeconds(0, 0);

  const ceiling = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 366 * 4);
  while (cursor < ceiling) {
    const month = cursor.getMonth() + 1;
    if (!monSet.has(month)) {
      cursor.setMonth(cursor.getMonth() + 1, 1);
      cursor.setHours(0, 0, 0, 0);
      continue;
    }
    const dom = cursor.getDate();
    const dow = cursor.getDay();
    // Standard cron treats DOM and DOW as OR when either is restricted.
    const domRestricted = !domF.any;
    const dowRestricted = !dowF.any;
    const domMatch = domSet.has(dom);
    const dowMatch = dowSet.has(dow);
    let dayOk = true;
    if (domRestricted && dowRestricted) dayOk = domMatch || dowMatch;
    else if (domRestricted) dayOk = domMatch;
    else if (dowRestricted) dayOk = dowMatch;
    if (!dayOk) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
      continue;
    }
    if (!hourSet.has(cursor.getHours())) {
      cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
      continue;
    }
    if (!minSet.has(cursor.getMinutes())) {
      cursor.setMinutes(cursor.getMinutes() + 1, 0, 0);
      continue;
    }
    return cursor.toISOString();
  }
  return null;
}

/** Format an ISO timestamp as "in 2h 14m" / "in 3d" / "in 45s" or "overdue". */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const target = new Date(iso).getTime();
  if (!Number.isFinite(target)) return '—';
  let diff = Math.round((target - Date.now()) / 1000);
  if (diff <= 0) return 'overdue';
  if (diff < 60) return `in ${diff}s`;
  if (diff < 3600) return `in ${Math.floor(diff / 60)}m`;
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
  }
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  return h > 0 ? `in ${d}d ${h}h` : `in ${d}d`;
}
