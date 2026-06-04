// ScrapeLogPanel — extracted log panel with level filter bar
import { useRef, useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface LogEntry {
  type: string;
  message: string;
  time: string;
}

interface Props {
  logEntries: LogEntry[];
  onClear: () => void;
}

const LOG_COLORS: Record<string, string> = {
  info: 'var(--text-secondary)', success: '#3fb950', error: '#f85149', warn: '#d29922',
};

function LogMessage({ message }: { message: string }) {
  const tokenRegex = /(https?:\/\/[^\s]+)|\b(error|fail(?:ed)?|exception|critical|fatal)\b|\b(warn(?:ing)?|caution|skip(?:ped)?)\b/gi;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  tokenRegex.lastIndex = 0;
  while ((match = tokenRegex.exec(message)) !== null) {
    if (match.index > lastIdx) parts.push(message.slice(lastIdx, match.index));
    if (match[1]) {
      parts.push(<span key={match.index} className="log-url">{match[1]}</span>);
    } else if (match[2]) {
      parts.push(<span key={match.index} style={{ color: '#f85149', fontWeight: 600 }}>{match[2]}</span>);
    } else if (match[3]) {
      parts.push(<span key={match.index} style={{ color: '#d29922', fontWeight: 600 }}>{match[3]}</span>);
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < message.length) parts.push(message.slice(lastIdx));
  return <>{parts}</>;
}

export default function ScrapeLogPanel({ logEntries, onClear }: Props) {
  const logRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [newEntryCount, setNewEntryCount] = useState(0);
  const prevLogLengthRef = useRef(0);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');

  const filteredLogEntries = useMemo(() => {
    if (logFilter === 'all') return logEntries;
    if (logFilter === 'warn') return logEntries.filter((e) => e.type === 'warn');
    if (logFilter === 'error') return logEntries.filter((e) => e.type === 'error');
    return logEntries.filter((e) => e.type === 'info');
  }, [logEntries, logFilter]);

  useEffect(() => {
    const newLen = logEntries.length;
    if (newLen > prevLogLengthRef.current && isScrolledUp) {
      setNewEntryCount((n) => n + (newLen - prevLogLengthRef.current));
    }
    prevLogLengthRef.current = newLen;
  }, [logEntries.length, isScrolledUp]);

  // Auto-scroll when new entries arrive and user is at bottom
  useEffect(() => {
    if (!logRef.current) return;
    const el = logRef.current;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
    if (atBottom) {
      el.scrollTop = el.scrollHeight;
      setIsScrolledUp(false);
      setNewEntryCount(0);
    }
  }, [logEntries.length]);

  function handleLogScroll() {
    const el = logRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 32;
    setIsScrolledUp(!atBottom);
    if (atBottom) setNewEntryCount(0);
  }

  function scrollToBottom() {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
    setIsScrolledUp(false);
    setNewEntryCount(0);
  }

  function handleClear() {
    onClear();
    setNewEntryCount(0);
    setIsScrolledUp(false);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with filter pills */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b shrink-0 text-xs"
        style={{ borderColor: 'var(--border-default)', background: 'var(--surface-1)' }}
      >
        <div className="flex items-center gap-1.5">
          <span style={{ color: 'var(--text-muted)' }} className="mr-1">Output Log</span>
          {(['all', 'info', 'warn', 'error'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setLogFilter(level)}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all"
              style={logFilter === level
                ? {
                    background: level === 'error' ? 'rgba(248,81,73,0.15)'
                      : level === 'warn' ? 'rgba(210,153,34,0.15)'
                      : 'rgba(63,185,80,0.12)',
                    borderColor: level === 'error' ? 'rgba(248,81,73,0.4)'
                      : level === 'warn' ? 'rgba(210,153,34,0.4)'
                      : 'rgba(63,185,80,0.35)',
                    color: level === 'error' ? '#f85149'
                      : level === 'warn' ? '#d29922'
                      : level === 'info' ? '#4a9eff'
                      : '#3fb950',
                  }
                : {
                    background: 'transparent',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-muted)',
                  }}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={handleClear} className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Clear
        </button>
      </div>

      {/* Log entries */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={logRef}
          onScroll={handleLogScroll}
          className="absolute inset-0 overflow-y-auto p-3 space-y-0.5"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(42,51,71,0.5) transparent',
          }}
        >
          {logEntries.length === 0 && (
            <div style={{ color: 'var(--text-muted)' }}>No output yet. Start a scrape to see logs here.</div>
          )}
          {logEntries.length > 0 && filteredLogEntries.length === 0 && (
            <div style={{ color: 'var(--text-muted)' }}>No {logFilter} entries.</div>
          )}
          {filteredLogEntries.map((entry, i) => (
            <div key={i} style={{ color: LOG_COLORS[entry.type] ?? 'var(--text-secondary)' }}>
              <span className="log-timestamp">[{entry.time}]</span>{' '}
              <LogMessage message={entry.message} />
            </div>
          ))}
        </div>

        {/* New entries pill */}
        <AnimatePresence>
          {isScrolledUp && newEntryCount > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{ duration: 0.18 }}
              onClick={scrollToBottom}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border cursor-pointer"
              style={{
                background: 'rgba(13,14,24,0.92)',
                borderColor: 'rgba(63,185,80,0.35)',
                color: '#3fb950',
                backdropFilter: 'blur(6px)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
                zIndex: 10,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full status-dot-pulse"
                style={{ background: '#3fb950', ['--pulse-color' as string]: 'rgba(63,185,80,0.4)' }}
              />
              {newEntryCount} new entr{newEntryCount === 1 ? 'y' : 'ies'} ↓
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
