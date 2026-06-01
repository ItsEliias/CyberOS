export const LAB_COLUMNS = ['todo', 'inprogress', 'completed'] as const;
export type LabColumn = typeof LAB_COLUMNS[number];

export const LAB_PLATFORMS = ['HTB','THM','PentesterLab','PortSwigger','CTF','VulnHub','PNPT','Cisco','TryHackMe','Other'] as const;
export const LAB_DIFFICULTIES = ['Easy','Medium','Hard','Insane'] as const;

export interface Lab {
  id: string;
  name: string;
  platform: string;
  difficulty: string;
  column: LabColumn;
  tags: string[];
  notes: string;
  url: string;
  rating: number;
  writeupPath: string;
  addedAt: string;
  completedAt: string | null;
  syncSource: string;
  externalId: string | null;
  timeToComplete: number | null;
}

export interface LabStats {
  total: number;
  todo: number;
  inprogress: number;
  completed: number;
  byPlatform: Record<string, number>;
  byDifficulty: Record<string, number>;
}

let labs: Lab[] = [];

function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export function load(data: unknown): void {
  labs = Array.isArray(data) ? data as Lab[] : [];
}

export function getAll(): Lab[] {
  return labs;
}

export function getByColumn(column: LabColumn): Lab[] {
  return labs.filter(l => l.column === column);
}

export function getById(id: string): Lab | undefined {
  return labs.find(l => l.id === id);
}

export function add(lab: Partial<Lab>): Lab {
  const tagsRaw = lab.tags;
  const tags = Array.isArray(tagsRaw) ? tagsRaw : (tagsRaw ? String(tagsRaw).split(',').map(t => t.trim()).filter(Boolean) : []);
  const l: Lab = {
    id: makeId(),
    name: lab.name || 'Unnamed Lab',
    platform: lab.platform || 'HTB',
    difficulty: lab.difficulty || 'Medium',
    column: lab.column || 'todo',
    tags,
    notes: lab.notes || '',
    url: lab.url || '',
    rating: lab.rating || 0,
    writeupPath: lab.writeupPath || '',
    addedAt: new Date().toISOString(),
    completedAt: lab.completedAt || null,
    syncSource: lab.syncSource || 'manual',
    externalId: lab.externalId || null,
    timeToComplete: lab.timeToComplete || null,
  };
  labs.unshift(l);
  return l;
}

export function update(id: string, changes: Partial<Lab>): Lab | null {
  const idx = labs.findIndex(l => l.id === id);
  if (idx === -1) return null;
  const old = labs[idx];
  const tagsRaw = changes.tags;
  const tags = tagsRaw !== undefined
    ? (Array.isArray(tagsRaw) ? tagsRaw : String(tagsRaw).split(',').map(t => t.trim()).filter(Boolean))
    : old.tags;
  labs[idx] = { ...old, ...changes, id, tags };
  if (changes.column === 'completed' && !old.completedAt) {
    labs[idx].completedAt = new Date().toISOString();
  }
  return labs[idx];
}

export function moveToColumn(id: string, column: LabColumn): Lab | null {
  if (!LAB_COLUMNS.includes(column)) return null;
  return update(id, { column });
}

export function remove(id: string): boolean {
  const idx = labs.findIndex(l => l.id === id);
  if (idx === -1) return false;
  labs.splice(idx, 1);
  return true;
}

export function reorder(column: LabColumn, fromIdx: number, toIdx: number): void {
  const col = labs.filter(l => l.column === column);
  const others = labs.filter(l => l.column !== column);
  const [moved] = col.splice(fromIdx, 1);
  col.splice(toIdx, 0, moved);
  labs = [...others, ...col];
}

export function bulkImport(text: string, column: LabColumn = 'todo', platform = 'HTB', difficulty = 'Medium'): Lab[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const added: Lab[] = [];
  lines.forEach(name => {
    if (!labs.find(l => l.name.toLowerCase() === name.toLowerCase())) {
      added.push(add({ name, column, platform, difficulty }));
    }
  });
  return added;
}

export function searchLabs(query: string): Lab[] {
  const q = (query || '').toLowerCase().trim();
  if (!q) return labs;
  return labs.filter(l =>
    l.name.toLowerCase().includes(q) ||
    l.platform.toLowerCase().includes(q) ||
    l.difficulty.toLowerCase().includes(q) ||
    l.tags.some(t => t.toLowerCase().includes(q)) ||
    (l.notes && l.notes.toLowerCase().includes(q))
  );
}

export function filterLabs(opts: { platform?: string; difficulty?: string; column?: LabColumn; tag?: string; rating?: number } = {}): Lab[] {
  return labs.filter(l => {
    if (opts.platform && l.platform !== opts.platform) return false;
    if (opts.difficulty && l.difficulty !== opts.difficulty) return false;
    if (opts.column && l.column !== opts.column) return false;
    if (opts.tag && !l.tags.includes(opts.tag)) return false;
    if (opts.rating && l.rating < opts.rating) return false;
    return true;
  });
}

export function sortLabs(list: Lab[], by = 'date-added'): Lab[] {
  const arr = [...list];
  switch (by) {
    case 'name':       return arr.sort((a, b) => a.name.localeCompare(b.name));
    case 'difficulty': return arr.sort((a, b) => LAB_DIFFICULTIES.indexOf(a.difficulty as never) - LAB_DIFFICULTIES.indexOf(b.difficulty as never));
    case 'platform':   return arr.sort((a, b) => a.platform.localeCompare(b.platform));
    case 'rating':     return arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    default:           return arr.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
  }
}

export function getLabStats(): LabStats {
  return {
    total: labs.length,
    todo: labs.filter(l => l.column === 'todo').length,
    inprogress: labs.filter(l => l.column === 'inprogress').length,
    completed: labs.filter(l => l.column === 'completed').length,
    byPlatform: LAB_PLATFORMS.reduce((acc, p) => { acc[p] = labs.filter(l => l.platform === p).length; return acc; }, {} as Record<string, number>),
    byDifficulty: LAB_DIFFICULTIES.reduce((acc, d) => { acc[d] = labs.filter(l => l.difficulty === d).length; return acc; }, {} as Record<string, number>),
  };
}

export function serialize(): Lab[] {
  return labs;
}
