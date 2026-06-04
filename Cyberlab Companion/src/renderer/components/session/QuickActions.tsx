import type { PanelId } from '@shared/types';
import { useStore } from '../../store';

interface QuickActionsProps {
  onFlagLogger: () => void;
  onNotes: () => void;
}

const ACTIONS: Array<{
  label: string;
  icon: string;
  panel?: PanelId;
  action?: 'flags' | 'notes';
}> = [
  { label: 'Commands', icon: '📋', panel: 'commands' },
  { label: 'Notes',    icon: '📝', action: 'notes' },
  { label: 'Flags',    icon: '⚑',  action: 'flags' },
  { label: 'Writeup',  icon: '📄', panel: 'writeup' },
];

export default function QuickActions({ onFlagLogger, onNotes }: QuickActionsProps) {
  const { activeTabId, setActivePanel } = useStore();

  function handleClick(action: typeof ACTIONS[number]) {
    if (action.panel && activeTabId) {
      setActivePanel(activeTabId, action.panel);
    } else if (action.action === 'flags') {
      onFlagLogger();
    } else if (action.action === 'notes') {
      onNotes();
    }
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {ACTIONS.map(action => (
        <button
          key={action.label}
          className="btn-ghost flex items-center justify-center gap-1.5"
          style={{
            fontSize: '11px',
            padding: '7px 10px',
            borderRadius: '10px',
            transition: 'all 0.2s cubic-bezier(0.2,0.8,0.2,1)',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget;
            el.style.transform = 'translateY(-1px) scale(1.03)';
            el.style.borderColor = 'rgba(180,79,255,0.4)';
            el.style.color = 'var(--accent)';
            el.style.background = 'rgba(180,79,255,0.08)';
            el.style.boxShadow = '0 4px 12px rgba(180,79,255,0.2), 0 0 0 1px rgba(180,79,255,0.15)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget;
            el.style.transform = '';
            el.style.borderColor = '';
            el.style.color = '';
            el.style.background = '';
            el.style.boxShadow = '';
          }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0) scale(0.97)'; }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px) scale(1.03)'; }}
          onClick={() => handleClick(action)}
        >
          <span style={{ fontSize: '12px' }}>{action.icon}</span>
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
