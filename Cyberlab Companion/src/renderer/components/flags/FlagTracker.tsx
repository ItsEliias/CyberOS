import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import type { CTFFlag, CTFCategory } from '@shared/types';

const CATEGORIES: CTFCategory[] = ['Web', 'Pwn', 'Crypto', 'Forensics', 'Rev', 'OSINT', 'Misc'];

const FLAG_REGEXES: Array<{ name: string; re: RegExp }> = [
  { name: 'flag{}',    re: /^flag\{[^}]+\}$/i },
  { name: 'HTB{}',     re: /^HTB\{[^}]+\}$/i },
  { name: 'CTF{}',     re: /^CTF\{[^}]+\}$/i },
  { name: 'THM{}',     re: /^THM\{[^}]+\}$/i },
  { name: 'hex32',     re: /^[a-f0-9]{32}$/i },
  { name: 'hex64',     re: /^[a-f0-9]{64}$/i },
];

function detectFormat(value: string): string {
  for (const { name, re } of FLAG_REGEXES) {
    if (re.test(value.trim())) return name;
  }
  return 'unknown';
}

function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

const CAT_COLORS: Record<CTFCategory, string> = {
  Web:       '#4a9eff',
  Pwn:       '#f85149',
  Crypto:    '#b44fff',
  Forensics: '#3fb950',
  Rev:       '#d29922',
  OSINT:     '#58a6ff',
  Misc:      '#8b949e',
};

interface FlagTrackerProps {
  onClose: () => void;
}

export default function FlagTracker({ onClose }: FlagTrackerProps) {
  const { tabs, activeTabId, updateSession } = useStore();
  const tab = tabs.find(t => t.id === activeTabId);
  const session = tab?.session;

  const [input, setInput] = useState('');
  const [category, setCategory] = useState<CTFCategory>('Web');
  const [points, setPoints] = useState(100);

  const flags: CTFFlag[] = session?.ctfFlags ?? [];

  function submit() {
    const value = input.trim();
    if (!value || !session || !activeTabId) return;
    const format = detectFormat(value);
    const correct = format !== 'unknown';
    const flag: CTFFlag = {
      id: makeId(),
      value,
      category,
      points,
      submittedAt: new Date().toISOString(),
      correct,
      format,
    };
    updateSession(activeTabId, { ctfFlags: [...flags, flag] });
    setInput('');
  }

  function remove(id: string) {
    if (!activeTabId) return;
    updateSession(activeTabId, { ctfFlags: flags.filter(f => f.id !== id) });
  }

  const totalPts = flags.filter(f => f.correct).reduce((s, f) => s + f.points, 0);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="panel w-[540px] max-w-[94vw] max-h-[80vh] flex flex-col"
        style={{ border: '1px solid rgba(63,185,80,0.35)', borderRadius: 8 }}
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: '#3fb950' }}>Flag Tracker</span>
            <span className="text-xs font-mono" style={{ color: 'var(--accent)' }}>{totalPts} pts</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{flags.length} submitted</span>
          </div>
          <button onClick={onClose} className="text-lg" style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}>×</button>
        </div>

        {/* Input */}
        <div className="p-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Paste flag here..."
              className="flex-1 font-mono text-xs"
              style={{ color: '#3fb950' }}
              autoFocus
            />
            <input
              type="number"
              value={points}
              onChange={e => setPoints(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-16 text-xs text-center font-mono"
              title="Points"
            />
            <button
              className="btn-accent px-3 py-1.5 text-xs flex-shrink-0"
              style={{ background: '#3fb950', borderColor: '#3fb950' }}
              onClick={submit}
              disabled={!input.trim()}
            >
              Submit
            </button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c}
                className="text-[10px] px-2 py-0.5 rounded transition-colors"
                style={{
                  background: category === c ? CAT_COLORS[c] + '22' : 'transparent',
                  color: category === c ? CAT_COLORS[c] : 'var(--text-muted)',
                  border: `1px solid ${category === c ? CAT_COLORS[c] : 'var(--border)'}`,
                }}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Flag list */}
        <div className="flex-1 overflow-y-auto p-4">
          {flags.length === 0 ? (
            <div className="text-center text-xs py-6" style={{ color: 'var(--text-muted)' }}>No flags submitted yet</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left pb-1.5">Status</th>
                  <th className="text-left pb-1.5">Value</th>
                  <th className="text-left pb-1.5">Category</th>
                  <th className="text-right pb-1.5">Pts</th>
                  <th className="text-right pb-1.5">Time</th>
                  <th className="pb-1.5" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {flags.map(flag => (
                    <motion.tr
                      key={flag.id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td className="py-1.5 pr-2">
                        <span style={{ color: flag.correct ? '#3fb950' : '#f85149' }}>
                          {flag.correct ? '✓' : '✗'}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 font-mono" style={{ color: '#3fb950', maxWidth: 200 }}>
                        <span className="block truncate">{flag.value}</span>
                        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{flag.format}</span>
                      </td>
                      <td className="py-1.5 pr-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: CAT_COLORS[flag.category] + '22', color: CAT_COLORS[flag.category] }}>
                          {flag.category}
                        </span>
                      </td>
                      <td className="py-1.5 text-right pr-2 font-mono" style={{ color: 'var(--accent)' }}>
                        {flag.points}
                      </td>
                      <td className="py-1.5 text-right pr-2" style={{ color: 'var(--text-muted)' }}>
                        {new Date(flag.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-1.5 text-right">
                        <button onClick={() => remove(flag.id)} className="text-[10px]"
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                          ×
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
