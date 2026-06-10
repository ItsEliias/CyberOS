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
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8, width: 0 }}
      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      className="flex-shrink-0 flex items-center gap-2 px-3 cursor-pointer relative group"
      style={{
        height: 32,
        fontSize: 'var(--type-body)',
        color: isActive ? '#b44fff' : 'var(--text-muted)',
        background: isActive ? 'rgba(180,79,255,0.08)' : 'transparent',
        borderRight: '1px solid var(--border-subtle)',
        borderBottom: isActive ? '1.5px solid #b44fff' : '1.5px solid transparent',
        transition: 'background 0.15s var(--ease), color 0.15s var(--ease), border-color 0.15s var(--ease)',
        whiteSpace: 'nowrap',
        maxWidth: '200px',
        minWidth: '90px',
      }}
      onClick={onSelect}
      onMouseEnter={e => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-1)';
          (e.currentTarget as HTMLDivElement).style.color = 'var(--text-secondary)';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.background = 'transparent';
          (e.currentTarget as HTMLDivElement).style.color = 'var(--text-muted)';
        }
      }}
    >
      {hasLab && (
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            background: isActive ? '#b44fff' : '#3fb950',
            boxShadow: running ? '0 0 4px rgba(63,185,80,0.5)' : 'none',
          }}
        />
      )}

      <span className="truncate" style={{ maxWidth: 110 }}>{label}</span>

      {timerDisplay && (
        <span
          className="font-mono tabular-nums flex-shrink-0"
          style={{ fontSize: 'var(--type-caption)', color: isActive ? '#b44fff' : 'var(--text-muted)', opacity: 0.75 }}
        >
          {timerDisplay}
        </span>
      )}

      {canClose && (
        <button
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            padding: 0,
            fontSize: '13px',
            lineHeight: 1,
            marginLeft: 'auto',
            opacity: 0.5,
          }}
          onClick={e => { e.stopPropagation(); onClose(); }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#f85149';
            (e.currentTarget as HTMLButtonElement).style.opacity = '1';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.5';
          }}
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
          minHeight: 32,
          background: 'var(--surface-0)',
          borderBottom: '1px solid var(--border-subtle)',
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
            className="flex-shrink-0 w-8 h-full flex items-center justify-center"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '16px',
              lineHeight: 1,
              transition: 'color var(--motion-fast) var(--ease), transform var(--motion-fast) var(--spring)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = '#b44fff';
              el.style.transform = 'rotate(90deg) scale(1.1)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = 'var(--text-muted)';
              el.style.transform = 'rotate(0deg) scale(1)';
            }}
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
