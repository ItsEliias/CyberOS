/**
 * useTerminal — TerminalLink
 * xterm.js setup, IPC bridging, PTY lifecycle, resize, broadcast,
 * output-alert matching, OSC 7 cwd tracking, and session recording.
 */
import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import type { CommandEntry } from '@shared/types';
import type { TerminalThemeName, RecordedEvent } from '../types/terminallink';
import { useCommandLogger } from './useCommandLogger';
import { useTerminalLinkStore } from '../stores/useTerminalLinkStore';

const THEMES: Record<TerminalThemeName, Partial<import('xterm').ITheme>> = {
  default: {
    background: '#0a0a0f',
    foreground: '#e2e8f0',
    cursor: '#00ff41',
    cursorAccent: '#0a0a0f',
    selection: 'rgba(0, 255, 65, 0.25)',
    black: '#0a0a0f',
    brightBlack: '#4a5568',
    red: '#f85149',
    brightRed: '#ff6b6b',
    green: '#3fb950',
    brightGreen: '#00ff41',
    yellow: '#d29922',
    brightYellow: '#f0b429',
    blue: '#4a9eff',
    brightBlue: '#7bb8ff',
    magenta: '#b44fff',
    brightMagenta: '#d68cff',
    cyan: '#39c5cf',
    brightCyan: '#56d3db',
    white: '#c9d1d9',
    brightWhite: '#e2e8f0',
  },
  matrix: {
    background: '#000000', foreground: '#00ff41', cursor: '#00ff41', cursorAccent: '#000000',
    selectionBackground: 'rgba(0,255,65,0.3)',
    black: '#000000', brightBlack: '#003300', green: '#00ff41', brightGreen: '#00ff41',
    red: '#007700', brightRed: '#00bb00', yellow: '#00cc00', brightYellow: '#00ff00',
    blue: '#004400', brightBlue: '#006600', magenta: '#005500', brightMagenta: '#008800',
    cyan: '#00aa00', brightCyan: '#00dd00', white: '#00ff41', brightWhite: '#ffffff',
  },
  dracula: {
    background: '#282a36', foreground: '#f8f8f2', cursor: '#f8f8f2', cursorAccent: '#282a36',
    selectionBackground: 'rgba(68,71,90,0.9)',
    black: '#21222c', brightBlack: '#6272a4', red: '#ff5555', brightRed: '#ff6e6e',
    green: '#50fa7b', brightGreen: '#69ff94', yellow: '#f1fa8c', brightYellow: '#ffffa5',
    blue: '#bd93f9', brightBlue: '#d6acff', magenta: '#ff79c6', brightMagenta: '#ff92df',
    cyan: '#8be9fd', brightCyan: '#a4ffff', white: '#f8f8f2', brightWhite: '#ffffff',
  },
  solarized: {
    background: '#002b36', foreground: '#839496', cursor: '#839496', cursorAccent: '#002b36',
    selectionBackground: 'rgba(7,54,66,0.9)',
    black: '#073642', brightBlack: '#002b36', red: '#dc322f', brightRed: '#cb4b16',
    green: '#859900', brightGreen: '#586e75', yellow: '#b58900', brightYellow: '#657b83',
    blue: '#268bd2', brightBlue: '#839496', magenta: '#d33682', brightMagenta: '#6c71c4',
    cyan: '#2aa198', brightCyan: '#93a1a1', white: '#eee8d5', brightWhite: '#fdf6e3',
  },
  monokai: {
    background: '#272822', foreground: '#f8f8f2', cursor: '#f8f8f2', cursorAccent: '#272822',
    selectionBackground: 'rgba(73,72,62,0.9)',
    black: '#272822', brightBlack: '#75715e', red: '#f92672', brightRed: '#f92672',
    green: '#a6e22e', brightGreen: '#a6e22e', yellow: '#f4bf75', brightYellow: '#f4bf75',
    blue: '#66d9e8', brightBlue: '#66d9e8', magenta: '#ae81ff', brightMagenta: '#ae81ff',
    cyan: '#a1efe4', brightCyan: '#a1efe4', white: '#f8f8f2', brightWhite: '#f9f8f5',
  },
};

interface Options {
  containerRef: React.RefObject<HTMLDivElement | null>;
  paneId: string;
  pane: 'left' | 'right';
  fontSize?: number;
  cursorStyle?: 'block' | 'underline' | 'bar';
  scrollback?: number;
  theme?: TerminalThemeName;
  sessionColor?: string;
  onCommand: (entry: CommandEntry) => void;
  onPasteCommand?: (payload: { command: string; stepTitle: string }) => void;
  onCwdChange?: (cwd: string) => void;
  onExitCode?: (code: number) => void;
  onOutputData?: (data: string) => void;
}

