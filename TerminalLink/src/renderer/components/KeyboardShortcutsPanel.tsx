/**
 * KeyboardShortcutsPanel — TerminalLink
 * Slide-in overlay showing all keyboard shortcuts.
 * Trigger: ⌘? (Cmd+Shift+/) or ⌘?
 * Visual-only component — no IPC, no store mutations.
 */

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{ keys: string[]; label: string }>;
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Sessions',
    shortcuts: [
      { keys: ['⌘', 'T'],        label: 'New session' },
      { keys: ['⌘', 'W'],        label: 'Close active session' },
      { keys: ['⌘', '⌥', '←'],  label: 'Previous tab' },
      { keys: ['⌘', '⌥', '→'],  label: 'Next tab' },
      { keys: ['Dbl-click tab'], label: 'Rename session' },
      { keys: ['Right-click tab'], label: 'Session options' },
    ],
  },
  {
    title: 'Terminal',
    shortcuts: [
      { keys: ['Ctrl', 'F'],     label: 'Search in terminal' },
      { keys: ['⌘', 'Shift', 'B'], label: 'Toggle broadcast mode' },
      { keys: ['⌘', 'Shift', '\\'], label: 'Toggle split pane' },
      { keys: ['⌘', 'L'],       label: 'Open tool launcher' },
    ],
  },
  {
    title: 'Panels',
    shortcuts: [
      { keys: ['⌘', 'Shift', 'H'], label: 'Toggle history panel' },
      { keys: ['⌘', 'Shift', 'S'], label: 'Toggle snippets panel' },
      { keys: ['⌘', 'Shift', 'P'], label: 'Command palette' },
      { keys: ['⌘', '?'],        label: 'This shortcut panel' },
    ],
  },
  {
    title: 'History',
    shortcuts: [
      { keys: ['⌘', 'F'],        label: 'Focus history search' },
      { keys: ['Click row'],     label: 'Copy command' },
    ],
  },
  {
    title: 'Global',
    shortcuts: [
      { keys: ['Escape'],        label: 'Close overlay / cancel' },
      { keys: ['⌘', 'K'],       label: 'Clear terminal' },
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 20, height: 18,
      padding: '0 5px',
      fontSize: 9,
      fontFamily: 'var(--font-mono)',
      color: 'rgba(0,255,65,0.75)',
      background: 'rgba(0,255,65,0.07)',
      border: '1px solid rgba(0,255,65,0.2)',
      borderRadius: 3,
      boxShadow: '0 1px 0 rgba(0,255,65,0.15)',
      lineHeight: '16px',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </kbd>
  );
}

interface Props {
  onClose: () => void;
}

export default function KeyboardShortcutsPanel({ onClose }: Props) {
  return (
    <div style={{
      width: 300,
      height: '100%',
      background: 'rgba(7,12,5,0.98)',
      borderLeft: '1px solid rgba(0,255,65,0.2)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'var(--font-mono)',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid rgba(0,255,65,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
        background: 'rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 2, height: 14, background: '#00ff41', borderRadius: 1, boxShadow: '0 0 6px rgba(0,255,65,0.5)' }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#00ff41' }}>
            Shortcuts
          </span>
          <Kbd>⌘?</Kbd>
        </div>
        <button
          onClick={onClose}
          title="Close (Escape)"
          style={{
            background: 'none', border: 'none',
            color: 'rgba(0,255,65,0.4)', cursor: 'pointer',
            fontSize: 14, lineHeight: 1, padding: '2px 4px',
            borderRadius: 3,
            transition: 'color 0.12s ease, background 0.12s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#f85149';
            e.currentTarget.style.background = 'rgba(248,81,73,0.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'rgba(0,255,65,0.4)';
            e.currentTarget.style.background = 'none';
          }}
        >
          ✕
        </button>
      </div>

      {/* Groups */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {SHORTCUT_GROUPS.map(group => (
          <div key={group.title} style={{ marginBottom: 4 }}>
            {/* Group heading */}
            <div style={{
              padding: '5px 14px 3px',
              fontSize: 9, color: 'rgba(0,255,65,0.35)',
              textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700,
              borderBottom: '1px solid rgba(0,255,65,0.07)',
              background: 'rgba(0,255,65,0.02)',
            }}>
              {group.title}
            </div>

            {group.shortcuts.map((s, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 14px',
                  borderBottom: '1px solid rgba(0,255,65,0.04)',
                  gap: 8,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,255,65,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 10, color: '#7abf7a', flex: 1, minWidth: 0 }}>
                  {s.label}
                </span>
                <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0, flexWrap: 'nowrap' }}>
                  {s.keys.map((key, ki) => (
                    <span key={ki} style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      {ki > 0 && <span style={{ fontSize: 8, color: 'rgba(0,255,65,0.25)' }}>+</span>}
                      <Kbd>{key}</Kbd>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div style={{
        padding: '6px 14px',
        borderTop: '1px solid rgba(0,255,65,0.08)',
        fontSize: 9, color: 'rgba(0,255,65,0.25)',
        textAlign: 'center', flexShrink: 0,
      }}>
        Press <span style={{ color: 'rgba(0,255,65,0.5)' }}>Escape</span> or <span style={{ color: 'rgba(0,255,65,0.5)' }}>⌘?</span> to close
      </div>
    </div>
  );
}
