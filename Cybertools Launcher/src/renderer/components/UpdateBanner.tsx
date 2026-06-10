import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UpdateInfo } from '@shared/types';

interface Props {
  updateInfo: UpdateInfo | null;
}

export default function UpdateBanner({ updateInfo }: Props) {
  const [dismissed, setDismissed] = useState(false);

  const visible = updateInfo && !dismissed;
  const displayVersion = updateInfo?.latest ?? updateInfo?.version ?? '';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 36, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden flex-shrink-0"
        >
          {/* Token-driven update banner — uses --warning / --accent-tint tokens */}
          <div
            className="w-full h-full flex items-center justify-between px-3 text-[11px]"
            style={{
              background:   'var(--sev-medium-bg)',
              borderBottom: '1px solid rgba(210,153,34,0.30)',
              color:        'var(--warning)',
            }}
          >
            <span className="font-medium truncate mr-2">
              CyberOS v{displayVersion} available
            </span>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => window.api.openExternal(updateInfo!.url)}
                className="underline hover:opacity-70 transition-opacity"
                style={{ color: 'var(--warning)' }}
              >
                View release
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="hover:opacity-70 transition-opacity leading-none text-[13px]"
                style={{ color: 'var(--warning)' }}
                aria-label="Dismiss update banner"
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