export function useTerminal({
  containerRef,
  paneId,
  pane,
  fontSize = 13,
  cursorStyle = 'block',
  scrollback = 5000,
  theme = 'default',
  sessionColor,
  onCommand,
  onPasteCommand,
  onCwdChange,
  onExitCode,
  onOutputData,
}: Options) {
  const termRef       = useRef<Terminal | null>(null);
  const fitRef        = useRef<FitAddon | null>(null);
  const searchRef     = useRef<SearchAddon | null>(null);
  const deadRef       = useRef(false);
  const recEventsRef  = useRef<RecordedEvent[]>([]);
  const recStartRef   = useRef<number>(Date.now());

  const { handleInput } = useCommandLogger({ paneId, pane, onCommand });

  const writeln = useCallback((text: string) => { termRef.current?.writeln(text); }, []);
  const write   = useCallback((text: string) => { termRef.current?.write(text); }, []);
  const getRecordedEvents = useCallback(() => recEventsRef.current, []);
  const resetRecording    = useCallback(() => {
    recEventsRef.current = [];
    recStartRef.current  = Date.now();
  }, []);

  const restart = useCallback(async () => {
    const term = termRef.current;
    if (!term || deadRef.current) return;
    term.writeln('\r\n\x1b[33m[TerminalLink] Reconnecting...\x1b[0m');
    // ptyCreate can return { error } if main rejects (e.g. PTY allocation
    // failed). Without checking, the user sees "Reconnecting..." forever
    // and the pane appears alive even though no shell is attached.
    try {
      const res = await window.electronAPI.ptyCreate(paneId, term.cols, term.rows);
      if (res && (res as { error?: string }).error) {
        term.writeln(`\r\n\x1b[31m[TerminalLink] Reconnect failed: ${(res as { error: string }).error}\x1b[0m`);
        return;
      }
    } catch (e) {
      term.writeln(`\r\n\x1b[31m[TerminalLink] Reconnect failed: ${(e as Error).message}\x1b[0m`);
      return;
    }
    deadRef.current = false;
  }, [paneId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const xtermTheme = THEMES[theme] ?? THEMES.default;
    const cursorColor = sessionColor ?? (xtermTheme as Record<string, string>).cursor ?? '#00ff41';

    const term = new Terminal({
      theme: { ...xtermTheme, cursor: cursorColor },
      fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
      fontSize,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle,
      scrollback: scrollback > 0 ? scrollback : 999999,
      allowProposedApi: true,
    });

    const fitAddon      = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon   = new SearchAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);
    term.open(container);

    termRef.current      = term;
    fitRef.current       = fitAddon;
    searchRef.current    = searchAddon;
    deadRef.current      = false;
    recStartRef.current  = Date.now();
    recEventsRef.current = [];

    const initTimer = setTimeout(() => {
      fitAddon.fit();
      window.electronAPI.ptyCreate(paneId, term.cols, term.rows);
    }, 50);

    const ro = new ResizeObserver(() => {
      try { fitAddon.fit(); window.electronAPI.ptyResize(paneId, term.cols, term.rows); }
      catch { /* ignore */ }
    });
    ro.observe(container);

    const disposeData = term.onData(data => {
      const { broadcastMode } = useTerminalLinkStore.getState();
      if (broadcastMode) {
        window.dispatchEvent(new CustomEvent('tl:broadcast', { detail: { data, sourcePaneId: paneId } }));
      }
      window.electronAPI.ptyWrite(paneId, data);
      handleInput(data);
    });

    const osc7Buf = { text: '' };
    const offPtyData = window.electronAPI.onPtyData(({ id, data }) => {
      if (id !== paneId) return;
      term.write(data);
      recEventsRef.current.push({ ts: Date.now() - recStartRef.current, data });
      onOutputData?.(data);

      // OSC 7 cwd: ESC ] 7 ; file://hostname/path BEL
      osc7Buf.text += data;
      const m = osc7Buf.text.match(/\x1b\]7;file:\/\/[^/]*([^\x07\x1b]+)[\x07\x1b]/);
      if (m) { onCwdChange?.(decodeURIComponent(m[1])); osc7Buf.text = ''; }
      if (osc7Buf.text.length > 1024) osc7Buf.text = osc7Buf.text.slice(-512);
    });

    const offPtyExit = window.electronAPI.onPtyExit(({ id, code }) => {
      if (id !== paneId) return;
      onExitCode?.(code);
      term.writeln(`\r\n\x1b[33m[TerminalLink] Process exited (code ${code}). Reconnecting in 1s...\x1b[0m`);
      deadRef.current = true;
      setTimeout(async () => { if (deadRef.current) await restart(); }, 1000);
    });

    const offPaste = window.electronAPI.onPasteCommand(payload => {
      term.write(payload.command);
      onPasteCommand?.(payload);
    });

    // Broadcast listener — receive from other panes
    const onBroadcast = (e: Event) => {
      const { data, sourcePaneId } = (e as CustomEvent<{ data: string; sourcePaneId: string }>).detail;
      if (sourcePaneId !== paneId) {
        window.electronAPI.ptyWrite(paneId, data);
      }
    };
    window.addEventListener('tl:broadcast', onBroadcast);

    return () => {
      clearTimeout(initTimer);
      deadRef.current = true;
      disposeData.dispose();
      offPtyData();
      offPtyExit();
      offPaste();
      ro.disconnect();
      window.removeEventListener('tl:broadcast', onBroadcast);
      window.electronAPI.ptyKill(paneId).catch(() => undefined);
      term.dispose();
      termRef.current    = null;
      fitRef.current     = null;
      searchRef.current  = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneId]);

  const searchNext  = useCallback((q: string) => searchRef.current?.findNext(q,  { decorations: { matchBackground: 'rgba(0,255,65,0.25)', matchBorder: '#00ff41', activeMatchBackground: 'rgba(0,255,65,0.4)', activeMatchBorder: '#00ff41' } }), []);
  const searchPrev  = useCallback((q: string) => searchRef.current?.findPrevious(q, { decorations: { matchBackground: 'rgba(0,255,65,0.25)', matchBorder: '#00ff41', activeMatchBackground: 'rgba(0,255,65,0.4)', activeMatchBorder: '#00ff41' } }), []);
  const clearSearch = useCallback(() => { try { (searchRef.current as unknown as { clearDecorations?: () => void })?.clearDecorations?.(); } catch { /* ignore */ } }, []);

  return { termRef, fitRef, searchRef, write, writeln, getRecordedEvents, resetRecording, searchNext, searchPrev, clearSearch };
}
