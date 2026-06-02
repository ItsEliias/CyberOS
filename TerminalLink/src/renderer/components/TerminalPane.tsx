import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import type { CommandEntry } from '@shared/types';
import CaptureOverlay from './CaptureOverlay';

const TERMINAL_THEME = {
  background:          '#0a0e14',
  foreground:          '#c9d1d9',
  cursor:              '#00ff41',
  cursorAccent:        '#0a0e14',
  selectionBackground: 'rgba(74, 158, 255, 0.3)',
  black:               '#0d1117', brightBlack:   '#484f58',
  red:                 '#ff4444', brightRed:     '#ff6e6e',
  green:               '#00ff41', brightGreen:   '#56d364',
  yellow:              '#e3b341', brightYellow:  '#f0c040',
  blue:                '#4a9eff', brightBlue:    '#79c0ff',
  magenta:             '#b44fff', brightMagenta: '#d2a8ff',
  cyan:                '#56d4dd', brightCyan:    '#87deea',
  white:               '#b1bac4', brightWhite:   '#ffffff',
};

interface Props {
  paneId: string;
  paneNumber: 1 | 2;
  active: boolean;
  onCommand: (cmd: CommandEntry) => void;
  onFocus: () => void;
}

export default function TerminalPane({ paneId, paneNumber, active, onCommand, onFocus }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const termRef       = useRef<Terminal | null>(null);
  const fitRef        = useRef<FitAddon | null>(null);
  const inputBufRef   = useRef('');
  const deadRef       = useRef(false);
  const [captureData, setCaptureData] = useState<string | null>(null);
  const [pasteToast, setPasteToast]   = useState<string | null>(null);

  const captureTerminal = useCallback((): string | null => {
    const terminal = termRef.current;
    if (!terminal) return null;

    const buffer = terminal.buffer.active;
    const lines: string[] = [];
    for (let i = 0; i < buffer.length; i++) {
      lines.push(buffer.getLine(i)?.translateToString(true) ?? '');
    }
    // Remove trailing empty lines
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();

    const canvas = document.createElement('canvas');
    const fontSize   = 13;
    const lineHeight = 18;
    const padding    = 16;
    canvas.width  = 860;
    canvas.height = Math.max(lines.length * lineHeight + padding * 2, 200);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font      = `${fontSize}px "SF Mono", "Fira Code", monospace`;
    ctx.fillStyle = '#c9d1d9';
    lines.forEach((line, i) => {
      ctx.fillText(line, padding, padding + (i + 1) * lineHeight);
    });
    return canvas.toDataURL('image/png');
  }, []);

  // Restart helper
  const restart = useCallback(async () => {
    if (!termRef.current || deadRef.current) return;
    termRef.current.writeln('\r\n\x1b[33m[TerminalLink] Restarting session...\x1b[0m');
    await window.electronAPI.ptyCreate(paneId, termRef.current.cols, termRef.current.rows);
  }, [paneId]);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme:      TERMINAL_THEME,
      fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
      fontSize:   13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback:  5000,
      allowProposedApi: true,
    });

    const fitAddon      = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(containerRef.current);

    termRef.current = term;
    fitRef.current  = fitAddon;

    // Fit + create PTY
    setTimeout(() => {
      fitAddon.fit();
      window.electronAPI.ptyCreate(paneId, term.cols, term.rows);
    }, 50);

    // Resize observer
    const ro = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        window.electronAPI.ptyResize(paneId, term.cols, term.rows);
      } catch { /* ignore */ }
    });
    if (containerRef.current) ro.observe(containerRef.current);

    // Send data to PTY
    const disposeData = term.onData(data => {
      window.electronAPI.ptyWrite(paneId, data);
    });

    // Command detection — track input line
    const disposeKey = term.onData(data => {
      if (data === '\r' || data === '\n') {
        const cmd = inputBufRef.current.trim();
        if (cmd) {
          onCommand({
            id:        `${paneId}-${Date.now()}`,
            timestamp: new Date().toISOString(),
            command:   cmd,
            pane:      paneNumber
          });
        }
        inputBufRef.current = '';
      } else if (data === '\x7f') {
        // Backspace
        inputBufRef.current = inputBufRef.current.slice(0, -1);
      } else if (data.length === 1 && data >= ' ') {
        inputBufRef.current += data;
      }
    });

    // PTY data → terminal
    const offData = window.electronAPI.onPtyData(({ id, data }) => {
      if (id !== paneId) return;
      term.write(data);
    });

    // PTY exit
    const offExit = window.electronAPI.onPtyExit(({ id, code }) => {
      if (id !== paneId) return;
      term.writeln(`\r\n\x1b[33m[TerminalLink] Process exited with code ${code}. Press Enter to restart.\x1b[0m`);
      deadRef.current = true;
      const sub = term.onData(async d => {
        if (d === '\r' || d === '\n') {
          sub.dispose();
          deadRef.current = false;
          await restart();
        }
      });
    });

    // Paste command from PlaybookStudio
    const offPaste = window.electronAPI.onPasteCommand((payload) => {
      term.write(payload.command);
      setPasteToast(`Command from PlaybookStudio: ${payload.stepTitle}`);
      setTimeout(() => setPasteToast(null), 3000);
    });

    // Focus passthrough
    containerRef.current?.addEventListener('mousedown', onFocus);

    return () => {
      deadRef.current = true;
      disposeData.dispose();
      disposeKey.dispose();
      offData();
      offExit();
      offPaste();
      ro.disconnect();
      window.electronAPI.ptyKill(paneId);
      term.dispose();
      termRef.current = null;
    };
  }, [paneId]);  // intentionally only paneId — stable refs handle the rest

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 4,
        position: 'relative',
      }}
      onMouseDown={onFocus}
    >
      {/* Pane toolbar */}
      <div style={{
        height: 22,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        background: 'var(--panel)',
        borderBottom: '1px solid var(--border)',
        fontSize: 11,
        fontFamily: 'inherit',
        userSelect: 'none',
        gap: 6,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: active ? 'var(--accent)' : 'var(--text-muted)'
        }} />
        <span style={{ color: active ? 'var(--accent)' : 'var(--text-dim)' }}>
          PANE {paneNumber}
        </span>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Capture button */}
        <button
          title="Capture terminal"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => {
            e.stopPropagation();
            const data = captureTerminal();
            if (data) setCaptureData(data);
          }}
          style={{
            fontSize: 10,
            padding: '1px 7px',
            borderRadius: 3,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            lineHeight: '16px',
          }}
        >
          ⊡ Capture
        </button>
      </div>

      {/* Paste-command toast */}
      {pasteToast && (
        <div style={{
          position: 'absolute',
          top: 26,
          left: 0,
          right: 0,
          zIndex: 10,
          padding: '4px 10px',
          background: 'rgba(227,179,65,0.15)',
          borderBottom: '1px solid rgba(227,179,65,0.4)',
          color: '#e3b341',
          fontSize: 10,
          fontFamily: 'inherit',
          userSelect: 'none',
          pointerEvents: 'none',
        }}>
          {pasteToast}
        </div>
      )}

      <div
        ref={containerRef}
        style={{ flex: 1, overflow: 'hidden', padding: '4px 2px 2px' }}
      />

      {/* Capture overlay */}
      {captureData && (
        <CaptureOverlay
          imageData={captureData}
          onClose={() => setCaptureData(null)}
        />
      )}
    </div>
  );
}
