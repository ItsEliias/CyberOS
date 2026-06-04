import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NoteVersion } from '@shared/types';

interface DiffLine {
  type: 'add' | 'remove' | 'same';
  text: string;
}

function computeDiff(a: string, b: string): DiffLine[] {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const result: DiffLine[] = [];
  const maxLen = Math.max(aLines.length, bLines.length);
  for (let i = 0; i < maxLen; i++) {
    const aLine = aLines[i];
    const bLine = bLines[i];
    if (aLine === undefined) {
      result.push({ type: 'add', text: bLine });
    } else if (bLine === undefined) {
      result.push({ type: 'remove', text: aLine });
    } else if (aLine !== bLine) {
      result.push({ type: 'remove', text: aLine });
      result.push({ type: 'add', text: bLine });
    } else {
      result.push({ type: 'same', text: aLine });
    }
  }
  return result;
}

interface Props {
  notePath: string;
  currentContent: string;
  onRestore: (content: string) => void;
  onClose: () => void;
}

export default function VersionHistoryPanel({ notePath, currentContent, onRestore, onClose }: Props) {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [selected, setSelected] = useState<NoteVersion | null>(null);

  useEffect(() => {
    window.ghostvault.noteVersionsList(notePath).then(v => {
      const sorted = [...v].sort((a, b) => b.timestamp - a.timestamp);
      setVersions(sorted);
      if (sorted.length > 0) setSelected(sorted[0]);
    });
  }, [notePath]);

  const diff = selected ? computeDiff(selected.content, currentContent) : [];

  function formatTs(ts: number): string {
    return new Date(ts).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed right-0 top-10 bottom-6 z-30 flex flex-col border-l"
      style={{ width: 380, background: 'var(--bg2)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Version History</span>
        <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10"
          style={{ color: 'var(--text-dim)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {versions.length === 0 ? (
        <div className="flex items-center justify-center flex-1">
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>No saved versions</span>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          <div className="w-36 border-r overflow-y-auto shrink-0"
            style={{ borderColor: 'var(--border)', scrollbarWidth: 'thin' }}>
            {versions.map(v => (
              <button key={v.timestamp}
                onClick={() => setSelected(v)}
                className="w-full text-left px-3 py-2 text-[10px] border-b transition-colors hover:bg-white/5"
                style={{
                  borderColor: 'var(--border)',
                  background: selected?.timestamp === v.timestamp ? 'rgba(123,184,255,0.1)' : 'transparent',
                  color: selected?.timestamp === v.timestamp ? '#7bb8ff' : 'var(--text-dim)',
                }}>
                {formatTs(v.timestamp)}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[10px] leading-relaxed"
              style={{ scrollbarWidth: 'thin' }}>
              {diff.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap"
                  style={{
                    color: line.type === 'add' ? '#3fb950' : line.type === 'remove' ? '#f85149' : 'var(--text-dim)',
                    background: line.type === 'add' ? 'rgba(63,185,80,0.08)' : line.type === 'remove' ? 'rgba(248,81,73,0.08)' : 'transparent',
                  }}>
                  {line.type === 'add' ? '+ ' : line.type === 'remove' ? '- ' : '  '}{line.text || ' '}
                </div>
              ))}
            </div>
            <div className="px-3 py-2 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => selected && onRestore(selected.content)}
                className="w-full py-1.5 rounded text-xs font-medium"
                style={{ background: '#7bb8ff', color: '#0a0a0f' }}>
                Restore this version
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
