import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import {
  load, getByColumn, getById, add, update, remove, moveToColumn,
  searchLabs, serialize, type Lab, type LabColumn,
} from '../lib/labtracker';
import Badge from './ui/Badge';

const COLUMNS: Array<{ id: LabColumn; label: string; color: string; rgb: string }> = [
  { id: 'todo',       label: 'To Do',       color: '#484f58', rgb: '72,79,88'   },
  { id: 'inprogress', label: 'In Progress',  color: '#d29922', rgb: '210,153,34' },
  { id: 'completed',  label: 'Completed',    color: '#3fb950', rgb: '63,185,80'  },
];

const DIFF_COLORS: Record<string, string> = {
  Easy: '#3fb950', Medium: '#d29922', Hard: '#ff6b6b', Insane: '#f85149',
};

const DIFF_BG: Record<string, string> = {
  Easy: 'rgba(63,185,80,0.12)',
  Medium: 'rgba(210,153,34,0.12)',
  Hard: 'rgba(255,107,107,0.12)',
  Insane: 'rgba(248,81,73,0.12)',
};

const DIFF_BORDER: Record<string, string> = {
  Easy: 'rgba(63,185,80,0.3)',
  Medium: 'rgba(210,153,34,0.3)',
  Hard: 'rgba(255,107,107,0.3)',
  Insane: 'rgba(248,81,73,0.3)',
};

