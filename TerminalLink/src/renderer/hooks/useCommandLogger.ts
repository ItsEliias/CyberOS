/**
 * useCommandLogger — TerminalLink
 * Tracks an input buffer per PTY and logs commands on Enter.
 * Handles backspace, arrow-key escape sequences, and empty Enter suppression.
 *
 * Usage: call handleInput(data) from the xterm onData handler.
 * Returns the input handler and a method to read the current buffer.
 */
import { useRef, useCallback } from 'react';
import type { CommandEntry } from '@shared/types';

interface Options {
  paneId: string;
  pane: 'left' | 'right';
  onCommand: (entry: CommandEntry) => void;
}

// Filter ANSI escape sequences from the accumulated buffer so logged
// commands are clean even after cursor-key history navigation.
function stripEscapes(str: string): string {
  // ESC [ ... (CSI sequences) and ESC O ... (SS3 sequences)
  return str
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    .replace(/\x1b[O][A-Za-z]/g, '')
    .replace(/\x1b./g, '')
    .trim();
}

export function useCommandLogger({ paneId, pane, onCommand }: Options) {
  const bufferRef = useRef('');
  const lastCommandRef = useRef('');

  const handleInput = useCallback((data: string): void => {
    for (let i = 0; i < data.length; i++) {
      const ch = data[i];
      const code = data.charCodeAt(i);

      if (ch === '\r' || ch === '\n') {
        const raw = bufferRef.current;
        const cmd = stripEscapes(raw);
        bufferRef.current = '';

        if (cmd && cmd !== lastCommandRef.current) {
          lastCommandRef.current = cmd;
          onCommand({
            id:        `${paneId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            pane,
            command:   cmd,
            timestamp: new Date().toISOString(),
          });
        }
      } else if (ch === '\x7f' || code === 8) {
        // Backspace / DEL
        bufferRef.current = bufferRef.current.slice(0, -1);
      } else if (ch === '\x1b') {
        // Start of escape sequence — consume until end of sequence
        // Just append to buffer; stripEscapes will clean on Enter
        bufferRef.current += ch;
      } else if (code >= 32) {
        // Printable character
        bufferRef.current += ch;
      }
      // Ignore other control codes (ctrl+c, etc.)
    }
  }, [paneId, pane, onCommand]);

  const clearBuffer = useCallback((): void => {
    bufferRef.current = '';
  }, []);

  return { handleInput, clearBuffer };
}
