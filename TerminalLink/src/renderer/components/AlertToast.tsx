import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  message: string | null;
  onDismiss: () => void;
}

export default function AlertToast({ message, onDismiss }: Props) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={onDismiss}
          style={{
            position: 'fixed',
            bottom: 36,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9997,
            background: 'rgba(7,12,5,0.97)',
            border: '1px solid rgba(0,255,65,0.5)',
            borderRadius: 10,
            padding: '9px 18px',
            fontSize: 12,
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            boxShadow: '0 0 24px rgba(0,255,65,0.25), 0 8px 32px rgba(0,0,0,0.5)',
            userSelect: 'none',
            maxWidth: 420,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0,
            boxShadow: '0 0 6px rgba(0,255,65,0.8)',
          }} className="status-dot-pulse" />
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