export default function LabTracker() {
  const { labsData, setLabsData } = useStore();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '', platform: 'HTB', difficulty: 'Medium', url: '', notes: '', column: 'todo' as LabColumn,
  });
  const [, forceUpdate] = useState(0);

  useEffect(() => { load(labsData); }, [labsData]);

  function refresh() {
    const data = serialize();
    setLabsData(data);
    window.electronAPI.saveLabTracker(data).catch(() => {});
    forceUpdate(n => n + 1);
  }

  function createLab() {
    add(form);
    refresh();
    setCreating(false);
    setForm({ name: '', platform: 'HTB', difficulty: 'Medium', url: '', notes: '', column: 'todo' });
  }

  function deleteLab(id: string) { remove(id); refresh(); }

  function moveCard(id: string, column: LabColumn) {
    const lab = getById(id);
    const wasCompleted = lab?.column === 'completed';
    moveToColumn(id, column);
    refresh();
    if (column === 'completed' && !wasCompleted && lab) {
      (window.electronAPI as Record<string, Function>)
        .completeLab({ platform: lab.platform, labType: lab.platform })
        .catch(() => {});
    }
  }

  const filteredIds = new Set(query ? searchLabs(query).map(l => l.id) : []);
  const totalLabs = COLUMNS.reduce((s, c) => s + getByColumn(c.id).length, 0);

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--surface-0)' }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-default)', background: 'rgba(7,8,15,0.7)' }}
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.5L13.5 4.75V11.25L8 14.5L2.5 11.25V4.75L8 1.5Z" stroke="#b44fff" strokeWidth="1.5" fill="none" />
            <circle cx="8" cy="8" r="2" fill="#b44fff" />
          </svg>
          <span className="text-xs font-semibold tracking-wide" style={{ color: '#e6edf3' }}>Lab Tracker</span>
          {totalLabs > 0 && (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(180,79,255,0.08)', color: '#b44fff', border: '1px solid rgba(180,79,255,0.18)' }}
            >
              {totalLabs}
            </span>
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search labs..."
          className="flex-1 text-xs"
          style={{ maxWidth: 240 }}
        />
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium btn-accent"
          onClick={() => setCreating(c => !c)}
        >
          <span>+</span>
          <span>Add Lab</span>
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 overflow-hidden"
          >
            <div
              className="p-4"
              style={{
                background: 'rgba(13,14,24,0.9)',
                borderBottom: '1px solid var(--border-default)',
              }}
            >
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="input-group col-span-3">
                  <label>Lab Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full"
                    placeholder="Machine or room name"
                    autoFocus
                  />
                </div>
                <div className="input-group">
                  <label>Platform</label>
                  <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className="w-full text-xs">
                    {['HTB','THM','CTF','PentesterLab','PortSwigger','VulnHub','Other'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Difficulty</label>
                  <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))} className="w-full text-xs">
                    {['Easy','Medium','Hard','Insane'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Column</label>
                  <select value={form.column} onChange={e => setForm(f => ({ ...f, column: e.target.value as LabColumn }))} className="w-full text-xs">
                    {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn-accent px-4 py-1.5 text-xs"
                  onClick={createLab}
                  disabled={!form.name.trim()}
                >
                  Add Lab
                </button>
                <button className="btn-ghost px-4 py-1.5 text-xs" onClick={() => setCreating(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban board */}
      <div
        className="flex flex-1 overflow-hidden"
        style={{ gap: '1px', background: 'rgba(42,51,71,0.3)' }}
      >
        {COLUMNS.map(col => {
          const cards = getByColumn(col.id).filter(l => !query || filteredIds.has(l.id));
          return (
            <div
              key={col.id}
              className="flex flex-col flex-1 overflow-hidden"
              style={{ background: 'var(--surface-0)' }}
            >
              {/* Column header */}
              <div
                className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
                style={{ borderBottom: '1px solid var(--border-default)' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: col.color,
                      boxShadow: `0 0 5px rgba(${col.rgb},0.5)`,
                    }}
                  />
                  <span className="text-xs font-semibold" style={{ color: '#e6edf3' }}>
                    {col.label}
                  </span>
                </div>
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{
                    background: `rgba(${col.rgb},0.08)`,
                    color: col.color,
                    border: `1px solid rgba(${col.rgb},0.2)`,
                  }}
                >
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <AnimatePresence>
                  {cards.map(lab => (
                    <LabCard
                      key={lab.id}
                      lab={lab}
                      onDelete={() => deleteLab(lab.id)}
                      onMove={moveCard}
                    />
                  ))}
                </AnimatePresence>
                {cards.length === 0 && (
                  <div
                    className="flex items-center justify-center py-8 rounded-md text-xs"
                    style={{
                      border: '1px dashed rgba(42,51,71,0.5)',
                      color: '#484f58',
                    }}
                  >
                    Empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LabCard({
  lab,
  onDelete,
  onMove,
}: {
  lab: Lab;
  onDelete: () => void;
  onMove: (id: string, col: LabColumn) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const diffColor = DIFF_COLORS[lab.difficulty] || '#484f58';

  const isActive = lab.column === 'inprogress';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className={`group cursor-pointer rounded-md overflow-hidden${isActive ? ' timer-border-running' : ''}`}
      style={{
        background: 'var(--surface-1)',
        border: isActive ? '1px solid rgba(63,185,80,0.55)' : '1px solid rgba(42,51,71,0.6)',
        transition: isActive ? 'none' : 'border-color 0.15s',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = 'rgba(180,79,255,0.25)'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'rgba(42,51,71,0.6)'; }}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: '#e6edf3' }}>
              {lab.name}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{
                  background: 'rgba(180,79,255,0.08)',
                  color: '#b44fff',
                  border: '1px solid rgba(180,79,255,0.2)',
                }}
              >
                {lab.platform}
              </span>
              {lab.difficulty && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{
                    color: diffColor,
                    background: DIFF_BG[lab.difficulty] || 'rgba(72,79,88,0.12)',
                    border: `1px solid ${DIFF_BORDER[lab.difficulty] || 'rgba(72,79,88,0.3)'}`,
                  }}
                >
                  {lab.difficulty}
                </span>
              )}
            </div>
          </div>
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded text-xs"
            style={{ border: 'none', background: 'rgba(248,81,73,0.1)', color: '#f85149', padding: 0 }}
            onClick={e => { e.stopPropagation(); onDelete(); }}
            title="Delete lab"
          >
            ×
          </button>
        </div>
      </div>

      {expanded && (
        <div
          className="px-3 pb-3"
          style={{ borderTop: '1px solid rgba(42,51,71,0.4)' }}
          onClick={e => e.stopPropagation()}
        >
          {lab.notes && (
            <p className="text-[11px] py-2" style={{ color: '#8b949e' }}>{lab.notes}</p>
          )}
          <div className="flex gap-1.5 flex-wrap pt-1">
            {(['todo','inprogress','completed'] as LabColumn[]).filter(c => c !== lab.column).map(c => {
              const col = COLUMNS.find(x => x.id === c)!;
              return (
                <button
                  key={c}
                  className="text-[10px] px-2 py-1 rounded flex items-center gap-1"
                  style={{
                    background: `rgba(${col.rgb},0.08)`,
                    border: `1px solid rgba(${col.rgb},0.2)`,
                    color: col.color,
                    fontWeight: 500,
                  }}
                  onClick={() => onMove(lab.id, c)}
                >
                  → {col.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
