import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import NewSessionModal from './modals/NewSessionModal';
import type { Tab } from '@shared/types';

const MAX_TABS = 6;

function pad(n: number) { return String(n).padStart(2, '0'); }

// Separate component so hooks are called at component level, not inside a map()
function TabItem({ tab, isActive, canClose, onSelect, onClose }: {
  tab: Tab;
  isActive: boolean;
  canClose: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  const [tick, setTick] = useState(0);
  const running = tab.session?.timer?.running ?? false;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, [running]);

  const label = tab.session.labName || tab.session.name || 'New Session';
  const hasLab = label !== 'New Session';

  let timerDisplay = '';
  if (hasLab && running) {
    const elapsed = (tab.session?.timer?.elapsed ?? 0) + tick;
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    timerDisplay = `${pad(m)}:${pad(s)}`;
  }

  return (
    <motion.div
      key={tab.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10, width: 0 }}
      transition={{ duration: 0.15 }}
      className="flex-shrink-0 flex items-center gap-2 px-3 cursor-pointer relative"
      style={{
        height: 36,
        fontSize: '12px',
        color: isActive ? '#b44fff' : '#8b949e',
        background: isActive ? 'rgba(180, 79, 255, 0.08)' : 'transparent',
        borderRight: '1px solid rgba(42, 51, 71, 0.4)',
        borderBottom: isActive ? '2px solid #b44fff' : '2px solid transparent',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
        maxWidth: '200px',
        minWidth: '100px',
      }}
      onClick={onSelect}
    >
      {hasLab && (
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            background: isActive ? '#b44fff' : '#3fb950',
            boxShadow: isActive ? '0 0 4px rgba(180, 79, 255, 0.6)' : '0 0 4px rgba(63, 185, 80, 0.4)',
          }}
        />
      )}

      <span className="truncate" style={{ maxWidth: 110 }}>{label}</span>

      {timerDisplay && (
        <span className="font-mono text-[10px] flex-shrink-0" style={{ color: isActive ? '#b44fff' : '#4a5568', opacity: 0.7 }}>
          {timerDisplay}
        </span>
      )}

      {canClose && (
        <button
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(139, 148, 158, 0.5)',
            padding: 0,
            fontSize: '14px',
            lineHeight: 1,
            marginLeft: 'auto',
          }}
          onClick={e => { e.stopPropagation(); onClose(); }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f85149'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(139, 148, 158, 0.5)'; }}
        >
          ×
        </button>
      )}
    </motion.div>
  );
}

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useStore();
  const [showNewSession, setShowNewSession] = useState(false);

  function handleAdd() {
    if (tabs.length >= MAX_TABS) return;
    setShowNewSession(true);
  }

  return (
    <>
      <div
        className="flex items-center overflow-x-auto shrink-0"
        style={{
          minHeight: 36,
          background: 'rgba(10, 10, 15, 0.9)',
          borderBottom: '1px solid rgba(42, 51, 71, 0.5)',
        }}
      >
        <AnimatePresence mode="popLayout">
          {tabs.map(tab => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              canClose={tabs.length > 1}
              onSelect={() => setActiveTab(tab.id)}
              onClose={() => closeTab(tab.id)}
            />
          ))}
        </AnimatePresence>

        {tabs.length < MAX_TABS && (
          <button
            className="flex-shrink-0 w-9 h-full flex items-center justify-center"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#4a5568',
              fontSize: '18px',
              lineHeight: 1,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#b44fff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#4a5568'; }}
            onClick={handleAdd}
            title="New Session"
          >
            +
          </button>
        )}
      </div>

      <AnimatePresence>
        {showNewSession && (
          <NewSessionModal onClose={() => setShowNewSession(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
