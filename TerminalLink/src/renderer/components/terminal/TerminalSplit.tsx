/**
 * TerminalSplit — TerminalLink
 * Container for one or two TerminalPane instances with resizable divider.
 */
import { useRef, useState, useCallback } from 'react';
import TerminalPane from '../TerminalPane';
import type { CommandEntry } from '@shared/types';
import type { OutputAlertRule, TerminalThemeName } from '../../types/terminallink';

interface Props {
  paneLeftId: string;
  paneRightId: string;
  splitMode: boolean;
  activePane: 'left' | 'right';
  broadcastMode?: boolean;
  allPaneIds?: string[];
  alertRules?: OutputAlertRule[];
  sessionColor?: string;
  themeName?: TerminalThemeName;
  onCommand: (entry: CommandEntry) => void;
  onFocusPane: (pane: 'left' | 'right') => void;
  onAlert?: (msg: string) => void;
  onOutputData?: (data: string) => void;
  onCwdChange?: (cwd: string) => void;
  onExitCode?: (code: number) => void;
  writeToTermRef?: React.MutableRefObject<((data: string) => void) | null>;
  activeSessionId?: string | null;
}

export default function TerminalSplit({
  paneLeftId, paneRightId, splitMode, activePane,
  onCommand, onFocusPane, writeToTermRef, activeSessionId,
}: Props) {
  const [splitRatio, setSplitRatio] = useState(50);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct  = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitRatio(Math.min(80, Math.max(20, pct)));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, { once: true });
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: 0, padding: 6, overflow: 'hidden' }}
    >
      <div style={{ width: splitMode ? `${splitRatio}%` : '100%', display: 'flex', overflow: 'hidden', transition: splitMode ? 'none' : 'width 0.2s ease' }}>
        <TerminalPane
          paneId={paneLeftId}
          pane="left"
          active={activePane === 'left'}
          sessionId={activeSessionId ?? undefined}
          onCommand={onCommand}
          onFocus={() => {
            onFocusPane('left');
            if (writeToTermRef) {
              writeToTermRef.current = (data: string) => window.electronAPI.ptyWrite(paneLeftId, data);
            }
          }}
        />
      </div>

      {splitMode && (
        <div
          onMouseDown={onDividerMouseDown}
          style={{
            width: 5, flexShrink: 0, cursor: 'col-resize',
            background: 'transparent',
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{ width: 1, height: '100%', background: 'var(--border)', position: 'absolute' }} />
        </div>
      )}

      {splitMode && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <TerminalPane
            paneId={paneRightId}
            pane="right"
            active={activePane === 'right'}
            sessionId={activeSessionId ?? undefined}
            onCommand={onCommand}
            onFocus={() => {
              onFocusPane('right');
              if (writeToTermRef) {
                writeToTermRef.current = (data: string) => window.electronAPI.ptyWrite(paneRightId, data);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
