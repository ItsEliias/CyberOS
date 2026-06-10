import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SearchResult } from '@shared/types';

// ─── App colour chips ─────────────────────────────────────────────────────────
// Anti-slop: deleted parallel APP_COLORS map with off-spec hex values.
// Now resolved from canonical per-app accents in tailwind-preset.cjs via CSS vars.

// Maps display names → canonical app keys (matching tailwind-preset.cjs app.{key}).
const APP_KEY_MAP: Record<string, string> = {
  Launcher:       'launcher',
  ReconDesk:      'recondesk',
  'CyberLab':     'cyberlab',
  'CyberLab Companion': 'cyberlab',
  GhostVault:     'ghostvault',
  CredVault:      'credvault',
  SignalBoard:    'signalboard',
  PlaybookStudio: 'playbookstudio',
  ReportForge:    'reportforge',
  TerminalLink:   'terminallink',
  NetworkMap:     'networkmap',
  NetLab:         'netlab',
  VaultCore:      'vaultcore',
};

// Inline CSS vars for app accent colors (sourced from tailwind-preset.cjs values).
const APP_ACCENT: Record<string, string> = {
  launcher:       '#b44fff',
  recondesk:      '#d29922',
  cyberlab:       '#b44fff',
  ghostvault:     '#7bb8ff',
  credvault:      '#f78166',
  signalboard:    '#ff6b6b',
  playbookstudio: '#4a9eff',
  reportforge:    '#3fb950',
  terminallink:   '#00ff41',
  networkmap:     '#d29922',
  netlab:         '#4a9eff',
  vaultcore:      '#3fb950',
};

function AppChip({ app }: { app: string }) {
  const key    = APP_KEY_MAP[app] || app.toLowerCase().replace(/\s+/g, '');
  const color  = APP_ACCENT[key] || '#8b949e';
  const bgRgba = `${color}26`; // ~15% opacity tint
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide shrink-0"
      style={{ background: bgRgba, color, border: `1px solid ${color}40` }}
    >
      {app}
    </span>
  );
}

const TYPE_LABEL: Record<string, string> = {
  target:     'Target',
  port:       'Port',
  credential: 'Cred',
  context:    'Context',
};

// ─── Declare global searchApi bridge ─────────────────────────────────────────

declare global {
  interface Window {
    searchApi: {
      query: (q: string) => Promise<SearchResult[]>;
      close: () => Promise<void>;
    };
  }
}

// ─── SearchApp ────────────────────────────────────────────────────────────────

export default function SearchApp() {
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<SearchResult[]>([]);
  const [selected, setSelected]   = useState(0);
  const [loading, setLoading]     = useState(false);
  const inputRef                  = useRef<HTMLInputElement>(null);
  const debounceTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset selection when results change
  useEffect(() => { setSelected(0); }, [results]);

  // Debounced search
  const runSearch = useCallback((q: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!q.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await window.searchApi.query(q.trim());
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 120);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    runSearch(v);
  }

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      window.searchApi.close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      const hit = results[selected];
      if (hit) {
        // Copy title to clipboard as fallback action
        navigator.clipboard.writeText(hit.title).catch(() => {});
      }
    }
  }

  const hasResults = results.length > 0;
  const showEmpty  = query.trim().length > 0 && !loading && !hasResults;

  return (
    <div
      className="flex flex-col w-full h-full"
      style={{ background: 'var(--surface-0)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
      onKeyDown={handleKeyDown}
    >
      {/* ── Search input ── */}
      <div
        className="flex items-center gap-2 px-3 py-3 border-b border-border-default"
        style={{ background: 'var(--surface-1)' }}
      >
        {/* Search icon */}
        <svg
          className="shrink-0 opacity-50"
          width="15" height="15" viewBox="0 0 15 15" fill="none"
        >
          <path
            d="M10 6.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM9.28 10.34a5 5 0 1 1 1.06-1.06l3.17 3.17a.75.75 0 1 1-1.06 1.06L9.28 10.34Z"
            fill="currentColor"
          />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search CyberOS…"
          className="flex-1 bg-transparent outline-none text-sm text-text-primary"
          style={{ caretColor: 'var(--accent)' }}
          autoComplete="off"
          spellCheck={false}
        />

        {loading && (
          <svg
            className="shrink-0 opacity-40 animate-spin"
            width="14" height="14" viewBox="0 0 24 24" fill="none"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31 11" />
          </svg>
        )}

        <kbd
          className="hidden sm:inline-flex items-center px-1 rounded text-[10px] opacity-30 border border-border-default text-text-muted"
        >
          ESC
        </kbd>
      </div>

      {/* ── Results list ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'thin' }}
      >
        <AnimatePresence initial={false}>
          {hasResults && results.map((r, i) => (
            <motion.div
              key={`${r.app}-${r.type}-${r.title}-${i}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1, delay: i * 0.02 }}
              onClick={() => {
                setSelected(i);
                navigator.clipboard.writeText(r.title).catch(() => {});
              }}
              className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors"
              style={{
                background: selected === i ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                borderLeft: selected === i ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <AppChip app={r.app} />
                  <span
                    className="text-[9px] uppercase tracking-wide px-1 py-0.5 rounded opacity-60 bg-surface-2 text-text-muted border border-border-subtle"
                  >
                    {TYPE_LABEL[r.type] || r.type}
                  </span>
                  <span className="text-[12px] font-medium truncate text-text-primary">
                    {r.title}
                  </span>
                </div>
                {r.subtitle && (
                  <span className="text-[11px] truncate pl-0.5 text-text-muted">
                    {r.subtitle}
                  </span>
                )}
              </div>

              <div
                className="shrink-0 text-[10px] opacity-0 transition-opacity mt-0.5"
                style={{ color: 'var(--accent)', opacity: selected === i ? 0.7 : 0 }}
              >
                ↵
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {showEmpty && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-muted">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="opacity-30">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-[12px]">No results for "{query}"</span>
          </div>
        )}

        {!query.trim() && !loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-1.5 text-text-muted">

            <span className="text-[12px] opacity-60">Search targets, ports, credentials, and more</span>
            <div className="flex gap-3 mt-1 text-[10px] opacity-40">
              <span>↑↓ navigate</span>
              <span>↵ copy</span>
              <span>ESC close</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      {hasResults && (
        <div className="px-3 py-1.5 border-t border-border-default bg-surface-1 flex justify-between items-center">
          <span className="text-[10px] text-text-muted">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </span>
          <span className="text-[10px] text-text-muted">
            CyberOS Unified Search
          </span>
        </div>
      )}
    </div>
  );
}
