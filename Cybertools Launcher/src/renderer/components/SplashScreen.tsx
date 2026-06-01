import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  visible: boolean;
  onHide: () => void;
}

export default function SplashScreen({ visible, onHide }: Props) {
  return (
    <AnimatePresence onExitComplete={onHide}>
      {visible && (
        <motion.div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: 'var(--bg)' }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--accent)', boxShadow: '0 0 32px var(--shadow-color)' }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <path d="M6 18L18 6L30 18L18 30L6 18Z" fill="white" fillOpacity="0.9"/>
                <path d="M12 18L18 12L24 18L18 24L12 18Z" fill="white"/>
              </svg>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold tracking-widest uppercase"
                style={{ color: 'var(--accent)' }}>
                CYBERTOOLS
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                ItsEliias
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
