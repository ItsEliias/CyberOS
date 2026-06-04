/**
 * TerminalPane — TerminalLink
 * xterm.js terminal pane backed by a single PTY.
 * Features: terminal search (Ctrl+F), output alerts, session recording,
 * GhostVault text save, per-session theme/color.
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { useTerminal } from '../hooks/useTerminal';
import CaptureOverlay from './CaptureOverlay';
import GhostVaultModal from './GhostVaultModal';
import type { CommandEntry } from '@shared/types';
import type { TerminalThemeName } from '../types/terminallink';
import { useTerminalLinkStore } from '../stores/useTerminalLinkStore';

interface Props {
  paneId:    string;
  pane:      'left' | 'right';
  active:    boolean;
  sessionId?: string;
  onCommand: (cmd: CommandEntry) => void;
  onFocus:   () => void;
}

export default function TerminalPane({ paneId, pane, active, sessionId, onCommand, onFocus }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const searchRef     = useRef<HTMLInputElement>(null);
  const [captureData,    setCaptureData]    = useState<string | null>(null);
  const [pasteToast,     setPasteToast]     = useState<string | null>(null);
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [alertFlash,     setAlertFlash]     = useState<string | null>(null);
  const [cwd,            setCwd]            = useState('~');
  const [lastExitCode,   setLastExitCode]   = useState(0);
  const [vaultOpen,      setVaultOpen]      = useState(false);
  const [vaultText,      setVaultText]      = useState('');
  const [contextMenu,    setContextMenu]    = useState<{ x: number; y: number } | null>(null);

  const { settings, sessions, pushAlert, broadcastMode } = useTerminalLinkStore();
  const session = sessions.find(s => s.id === sessionId);
  const sessionTheme: TerminalThemeName = session?.theme ?? 'default';
  const sessionColor = session?.color;

  const handleCwdChange  = useCallback((c: string) => setCwd(c), []);
  const handleExitCode   = useCallback((code: number) => setLastExitCode(code), []);

  const handleOutputData = useCallback((data: string) => {
    const { settings: s, pushAlert: pa } = useTerminalLinkStore.getState();
    for (const rule of s.outputAlerts) {
      if (!rule.enabled) continue;
      try {
        if (new RegExp(rule.pattern).test(data)) {
          setAlertFlash(rule.label);
          pa(`[${pane.toUpperCase()}] ${rule.label}`);
          setTimeout(() => setAlertFlash(null), 2500);
          break;
        }
      } catch { /* bad regex */ }
    }
  }, [pane]);

  const handlePasteCommand = useCallback((payload: { command: string; stepTitle: string }) => {
    setPasteToast(`Command from PlaybookStudio: ${payload.stepTitle}`);
    setTimeout(() => setPasteToast(null), 3000);
  }, []);

  const { addRecordedSession } = useTerminalLinkStore();

  const { termRef, getRecordedEvents, resetRecording, searchNext, searchPrev, clearSearch } = useTerminal({
    containerRef,
    paneId,
    pane,
    fontSize:    settings.fontSize,
    cursorStyle: settings.cursorStyle,
    scrollback:  settings.scrollbackLines,
    theme:       sessionTheme,
    sessionColor,
    onCommand,
    onPasteCommand: handlePasteCommand,
    onCwdChange:    handleCwdChange,
    onExitCode:     handleExitCode,
    onOutputData:   handleOutputData,
  });

  // Save recording to store on unmount
  useEffect(() => {
    return () => {
      const events = getRecordedEvents();
      if (events.length > 0) {
        const { sessions: s } = useTerminalLinkStore.getState();
        const sess = s.find(x => x.id === sessionId);
        addRecordedSession({
          id: `rec-${Date.now()}`,
          sessionId: sessionId ?? paneId,
          sessionName: sess?.name ?? `Pane ${pane}`,
          startedAt: new Date(Date.now() - (events[events.length - 1]?.ts ?? 0)).toISOString(),
          endedAt: new Date().toISOString(),
          events,
        });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneId]);

  // Ctrl+F: open search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!active) return;
      if ((e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(s => !s);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, searchOpen]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [searchOpen]);

  const doSearch = useCallback((q: string, dir: 'next' | 'prev' = 'next') => {
    if (!q) return;
    if (dir === 'next') searchNext(q);
    else searchPrev(q);
  }, [searchNext, searchPrev]);

  const captureTerminal = useCallback((): string | null => {
    const terminal = termRef.current;
    if (!terminal) return null;
    const buffer = terminal.buffer.active;
    const lines: string[] = [];
    for (let i = 0; i < buffer.length; i++) {
      lines.push(buffer.getLine(i)?.translateToString(true) ?? '');
    }
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
    const canvas = document.createElement('canvas');
    const fs = 13, lh = 18, pad = 16;
    canvas.width  = 860;
    canvas.height = Math.max(lines.length * lh + pad * 2, 200);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font      = `${fs}px "JetBrains Mono", "SF Mono", monospace`;
    ctx.fillStyle = '#c9d1d9';
    lines.forEach((line, i) => ctx.fillText(line, pad, pad + (i + 1) * lh));
    return canvas.toDataURL('image/png');
  }, [termRef]);

  const getSelectedText = useCallback((): string => {
    return termRef.current?.getSelection() ?? '';
  }, [termRef]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler, { once: true });
    return () => window.removeEventListener('click', handler);
  }, [contextMenu]);

  const borderColor = alertFlash
    ? '#ff4444'
    : active
      ? (sessionColor ?? 'var(--accent)')
      : 'var(--border)';

  return (
    <div
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: `1px solid ${borderColor}`,
        borderRadius: 4, position: 'relative',
        transition: 'border-color 0.15s ease',
        boxShadow: alertFlash ? `0 0 12px rgba(255,68,68,0.4)` : undefined,
      }}
      onMouseDown={onFocus}
      onContextMenu={handleContextMenu}
    >
      {/* Pane toolbar */}
      <div style={{
        height: 22, display: 'flex', alignItems: 'center', padding: '0 8px',
        background: 'var(--panel)', borderBottom: '1px solid var(--border)',
        fontSize: 11, fontFamily: 'inherit', userSelect: 'none', gap: 6, flexShrink: 0,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: active ? (sessionColor ?? 'var(--accent)') : 'var(--text-muted)',
          boxShadow: active ? `0 0 6px ${sessionColor ?? 'rgba(0,255,65,0.5)'}` : 'none',
          transition: 'all 0.2s ease',
        }} />
        <span style={{ color: active ? (sessionColor ?? 'var(--accent)') : 'var(--text-dim)', fontSize: 10 }}>
          {pane === 'left' ? 'PANE 1' : 'PANE 2'}
          {session?.name && <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>— {session.name}</span>}
        </span>
        {broadcastMode && (
          <span style={{
            fontSize: 9, padding: '1px 5px', borderRadius: 2,
            background: 'rgba(255,68,68,0.2)', border: '1px solid #ff4444', color: '#ff4444',
          }}>BROADCAST</span>
        )}
        <div style={{ flex: 1 }} />
        {alertFlash && (
          <span style={{ fontSize: 10, color: '#ff4444', animation: 'tl-pulse 0.5s ease-in-out infinite' }}>
            {alertFlash}
          </span>
        )}
        <button
          title="Capture terminal screenshot"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); const d = captureTerminal(); if (d) setCaptureData(d); }}
          style={{
            fontSize: 10, padding: '1px 7px', borderRadius: 3,
            background: 'var(--bg)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', lineHeight: '16px',
          }}
        >
          Capture
        </button>
      </div>

      {/* Search overlay (Ctrl+F) */}
      {searchOpen && (
        <div style={{
          position: 'absolute', top: 26, left: 0, right: 0, zIndex: 20,
          padding: '4px 8px', background: 'rgba(22,27,39,0.97)',
          borderBottom: '1px solid var(--accent)', display: 'flex', gap: 6, alignItems: 'center',
        }}>
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) doSearch(searchQuery, 'next');
              if (e.key === 'Enter' && e.shiftKey) doSearch(searchQuery, 'prev');
              if (e.key === 'Escape') { setSearchOpen(false); clearSearch(); }
            }}
            placeholder="Search terminal... (Enter: next, Shift+Enter: prev)"
            style={{
              flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 3, padding: '3px 7px', color: 'var(--text)',
              fontSize: 12, fontFamily: 'inherit', outline: 'none',
            }}
          />
          <button onClick={() => doSearch(searchQuery, 'prev')} style={sBtn}>Prev</button>
          <button onClick={() => doSearch(searchQuery, 'next')} style={sBtn}>Next</button>
          <button onClick={() => { setSearchOpen(false); clearSearch(); }} style={{ ...sBtn, color: 'var(--text-muted)' }}>✕</button>
        </div>
      )}

      {/* Paste-command toast */}
      {pasteToast && (
        <div style={{
          position: 'absolute', top: 26, left: 0, right: 0, zIndex: 10,
          padding: '4px 10px', background: 'rgba(227,179,65,0.15)',
          borderBottom: '1px solid rgba(227,179,65,0.4)', color: '#e3b341',
          fontSize: 10, fontFamily: 'inherit', userSelect: 'none', pointerEvents: 'none',
        }}>{pasteToast}</div>
      )}

      {/* xterm container */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', padding: '4px 2px 2px' }} />

      {/* Status mini-bar: cwd + exit code */}
      <div style={{
        height: 18, display: 'flex', alignItems: 'center', padding: '0 8px',
        background: 'var(--panel)', borderTop: '1px solid var(--border)',
        fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)',
        gap: 8, flexShrink: 0,
      }}>
        <span style={{ color: 'var(--text-dim)' }}>{cwd}</span>
        <span>·</span>
        <span style={{ color: lastExitCode === 0 ? 'var(--accent)' : '#ff4444' }}>
          Exit: {lastExitCode}
        </span>
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          onClick={closeContextMenu}
          style={{
            position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 999,
            background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 4,
            padding: '4px 0', minWidth: 180, boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}
        >
          {[
            { label: 'Save selection to GhostVault', action: () => { const t = getSelectedText(); if (t) { setVaultText(t); setVaultOpen(true); } } },
            { label: 'Capture Screenshot', action: () => { const d = captureTerminal(); if (d) setCaptureData(d); } },
            { label: 'Search (Ctrl+F)', action: () => setSearchOpen(true) },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px',
                background: 'transparent', border: 'none', color: 'var(--text-dim)',
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'transparent'; }}
            >{item.label}</button>
          ))}
        </div>
      )}

      {captureData && (
        <CaptureOverlay imageData={captureData} onClose={() => setCaptureData(null)} />
      )}

      {vaultOpen && (
        <GhostVaultModal
          initialContent={vaultText}
          onClose={() => setVaultOpen(false)}
        />
      )}

      <style>{`
        @keyframes tl-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
}

const sBtn: React.CSSProperties = {
  fontSize: 11, padding: '3px 8px', borderRadius: 3,
  background: 'var(--accent-dim)', border: '1px solid var(--accent)',
  color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit',
};
