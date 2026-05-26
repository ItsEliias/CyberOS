export interface Snippet {
  id: string;
  name: string;
  command: string;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SnippetsData {
  snippets: Snippet[];
  usageCounts: Record<string, number>;
}

let snippets: Snippet[] = [];
let usageCounts: Record<string, number> = {};

function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') return raw.split(',').map(t => t.trim()).filter(Boolean);
  return [];
}

export function load(data: Partial<SnippetsData>): void {
  snippets = Array.isArray(data.snippets) ? data.snippets : [];
  usageCounts = data.usageCounts || {};
}

export function getAll(): Snippet[] {
  return snippets;
}

export function getById(id: string): Snippet | undefined {
  return snippets.find(s => s.id === id);
}

export function add(snippet: Partial<Snippet>): Snippet {
  const s: Snippet = {
    id: makeId(),
    name: snippet.name || 'Untitled Snippet',
    command: snippet.command || '',
    tags: parseTags(snippet.tags),
    notes: snippet.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  snippets.unshift(s);
  return s;
}

export function update(id: string, changes: Partial<Snippet>): Snippet | null {
  const idx = snippets.findIndex(s => s.id === id);
  if (idx === -1) return null;
  snippets[idx] = {
    ...snippets[idx],
    ...changes,
    id,
    updatedAt: new Date().toISOString(),
    tags: changes.tags !== undefined ? parseTags(changes.tags) : snippets[idx].tags,
  };
  return snippets[idx];
}

export function remove(id: string): boolean {
  const idx = snippets.findIndex(s => s.id === id);
  if (idx === -1) return false;
  snippets.splice(idx, 1);
  delete usageCounts[id];
  return true;
}

export function recordUsage(id: string): void {
  usageCounts[id] = (usageCounts[id] || 0) + 1;
}

export function search(query: string, tags: string[] = []): Snippet[] {
  const q = (query || '').toLowerCase().trim();
  return snippets.filter(s => {
    const matchQuery = !q ||
      s.name.toLowerCase().includes(q) ||
      s.command.toLowerCase().includes(q) ||
      s.notes.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q));
    const matchTags = tags.length === 0 || tags.every(tag => s.tags.includes(tag));
    return matchQuery && matchTags;
  });
}

export function sortSnippets(list: Snippet[], by = 'recent'): Snippet[] {
  const arr = [...list];
  switch (by) {
    case 'most-used': return arr.sort((a, b) => (usageCounts[b.id] || 0) - (usageCounts[a.id] || 0));
    case 'alpha':     return arr.sort((a, b) => a.name.localeCompare(b.name));
    default:          return arr.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}

export function exportJSON(): string {
  return JSON.stringify({ snippets, usageCounts, exportedAt: new Date().toISOString() }, null, 2);
}

export function importJSON(jsonStr: string): { success: boolean; added?: number; total?: number; error?: string } {
  try {
    const data = JSON.parse(jsonStr);
    const incoming: Partial<Snippet>[] = Array.isArray(data.snippets) ? data.snippets : (Array.isArray(data) ? data : []);
    let added = 0;
    incoming.forEach(s => {
      if (s.command && !snippets.find(ex => ex.command === s.command && ex.name === s.name)) {
        add(s);
        added++;
      }
    });
    return { success: true, added, total: incoming.length };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function getAllTags(): string[] {
  const tagSet = new Set<string>();
  snippets.forEach(s => s.tags.forEach(t => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

export function serialize(): SnippetsData {
  return { snippets, usageCounts };
}
