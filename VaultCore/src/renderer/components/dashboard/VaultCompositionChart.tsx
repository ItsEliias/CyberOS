import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface FolderStat {
  folder: string;
  count: number;
}

interface Props {
  byFolder: FolderStat[];
  onFolderClick?: (folder: string) => void;
}

function CountUp({ target, delay }: { target: number; delay: number }) {
  const count   = useMotionValue(0);
  const rounded = useTransform(count, v => Math.round(v));
  const ref     = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ctrl = animate(count, target, { duration: 0.7, delay, ease: [0.2, 0.8, 0.2, 1] });
    return ctrl.stop;
  }, [target, delay, count]);

  useEffect(() =>
    rounded.on('change', v => { if (ref.current) ref.current.textContent = String(v); }),
  [rounded]);

  return <span ref={ref}>{target}</span>;
}

export default function VaultCompositionChart({ byFolder, onFolderClick }: Props) {
  if (byFolder.length === 0) return null;

  const max = byFolder[0]?.count || 1;
  const top = byFolder.slice(0, 8);

  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--text-dim)' }}>
        Vault Composition
      </div>
      <div className="space-y-2.5">
        {top.map((f, i) => {
          const pct = Math.max(4, Math.round((f.count / max) * 100));
          const brightness = 60 + Math.round((1 - i / top.length) * 40);
          return (
            <div
              key={f.folder}
              className="flex items-center gap-3 group cursor-pointer"
              onClick={() => onFolderClick?.(f.folder)}
            >
              <span
                className="text-[11px] w-28 truncate shrink-0 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                {f.folder}
              </span>
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(42,51,71,0.4)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.55, delay: i * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
                  style={{
                    background: `linear-gradient(90deg, color-mix(in srgb, #3fb950 ${brightness}%, #1a7a30), color-mix(in srgb, #3fb950 ${brightness + 15}%, #2a9e40))`,
                    boxShadow: i === 0 ? '0 0 6px rgba(63,185,80,0.35)' : undefined,
                  }}
                />
              </div>
              <span
                className="text-[10px] font-mono w-8 text-right shrink-0 tabular-nums"
                style={{ color: 'var(--accent)' }}
              >
                <CountUp target={f.count} delay={i * 0.05} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
