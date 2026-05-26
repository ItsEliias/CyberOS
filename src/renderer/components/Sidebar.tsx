import type { PanelId } from '@shared/types';
import { useStore } from '../store';

const PANELS: Array<{ id: PanelId; label: string; icon: string }> = [
  { id: 'chat',        label: 'Chat',         icon: '💬' },
  { id: 'commands',    label: 'Commands',     icon: '⚡' },
  { id: 'reverseshell',label: 'Rev Shell',    icon: '🐚' },
  { id: 'encoder',     label: 'Encoder',      icon: '🔐' },
  { id: 'cheatsheets', label: 'Cheatsheets',  icon: '📋' },
  { id: 'snippets',    label: 'Snippets',     icon: '📎' },
  { id: 'labtracker',  label: 'Lab Tracker',  icon: '📊' },
  { id: 'progress',    label: 'Progress',     icon: '🏆' },
  { id: 'writeup',     label: 'Writeup',      icon: '📝' },
  { id: 'settings',    label: 'Settings',     icon: '⚙️' },
];

export default function Sidebar() {
  const { tabs, activeTabId, setActivePanel } = useStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const activePanel = activeTab?.activePanel || 'chat';

  function handlePanelClick(panelId: PanelId) {
    if (activeTabId) setActivePanel(activeTabId, panelId);
  }

  return (
    <div className="flex flex-col bg-[var(--sidebar-bg)] border-r border-[var(--border)] w-[52px] flex-shrink-0 py-2">
      {PANELS.map(p => (
        <button
          key={p.id}
          className={`relative flex flex-col items-center justify-center py-3 px-1 transition-colors group ${
            activePanel === p.id
              ? 'text-[var(--accent)] bg-[var(--accent-dim)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
          }`}
          style={{ border: 'none', borderRadius: 0 }}
          onClick={() => handlePanelClick(p.id)}
          data-tooltip={p.label}
        >
          <span className="text-base leading-none">{p.icon}</span>
          {activePanel === p.id && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[var(--accent)] rounded-r" />
          )}
        </button>
      ))}
    </div>
  );
}
