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

const typeColors: Record<ToastType, string> = {
  success: 'var(--success)',
  error  : 'var(--error)',
  info   : 'var(--accent)',
};

export function ToastContainer({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: string) => void }) {
  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            onClick={() => onRemove(t.id)}
            style={{
              background: 'var(--panel)',
              border: `1px solid ${typeColors[t.type]}`,
              borderRadius: 6,
              padding: '8px 16px',
              color: 'var(--text)',
              fontSize: 13,
              cursor: 'pointer',
              minWidth: 200,
              maxWidth: 360,
              boxShadow: `0 2px 12px rgba(0,0,0,0.4)`,
            }}
          >
            <span style={{ color: typeColors[t.type], marginRight: 8 }}>
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✗' : '•'}
            </span>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
