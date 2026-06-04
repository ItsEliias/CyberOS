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
          className="btn-ghost text-xs py-2 rounded flex items-center justify-center gap-1.5 transition-colors"
          style={{ fontSize: '11px' }}
          onClick={() => handleClick(action)}
        >
          <span>{action.icon}</span>
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
