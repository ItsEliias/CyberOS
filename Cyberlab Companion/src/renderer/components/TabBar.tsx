import { useStore } from '../store';
import { createSession } from '../lib/session';

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, addTab } = useStore();

  function handleAdd() {
    addTab(createSession({ name: 'New Session' }));
  }

  return (
    <div className="flex items-center tab-bar overflow-x-auto flex-shrink-0" style={{ minHeight: 36 }}>
      {tabs.map(tab => (
        <div
          key={tab.id}
          className={`tab-item flex-shrink-0 ${tab.id === activeTabId ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="max-w-[140px] truncate text-xs">
            {tab.session.labName || tab.session.name || 'New Session'}
          </span>
          {tabs.length > 1 && (
            <button
              className="ml-1 text-[var(--text-muted)] hover:text-[var(--danger)] text-xs leading-none"
              style={{ border: 'none', background: 'none', padding: '0 2px', minWidth: 'auto' }}
              onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        className="px-3 h-full text-[var(--text-muted)] hover:text-[var(--accent)] text-lg leading-none flex-shrink-0"
        style={{ border: 'none', background: 'none', borderRadius: 0 }}
        onClick={handleAdd}
        data-tooltip="New Session"
      >
        +
      </button>
    </div>
  );
}
