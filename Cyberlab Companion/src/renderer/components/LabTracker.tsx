import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { load, getByColumn, getById, add, update, remove, moveToColumn, searchLabs, serialize, type Lab, type LabColumn } from '../lib/labtracker';

const COLUMNS: Array<{ id: LabColumn; label: string; color: string }> = [
  { id: 'todo',       label: 'To Do',       color: 'var(--text-muted)' },
  { id: 'inprogress', label: 'In Progress',  color: 'var(--warning)' },
  { id: 'completed',  label: 'Completed',    color: 'var(--success)' },
];

const DIFF_COLORS: Record<string, string> = {
  Easy: 'var(--success)', Medium: 'var(--warning)', Hard: '#ff7a00', Insane: 'var(--danger)',
};

export default function LabTracker() {
  const { labsData, setLabsData } = useStore();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', platform: 'HTB', difficulty: 'Medium', url: '', notes: '', column: 'todo' as LabColumn });
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    load(labsData);
  }, [labsData]);

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

  function deleteLab(id: string) {
    remove(id);
    refresh();
  }

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

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-[var(--border)]">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search labs..."
          className="flex-1 text-xs"
        />
        <button className="btn-accent px-3 py-1.5 text-xs" onClick={() => setCreating(c => !c)}>+ Add Lab</button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="p-3 border-b border-[var(--border)] bg-[var(--bg3)]">
          <div className="grid grid-cols-3 gap-2">
            <div className="input-group col-span-3">
              <label>Lab Name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full" placeholder="Machine or room name" />
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
          <div className="flex gap-2 mt-2">
            <button className="btn-accent px-4 py-1.5 text-xs" onClick={createLab} disabled={!form.name.trim()}>Add</button>
            <button className="btn-ghost px-4 py-1.5 text-xs" onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Kanban board */}
      <div className="flex flex-1 overflow-hidden gap-px bg-[var(--border)]">
        {COLUMNS.map(col => {
          const cards = getByColumn(col.id).filter(l => !query || filteredIds.has(l.id));
          return (
            <div key={col.id} className="flex flex-col flex-1 bg-[var(--bg)] overflow-hidden">
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)] flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: col.color }} />
                  <span className="text-xs font-semibold text-[var(--text)]">{col.label}</span>
                </div>
                <span className="text-xs text-[var(--text-muted)]">{cards.length}</span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {cards.map(lab => (
                  <LabCard key={lab.id} lab={lab} onDelete={() => deleteLab(lab.id)} onMove={moveCard} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LabCard({ lab, onDelete, onMove }: { lab: Lab; onDelete: () => void; onMove: (id: string, col: LabColumn) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="card cursor-pointer hover:border-[var(--accent-dim)] transition-colors group"
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-[var(--text)] truncate">{lab.name}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-[var(--accent)]">{lab.platform}</span>
            <span className="text-[10px] font-medium" style={{ color: DIFF_COLORS[lab.difficulty] || 'var(--text-muted)' }}>
              {lab.difficulty}
            </span>
          </div>
        </div>
        <button
          className="text-[var(--text-muted)] hover:text-[var(--danger)] text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ border: 'none', background: 'none', padding: '2px 4px' }}
          onClick={e => { e.stopPropagation(); onDelete(); }}
        >
          ×
        </button>
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-[var(--border)]" onClick={e => e.stopPropagation()}>
          {lab.notes && <p className="text-[10px] text-[var(--text-muted)] mb-2">{lab.notes}</p>}
          <div className="flex gap-1 flex-wrap">
            {(['todo','inprogress','completed'] as LabColumn[]).filter(c => c !== lab.column).map(c => (
              <button
                key={c}
                className="text-[10px] px-2 py-0.5 rounded btn-ghost"
                onClick={() => onMove(lab.id, c)}
              >
                → {c === 'todo' ? 'To Do' : c === 'inprogress' ? 'In Progress' : 'Completed'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
