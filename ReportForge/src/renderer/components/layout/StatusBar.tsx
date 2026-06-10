import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  lastSavedAt: Date | null;
}

function timeAgo(d: Date): string {
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 5)  return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function StatusBar({ lastSavedAt }: Props) {
  const { activeReport, dirty, activeSectionId } = useStore();
  const [tick, setTick] = useState(0);
  const [savedFlash, setSavedFlash] = useState(false);
  const prevSavedRef = useRef<Date | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (lastSavedAt && lastSavedAt !== prevSavedRef.current) {
      prevSavedRef.current = lastSavedAt;
      setSavedFlash(true);
      const id = setTimeout(() => setSavedFlash(false), 2000);
      return () => clearTimeout(id);
    }
  }, [lastSavedAt]);

  if (!activeReport) return null;

  const findingsCount = activeReport.findings.length;
  const status = activeReport.status ?? 'draft';
  const isDraft = status !== 'complete';

  // Live word count for active section
  const activeSection = activeSectionId
    ? activeReport.sections.find(s => s.id === activeSectionId)
    : null;
  const sectionWords = activeSection?.content
    ? activeSection.content.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div
      className="shrink-0 flex items-center gap-4 px-4 tabular-nums"
      style={{
        height: 26,
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--surface-0)',
        fontSize: 'var(--type-caption)',
        color: 'var(--text-muted)',
        userSelect: 'none',
      }}
    >
      {/* Status pill */}
      <span
        className="font-bold uppercase tracking-widest"
        style={{
          fontSize: 10,
          color: isDraft ? '#d29922' : '#3fb950',
        }}
      >
        {status}
      </span>

      <Divider />

      {/* Save state */}
      <AnimatePresence mode="wait">
        {savedFlash ? (
          <motion.span key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ color: '#4a9eff', fontWeight: 600 }}
          >
            Saved ✓
          </motion.span>
        ) : dirty ? (
          <motion.span key="dirty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ color: '#d29922' }}
          >
            Unsaved changes
          </motion.span>
        ) : lastSavedAt ? (
          <motion.span key="time" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            Auto-saved {timeAgo(lastSavedAt)}
          </motion.span>
        ) : (
          <motion.span key="never" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            Not yet saved
          </motion.span>
        )}
      </AnimatePresence>

      <Divider />

      {/* Findings count */}
      <span>
        {findingsCount === 0
          ? 'No findings'
          : `${findingsCount} finding${findingsCount !== 1 ? 's' : ''}`}
      </span>

      {/* Live word count for active section */}
      {activeSection && activeSection.type !== 'cover' && activeSection.type !== 'signature' && activeSection.type !== 'risk-matrix' && (
        <>
          <Divider />
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {sectionWords.toLocaleString()} {sectionWords === 1 ? 'word' : 'words'}
          </span>
        </>
      )}

      <div style={{ flex: 1 }} />

      {/* Visible sections */}
      <span>{activeReport.sections.filter(s => s.visible).length} visible sections</span>

      {/* CYBERTOOLS brand */}
      <span
        className="font-mono tracking-widest uppercase"
        style={{ fontSize: 9, color: 'rgba(42,51,71,0.8)', letterSpacing: '0.08em' }}
      >
        ReportForge
      </span>

      {/* Suppress tick */}
      <span style={{ display: 'none' }}>{tick}</span>
    </div>
  );
}

function Divider() {
  return (
    <span style={{ color: 'rgba(42,51,71,0.8)' }}>·</span>
  );
}
