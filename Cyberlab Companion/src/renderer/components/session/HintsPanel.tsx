import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import type { SessionHint } from '@shared/types';

function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

export default function HintsPanel() {
  const { tabs, activeTabId, updateSession } = useStore();
  const tab = tabs.find(t => t.id === activeTabId);
  const session = tab?.session;
  const hints: SessionHint[] = session?.sessionHints ?? [];

  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [newCost, setNewCost] = useState(0);

  function addHint() {
    if (!newText.trim() || !activeTabId || !session) return;
    const hint: SessionHint = {
      id: makeId(),
      text: newText.trim(),
      cost: newCost,
      revealed: false,
    };
    updateSession(activeTabId, { sessionHints: [...hints, hint] });
    setNewText('');
    setNewCost(0);
    setAdding(false);
  }

  function reveal(id: string) {
    if (!activeTabId || !session) return;
    updateSession(activeTabId, {
      sessionHints: hints.map(h => h.id === id ? { ...h, revealed: true } : h),
    });
  }

  function remove(id: string) {
    if (!activeTabId) return;
    updateSession(activeTabId, { sessionHints: hints.filter(h => h.id !== id) });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>
          Hints ({hints.length})
        </span>
        <button
          className="text-[10px] btn-ghost px-2 py-0.5 rounded"
          onClick={() => setAdding(a => !a)}
        >
          + Add Hint
        </button>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-2"
          >
            <div className="flex flex-col gap-1.5 p-2 rounded" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
              <textarea
                value={newText}
                onChange={e => setNewText(e.target.value)}
                placeholder="Hint text..."
                className="w-full text-xs font-mono resize-none"
                rows={2}
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 6px', color: 'var(--text)', outline: 'none' }}
              />
              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Cost (pts):</span>
                <input
                  type="number"
                  value={newCost}
                  onChange={e => setNewCost(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 text-xs font-mono"
                  min={0}
                />
                <div className="flex gap-1 ml-auto">
                  <button className="btn-accent text-[10px] px-2 py-0.5 rounded" onClick={addHint}>Save</button>
                  <button className="btn-ghost text-[10px] px-2 py-0.5 rounded" onClick={() => setAdding(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hints.length === 0 && !adding && (
        <div className="text-[11px] text-center py-2" style={{ color: 'var(--text-muted)' }}>No hints added</div>
      )}

      <div className="space-y-1.5">
        {hints.map((hint, i) => (
          <div
            key={hint.id}
            className="rounded p-2"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                Hint {i + 1}{hint.cost > 0 ? ` — ${hint.cost} pts` : ''}
              </span>
              <div className="flex gap-1">
                {!hint.revealed && (
                  <button
                    className="text-[10px] px-2 py-0.5 rounded"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-dim)' }}
                    onClick={() => reveal(hint.id)}
                  >
                    Reveal
                  </button>
                )}
                <button
                  className="text-[10px] btn-ghost px-1.5 py-0.5 rounded"
                  style={{ color: 'var(--text-muted)' }}
                  onClick={() => remove(hint.id)}
                >
                  ×
                </button>
              </div>
            </div>
            {hint.revealed ? (
              <motion.div
                initial={{ opacity: 0, filter: 'blur(8px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.4 }}
                className="text-xs"
                style={{ color: 'var(--text)' }}
              >
                {hint.text}
              </motion.div>
            ) : (
              <div
                className="h-5 rounded text-[10px] flex items-center px-2 select-none cursor-pointer"
                style={{ background: 'var(--bg)', color: 'transparent', userSelect: 'none',
                  backgroundImage: 'linear-gradient(135deg, var(--bg2) 25%, var(--bg3) 100%)',
                  filter: 'blur(0px)', border: '1px solid var(--border)' }}
                onClick={() => reveal(hint.id)}
              >
                [SPOILER]
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
