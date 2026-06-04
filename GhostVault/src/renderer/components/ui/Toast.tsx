// GhostVault — Toast notification system (extracted from Modals.tsx)

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'warn' | 'info'; }

export function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const idRef = useRef(0);

  function addToast(text: string, type: ToastMsg['type'] = 'info', duration = 2800) {
    const id = ++idRef.current;
    setToasts(t => [...t, { id, text, type }]);
    setTimeout(() => removeToast(id), duration);
  }

  function removeToast(id: number) {
    setToasts(t => t.filter(m => m.id !== id));
  }

  return { toasts, addToast, removeToast };
}

const TOAST_META: Record<ToastMsg['type'], { icon: string; bg: string; border: string; color: string }> = {
  success: { icon: '✓', bg: 'rgba(19,21,37,0.96)', border: 'rgba(63,185,80,0.4)',   color: '#3fb950' },
  error:   { icon: '✕', bg: 'rgba(19,21,37,0.96)', border: 'rgba(248,81,73,0.4)',   color: '#f85149' },
  warn:    { icon: '!', bg: 'rgba(19,21,37,0.96)', border: 'rgba(210,153,34,0.4)',  color: '#d29922' },
  info:    { icon: 'i', bg: 'rgba(19,21,37,0.96)', border: 'rgba(123,184,255,0.3)', color: '#7bb8ff' },
};

export function ToastContainer({ toasts, onRemove }: {
  toasts: ToastMsg[];
  onRemove: (id: number) => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => {
          const meta = TOAST_META[t.type];
          return (
            <motion.div key={t.id}
              initial={{ opacity: 0, x: 16, scale: 0.94 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              onClick={() => onRemove(t.id)}
              className="relative flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-xl text-sm font-medium shadow-lg pointer-events-auto cursor-pointer overflow-hidden"
              style={{
                background: meta.bg,
                border: `1px solid ${meta.border}`,
                color: 'var(--text-primary)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                minWidth: 220,
                boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${meta.border}`,
              }}
            >
              <span
                className="w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                style={{ background: `${meta.color}22`, color: meta.color }}
              >
                {meta.icon}
              </span>
              <span className="flex-1 text-xs">{t.text}</span>
              <div
                className="absolute bottom-0 left-0 h-[2px] toast-progress rounded-full"
                style={{ background: meta.color, opacity: 0.5, '--toast-duration': '2.8s' } as React.CSSProperties}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
