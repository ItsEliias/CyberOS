import { motion } from 'framer-motion';

interface FolderStat {
  folder: string;
  count: number;
}

interface Props {
  byFolder: FolderStat[];
  onFolderClick?: (folder: string) => void;
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
      <div className="space-y-2">
        {top.map((f, i) => {
          const pct = Math.max(4, Math.round((f.count / max) * 100));
          return (
            <div
              key={f.folder}
              className="flex items-center gap-3 group cursor-pointer"
              onClick={() => onFolderClick?.(f.folder)}
            >
              <span
                className="text-[11px] w-32 truncate shrink-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--text-muted)' }}
              >
                {f.folder}
              </span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
                  style={{
                    background: `color-mix(in srgb, #3fb950 ${60 + Math.round((1 - i / top.length) * 40)}%, #1a7a30)`,
                  }}
                />
              </div>
              <span
                className="text-[10px] font-mono w-8 text-right shrink-0"
                style={{ color: 'var(--accent)' }}
              >
                {f.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
