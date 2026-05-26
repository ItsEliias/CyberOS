import { motion, AnimatePresence } from 'framer-motion';
import type { UpdateInfo } from '@shared/types';

interface Props {
  updateInfo: UpdateInfo | null;
}

export default function UpdateBanner({ updateInfo }: Props) {
  return (
    <AnimatePresence>
      {updateInfo && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <button
            onClick={() => window.api.openExternal(updateInfo.url)}
            className="w-full px-4 py-2 flex items-center justify-between text-[11px] transition-opacity hover:opacity-80"
            style={{ background: 'rgba(74,158,255,.12)', borderBottom: '1px solid rgba(74,158,255,.25)' }}
          >
            <span style={{ color: '#4a9eff' }}>Update v{updateInfo.version} available</span>
            <span style={{ color: 'var(--text-dim)' }}>Download →</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
