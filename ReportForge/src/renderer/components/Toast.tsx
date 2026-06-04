import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

const TYPE_CONFIG: Record<ToastType, { color: string; icon: React.ReactNode; bg: string }> = {
  success: {
    color: '#3fb950',
    bg: 'rgba(63,185,80,0.06)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="#3fb950" strokeWidth="1.5" />
        <path d="M4.5 7L6.2 8.7L9.5 5.5" stroke="#3fb950" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  error: {
    color: '#f85149',
    bg: 'rgba(248,81,73,0.06)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="#f85149" strokeWidth="1.5" />
        <path d="M5 5l4 4M9 5l-4 4" stroke="#f85149" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  info: {
    color: '#4a9eff',
    bg: 'rgba(74,158,255,0.06)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="#4a9eff" strokeWidth="1.5" />
        <path d="M7 6.5V10" stroke="#4a9eff" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="7" cy="4.5" r="0.75" fill="#4a9eff" />
      </svg>
    ),
  },
};

const TOAST_STACK_LIMIT = 3;

export function ToastContainer({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: string) => void }) {
  const visible = toasts.slice(-TOAST_STACK_LIMIT);
  const overflowCount = Math.max(0, toasts.length - TOAST_STACK_LIMIT);

  return (
    <div style={{ position: 'fixed', top: 60, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {/* Overflow chip */}
      <AnimatePresence>
        {overflowCount > 0 && (
          <motion.div
            key="overflow-chip"
            initial={{ opacity: 0, y: -8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            style={{
              alignSelf: 'flex-end',
              pointerEvents: 'all',
              cursor: 'default',
              background: 'rgba(42,51,71,0.85)',
              border: '1px solid rgba(74,158,255,0.3)',
              borderRadius: 99,
              padding: '4px 12px',
              fontSize: 11,
              color: '#4a9eff',
              fontWeight: 600,
              backdropFilter: 'blur(6px)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            }}
          >
            + {overflowCount} more
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {visible.map(t => {
          const cfg = TYPE_CONFIG[t.type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 24, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.95 }}
              transition={{ type: 'spring', damping: 22, stiffness: 320 }}
              onClick={() => onRemove(t.id)}
              style={{
                background: 'var(--surface-1)',
                borderRadius: 8,
                padding: '10px 14px 10px 12px',
                color: 'var(--text-primary)',
                fontSize: 13,
                cursor: 'pointer',
                minWidth: 220,
                maxWidth: 380,
                pointerEvents: 'all',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.3)',
                border: '1px solid rgba(42,51,71,0.8)',
                borderLeft: `3px solid ${cfg.color}`,
                backdropFilter: 'blur(8px)',
              }}
            >
              <span style={{ flexShrink: 0 }}>{cfg.icon}</span>
              <span style={{ flex: 1, lineHeight: 1.4, fontSize: 12, color: 'var(--text-primary)' }}>{t.message}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10, flexShrink: 0, lineHeight: 1 }}>✕</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
