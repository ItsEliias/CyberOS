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
  const { activeReport, dirty } = useStore();
  const [tick, setTick] = useState(0);
  const [savedFlash, setSavedFlash] = useState(false);
  const prevSavedRef = useRef<Date | null>(null);

  // Tick every 5s to update "X ago" label
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  // Flash "Saved ✓" when lastSavedAt changes to a new value
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

  return (
    <div style={{
      height: 26,
      flexShrink: 0,
      borderTop: '1px solid var(--border)',
      background: 'var(--panel)',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '0 16px',
      fontSize: 11,
      color: 'var(--text-muted)',
      userSelect: 'none',
    }}>
      {/* Status badge */}
      <span style={{
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: status === 'complete' ? 'var(--accent)' : 'var(--warning)',
        fontSize: 10,
      }}>
        {status}
      </span>

      <span style={{ color: 'var(--border)' }}>•</span>

      {/* Save state */}
      <AnimatePresence mode="wait">
        {savedFlash ? (
          <motion.span
            key="saved"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ color: 'var(--accent)', fontWeight: 600 }}
          >
            Saved ✓
          </motion.span>
        ) : dirty ? (
          <motion.span key="dirty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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

      <span style={{ color: 'var(--border)' }}>•</span>

      {/* Findings count */}
      <span>
        {findingsCount === 0 ? 'No findings' : `${findingsCount} finding${findingsCount !== 1 ? 's' : ''}`}
      </span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Sections count */}
      <span>{activeReport.sections.filter(s => s.visible).length} visible sections</span>

      {/* Suppress unused tick warning */}
      <span style={{ display: 'none' }}>{tick}</span>
    </div>
  );
}
