// labtracker.js — Lab card CRUD, kanban state, HTB/THM API sync, bulk import

'use strict';

const COLUMNS = ['todo', 'inprogress', 'completed'];
const PLATFORMS = ['HTB', 'THM', 'PentesterLab', 'PortSwigger', 'CTF', 'VulnHub', 'PNPT', 'Cisco', 'TryHackMe', 'Other'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Insane'];

let labs = [];

function load(data) {
  labs = Array.isArray(data) ? data : [];
}

function getAll() {
  return labs;
}

function getByColumn(column) {
  return labs.filter(l => l.column === column);
}

function getById(id) {
  return labs.find(l => l.id === id);
}

function add(lab) {
  const l = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    name: lab.name || 'Unnamed Lab',
    platform: lab.platform || 'HTB',
    difficulty: lab.difficulty || 'Medium',
    column: lab.column || 'todo',
    tags: Array.isArray(lab.tags) ? lab.tags : (lab.tags ? lab.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
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

function update(id, changes) {
  const idx = labs.findIndex(l => l.id === id);
  if (idx === -1) return null;
  const old = labs[idx];
  labs[idx] = {
    ...old,
    ...changes,
    id,
    tags: Array.isArray(changes.tags) ? changes.tags : (changes.tags !== undefined ? changes.tags.split(',').map(t => t.trim()).filter(Boolean) : old.tags),
  };
  // Set completedAt when moved to completed
  if (changes.column === 'completed' && !old.completedAt) {
    labs[idx].completedAt = new Date().toISOString();
  }
  return labs[idx];
}

function moveToColumn(id, column) {
  if (!COLUMNS.includes(column)) return null;
  return update(id, { column });
}

function remove(id) {
  const idx = labs.findIndex(l => l.id === id);
  if (idx === -1) return false;
  labs.splice(idx, 1);
  return true;
}

function reorder(column, fromIdx, toIdx) {
  const col = labs.filter(l => l.column === column);
  const others = labs.filter(l => l.column !== column);
  const [moved] = col.splice(fromIdx, 1);
  col.splice(toIdx, 0, moved);
  labs = [...others, ...col];
}

function bulkImport(text, column = 'todo', platform = 'HTB', difficulty = 'Medium') {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const added = [];
  lines.forEach(name => {
    if (!labs.find(l => l.name.toLowerCase() === name.toLowerCase())) {
      added.push(add({ name, column, platform, difficulty }));
    }
  });
  return added;
}

function search(query) {
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

function filter(opts = {}) {
  return labs.filter(l => {
    if (opts.platform && l.platform !== opts.platform) return false;
    if (opts.difficulty && l.difficulty !== opts.difficulty) return false;
    if (opts.column && l.column !== opts.column) return false;
    if (opts.tag && !l.tags.includes(opts.tag)) return false;
    if (opts.rating && l.rating < opts.rating) return false;
    return true;
  });
}

function sortLabs(list, by = 'date-added') {
  const arr = [...list];
  switch (by) {
    case 'name':       return arr.sort((a,b) => a.name.localeCompare(b.name));
    case 'difficulty': return arr.sort((a,b) => DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty));
    case 'platform':   return arr.sort((a,b) => a.platform.localeCompare(b.platform));
    case 'rating':     return arr.sort((a,b) => (b.rating || 0) - (a.rating || 0));
    case 'date-added':
    default:           return arr.sort((a,b) => new Date(b.addedAt) - new Date(a.addedAt));
  }
}

// HTB API integration
async function syncHTB(apiKey) {
  if (!apiKey) throw new Error('HTB API key required');
  const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

  // Get completed machines
  const resp = await fetch('https://www.hackthebox.com/api/v4/profile/activity', { headers });
  if (!resp.ok) throw new Error(`HTB API error: ${resp.status} ${resp.statusText}`);
  const data = await resp.json();

  const machines = data.profile?.activity || [];
  let synced = 0;
  machines.forEach(m => {
    if (m.type === 'machine' && m.object_type === 'Machine') {
      const existing = labs.find(l => l.externalId === String(m.id) && l.syncSource === 'htb');
      if (!existing) {
        add({
          name: m.name || 'Unknown Machine',
          platform: 'HTB',
          difficulty: m.difficulty || 'Medium',
          column: 'completed',
          completedAt: m.created_at || new Date().toISOString(),
          syncSource: 'htb',
          externalId: String(m.id),
          tags: [m.os || 'Linux', 'HTB'].filter(Boolean),
        });
        synced++;
      }
    }
  });
  return { synced, total: machines.length };
}

// THM API integration
async function syncTHM(username) {
  if (!username) throw new Error('THM username required');
  const resp = await fetch(`https://tryhackme.com/api/user/badges/${username}`);
  if (!resp.ok) throw new Error(`THM API error: ${resp.status} ${resp.statusText}`);
  const data = await resp.json();

  // THM completions via public profile
  const completedRooms = data.completedRooms || [];
  let synced = 0;
  completedRooms.forEach(room => {
    const existing = labs.find(l => l.externalId === room.code && l.syncSource === 'thm');
    if (!existing) {
      add({
        name: room.title || room.code,
        platform: 'THM',
        difficulty: room.difficulty || 'Medium',
        column: 'completed',
        syncSource: 'thm',
        externalId: room.code,
        url: `https://tryhackme.com/room/${room.code}`,
        tags: ['THM'],
      });
      synced++;
    }
  });
  return { synced, total: completedRooms.length };
}

function getStats() {
  return {
    total: labs.length,
    todo: labs.filter(l => l.column === 'todo').length,
    inprogress: labs.filter(l => l.column === 'inprogress').length,
    completed: labs.filter(l => l.column === 'completed').length,
    byPlatform: PLATFORMS.reduce((acc, p) => {
      acc[p] = labs.filter(l => l.platform === p).length;
      return acc;
    }, {}),
    byDifficulty: DIFFICULTIES.reduce((acc, d) => {
      acc[d] = labs.filter(l => l.difficulty === d).length;
      return acc;
    }, {}),
  };
}

function serialize() {
  return labs;
}

module.exports = {
  COLUMNS, PLATFORMS, DIFFICULTIES,
  load, getAll, getByColumn, getById, add, update, moveToColumn, remove,
  reorder, bulkImport, search, filter, sortLabs, syncHTB, syncTHM, getStats, serialize
};
