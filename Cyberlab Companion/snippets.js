// snippets.js — Personal snippet library CRUD, search, import/export

'use strict';

let snippets = [];
let usageCounts = {};

function load(data) {
  snippets = Array.isArray(data.snippets) ? data.snippets : [];
  usageCounts = data.usageCounts || {};
}

function getAll() {
  return snippets;
}

function getById(id) {
  return snippets.find(s => s.id === id);
}

function add(snippet) {
  const s = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    name: snippet.name || 'Untitled Snippet',
    command: snippet.command || '',
    tags: Array.isArray(snippet.tags) ? snippet.tags : (snippet.tags ? snippet.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
    notes: snippet.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  snippets.unshift(s);
  return s;
}

function update(id, changes) {
  const idx = snippets.findIndex(s => s.id === id);
  if (idx === -1) return null;
  snippets[idx] = {
    ...snippets[idx],
    ...changes,
    id,
    updatedAt: new Date().toISOString(),
    tags: Array.isArray(changes.tags) ? changes.tags : (changes.tags ? changes.tags.split(',').map(t => t.trim()).filter(Boolean) : snippets[idx].tags),
  };
  return snippets[idx];
}

function remove(id) {
  const idx = snippets.findIndex(s => s.id === id);
  if (idx === -1) return false;
  snippets.splice(idx, 1);
  delete usageCounts[id];
  return true;
}

function recordUsage(id) {
  usageCounts[id] = (usageCounts[id] || 0) + 1;
}

function search(query, tags = []) {
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

function sort(list, by = 'recent') {
  const arr = [...list];
  switch (by) {
    case 'most-used':
      return arr.sort((a, b) => (usageCounts[b.id] || 0) - (usageCounts[a.id] || 0));
    case 'alpha':
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case 'recent':
    default:
      return arr.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
}

function exportJSON() {
  return JSON.stringify({ snippets, usageCounts, exportedAt: new Date().toISOString() }, null, 2);
}

function importJSON(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    const incoming = Array.isArray(data.snippets) ? data.snippets : (Array.isArray(data) ? data : []);
    let added = 0;
    incoming.forEach(s => {
      if (s.command && !snippets.find(ex => ex.command === s.command && ex.name === s.name)) {
        add(s);
        added++;
      }
    });
    return { success: true, added, total: incoming.length };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getAllTags() {
  const tagSet = new Set();
  snippets.forEach(s => s.tags.forEach(t => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

function serialize() {
  return { snippets, usageCounts };
}

module.exports = { load, getAll, getById, add, update, remove, recordUsage, search, sort, exportJSON, importJSON, getAllTags, serialize };
