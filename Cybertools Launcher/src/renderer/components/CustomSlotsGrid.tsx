import { motion, AnimatePresence } from 'framer-motion';
import type { CustomSlot } from '@shared/types';

interface Props {
  slots: CustomSlot[];
  onLaunch: (key: string) => void;
  onAdd: () => void;
  onEdit: (index: number, slot: CustomSlot) => void;
}

export default function CustomSlotsGrid({ slots, onLaunch, onAdd, onEdit }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[10px] uppercase tracking-wider font-semibold"
          style={{ color: 'var(--text-muted)' }}>Pinned</span>
        {slots.length < 4 && (
          <button
            onClick={onAdd}
            className="text-[10px] px-2 py-0.5 rounded transition-colors hover:bg-white/10"
            style={{ color: 'var(--accent)', border: '1px solid var(--accent)' }}
          >
            + Add
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <AnimatePresence>
          {slots.map((slot, i) => (
            <motion.div
              key={`${slot.name}-${i}`}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative rounded-lg p-2.5 border group cursor-default"
              style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                {slot.icon ? (
                  <span className="text-base flex-shrink-0">{slot.icon}</span>
                ) : (
                  <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--surface-2)' }}>
                    <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
                      {slot.name.slice(0, 2)}
                    </span>
                  </div>
                )}
                <span className="text-[11px] font-medium truncate text-text-primary">
                  {slot.name}
                </span>
              </div>

              <div className="flex gap-1 mt-2">
                <button
                  onClick={() => onLaunch(`custom_${i}`)}
                  className="flex-1 text-[10px] py-0.5 rounded font-medium transition-colors"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  Open
                </button>
                <button
                  onClick={() => onEdit(i, slot)}
                  className="text-[10px] px-1.5 py-0.5 rounded transition-colors hover:bg-white/10"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                >
                  ✎
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
