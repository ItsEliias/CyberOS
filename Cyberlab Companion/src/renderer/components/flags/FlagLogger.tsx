import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store';
import { addFinding } from '../../lib/session';
import { SOUNDS } from '../../lib/sounds';

interface FlagLoggerProps {
  onClose: () => void;
}

const AUTO_DETECT_PATTERNS: RegExp[] = [
  /flag\{[^}]+\}/gi,
  /HTB\{[^}]+\}/gi,
  /CTF\{[^}]+\}/gi,
  /THM\{[^}]+\}/gi,
  /picoCTF\{[^}]+\}/gi,
  /\b[a-f0-9]{32}\b/g,
  /\b[a-f0-9]{64}\b/g,
];

function detectFlagType(value: string): 'user' | 'root' | 'flag' | 'other' {
  const lc = value.toLowerCase();
  if (lc.includes('user')) return 'user';
  if (lc.includes('root') || lc.includes('system')) return 'root';
  if (/htb\{|thm\{|flag\{|picoctf\{|ctf\{/i.test(value)) return 'flag';
  return 'other';
}

function scanForFlags(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of AUTO_DETECT_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) matches.forEach(m => found.add(m));
  }
  return Array.from(found);
}

const TYPE_COLORS: Record<string, string> = {
  user:  '#4a9eff',
  root:  '#f85149',
  flag:  '#3fb950',
  other: '#b44fff',
};

const TYPE_LABELS: Record<string, string> = {
  user:  'User Flag',
  root:  'Root Flag',
  flag:  'CTF Flag',
  other: 'Other',
};

export default function FlagLogger({ onClose }: FlagLoggerProps) {
  const { tabs, activeTabId, updateSession } = useStore();
  const tab = tabs.find(t => t.id === activeTabId);
  const session = tab?.session;

  const [input, setInput] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [flagType, setFlagType] = useState<'user' | 'root' | 'flag' | 'other'>('flag');
  const [copied, setCopied] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<string[]>([]);
  const [activeTab, setActiveTabLocal] = useState<'manual' | 'scan'>('manual');

  const flags = session?.findings?.flags || [];

  function handleInputChange(val: string) {
    setInput(val);
    if (val.trim()) setFlagType(detectFlagType(val));
  }

  function logFlag(value?: string) {
    const flagValue = (value ?? input).trim();
    if (!flagValue || !session || !activeTabId) return;
    const updated = { ...session };
    const entry = addFinding(updated, 'FLAG', flagValue);
    if (!entry) return;
    updateSession(activeTabId, { findings: updated.findings });
    try { (window.electronAPI as Record<string, Function>).incrementFlags(1).catch(() => {}); } catch {}
    SOUNDS.flag();
    if (!value) setInput('');
  }

  function handleScan() {
    const found = scanForFlags(pasteText);
    setScanResults(found);
  }

  function logAllScanned() {
    if (!session || !activeTabId) return;
    const updated = { ...session };
    let count = 0;
    for (const f of scanResults) {
      if (addFinding(updated, 'FLAG', f)) count++;
    }
    if (count > 0) {
      updateSession(activeTabId, { findings: updated.findings });
      try { (window.electronAPI as Record<string, Function>).incrementFlags(count).catch(() => {}); } catch {}
      SOUNDS.flag();
    }
    setScanResults([]);
    setPasteText('');
  }

  async function copyFlag(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied(null), 1500);
  }

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
        className="panel relative w-[480px] max-w-[94vw]"
        style={{ border: '1px solid rgba(63, 185, 80, 0.4)', borderRadius: 8 }}
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span style={{ color: '#3fb950', fontSize: 14 }}>⚑</span>
              <span className="text-sm font-semibold" style={{ color: '#3fb950' }}>Flag Tracker</span>
            </div>
            <div className="flex gap-1">
              {(['manual', 'scan'] as const).map(t => (
                <button
                  key={t}
                  className="text-[10px] px-2 py-0.5 rounded"
                  style={{
                    background: activeTab === t ? '#3fb95022' : 'transparent',
                    color: activeTab === t ? '#3fb950' : 'var(--text-muted)',
                    border: `1px solid ${activeTab === t ? '#3fb950' : 'var(--border)'}`,
                  }}
                  onClick={() => setActiveTabLocal(t)}
                >
                  {t === 'manual' ? 'Manual' : 'Auto-Scan'}
                </button>
              ))}
            </div>
          </div>
          <button
            className="w-6 h-6 flex items-center justify-center rounded"
            style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 16 }}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Manual tab */}
        {activeTab === 'manual' && (
          <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={input}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && logFlag()}
                placeholder="THM{...} or HTB{...} or hash..."
                className="flex-1 font-mono text-xs"
                style={{ color: '#3fb950' }}
                autoFocus
              />
              <button
                className="btn-accent px-4 py-1.5 text-xs flex-shrink-0"
                style={{ background: '#3fb950', borderColor: '#3fb950' }}
                onClick={() => logFlag()}
                disabled={!input.trim()}
              >
                Log Flag
              </button>
            </div>
            <div className="flex gap-1.5">
              {(['user', 'root', 'flag', 'other'] as const).map(t => (
                <button
                  key={t}
                  className="text-[10px] px-2.5 py-1 rounded transition-colors"
                  style={{
                    background: flagType === t ? TYPE_COLORS[t] + '22' : 'transparent',
                    color: flagType === t ? TYPE_COLORS[t] : 'var(--text-muted)',
                    border: `1px solid ${flagType === t ? TYPE_COLORS[t] : 'var(--border)'}`,
                  }}
                  onClick={() => setFlagType(t)}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Auto-scan tab */}
        {activeTab === 'scan' && (
          <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              Paste terminal output or text to auto-detect flag patterns
            </p>
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="Paste output here..."
              className="w-full font-mono text-xs resize-none mb-2"
              style={{ height: 80, background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: '#3fb950', outline: 'none' }}
            />
            <div className="flex gap-2 items-center">
              <button
                className="btn-accent px-4 py-1.5 text-xs"
                style={{ background: '#3fb950', borderColor: '#3fb950' }}
                onClick={handleScan}
                disabled={!pasteText.trim()}
              >
                Scan
              </button>
              {scanResults.length > 0 && (
                <button className="btn-ghost text-xs px-3 py-1.5" onClick={logAllScanned}>
                  Log All ({scanResults.length})
                </button>
              )}
              {scanResults.length === 0 && pasteText && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No flags detected</span>
              )}
            </div>
            {scanResults.length > 0 && (
              <div className="mt-3 space-y-1">
                {scanResults.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                    <span className="font-mono flex-1 truncate" style={{ color: '#3fb950' }}>{f}</span>
                    <button
                      className="btn-accent text-[10px] px-2 py-0.5 flex-shrink-0"
                      style={{ background: '#3fb95022', borderColor: '#3fb950', color: '#3fb950' }}
                      onClick={() => logFlag(f)}
                    >
                      Log
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Logged flags */}
        <div className="p-4">
          <div className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Logged Flags ({flags.length})
          </div>
          {flags.length === 0 ? (
            <div className="text-center text-xs py-4" style={{ color: 'var(--text-muted)' }}>
              No flags logged yet
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <AnimatePresence>
                {flags.map(flag => {
                  const detectedType = detectFlagType(flag.value);
                  return (
                    <motion.div
                      key={flag.id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 px-3 py-2 rounded"
                      style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
                    >
                      <div
                        className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          background: TYPE_COLORS[detectedType] + '22',
                          color: TYPE_COLORS[detectedType],
                          border: `1px solid ${TYPE_COLORS[detectedType]}44`,
                        }}
                      >
                        {TYPE_LABELS[detectedType]}
                      </div>
                      <span className="font-mono text-xs flex-1 truncate" style={{ color: '#3fb950' }}>{flag.value}</span>
                      <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {new Date(flag.addedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        className="flex-shrink-0 text-xs px-2 py-0.5 rounded transition-colors"
                        style={{
                          background: copied === flag.value ? '#3fb950' : 'var(--accent-dim)',
                          color: copied === flag.value ? '#fff' : 'var(--accent)',
                          border: '1px solid var(--accent)',
                        }}
                        onClick={() => copyFlag(flag.value)}
                      >
                        {copied === flag.value ? '✓' : 'Copy'}
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
