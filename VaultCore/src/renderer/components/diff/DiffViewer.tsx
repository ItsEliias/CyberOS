import { AnimatePresence, motion } from 'framer-motion';
import type { ScrapeRun, NoteDiff } from '../../types/vaultcore';

interface Props {
  run: ScrapeRun;
  onClose: () => void;
}

function DiffTypeBadge({ type }: { type: NoteDiff['type'] }) {
  const map = {
    new: { label: 'NEW', color: '#3fb950', bg: 'rgba(63,185,80,0.1)' },
    updated: { label: 'UPD', color: '#7bb8ff', bg: 'rgba(123,184,255,0.1)' },
    unchanged: { label: '=', color: 'var(--text-dim)', bg: 'var(--bg3)' },
  };
  const s = map[type];
  return (
    <span
      className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 font-bold"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function DiffViewer({ run, onClose }: Props) {
  const r = run.result;

  const newNotes = r?.diffs.filter((d) => d.type === 'new') ?? [];
  const updatedNotes = r?.diffs.filter((d) => d.type === 'updated') ?? [];

  return (
    <AnimatePresence>
      <motion.div
        key="diff-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl border overflow-hidden"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Run Diff: {run.sourceName}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                {run.completedAt ? formatDate(run.completedAt) : formatDate(run.startedAt)}
              </div>
              {r && (
                <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                  <span style={{ color: '#3fb950' }}>{r.newNotes} new</span>
                  <span style={{ color: '#7bb8ff' }}>{r.updatedNotes} updated</span>
                  <span style={{ color: 'var(--text-dim)' }}>{r.unchangedNotes} unchanged</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-lg leading-none w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-white/10"
              style={{ color: 'var(--text-dim)' }}
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}
          >
            {!r ? (
              <div className="text-center py-10 text-sm" style={{ color: 'var(--text-dim)' }}>
                {run.status === 'failed' ? (
                  <div>
                    <div className="mb-1" style={{ color: '#f85149' }}>Run failed</div>
                    <div className="text-[11px]">{run.error}</div>
                  </div>
                ) : 'No diff data available'}
              </div>
            ) : (
              <>
                {newNotes.length > 0 && (
                  <section>
                    <div
                      className="text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2"
                      style={{ color: '#3fb950' }}
                    >
                      <span>New Notes</span>
                      <span className="font-mono">({newNotes.length})</span>
                    </div>
                    <div className="space-y-1">
                      {newNotes.map((d) => (
                        <div
                          key={d.path}
                          className="flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-mono"
                          style={{ background: 'rgba(63,185,80,0.06)' }}
                        >
                          <DiffTypeBadge type="new" />
                          <span className="truncate" style={{ color: 'var(--text-muted)' }}>{d.path}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {updatedNotes.length > 0 && (
                  <section>
                    <div
                      className="text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2"
                      style={{ color: '#7bb8ff' }}
                    >
                      <span>Updated Notes</span>
                      <span className="font-mono">({updatedNotes.length})</span>
                    </div>
                    <div className="space-y-2">
                      {updatedNotes.map((d) => (
                        <div
                          key={d.path}
                          className="px-2 py-2 rounded text-[11px] font-mono space-y-1"
                          style={{ background: 'rgba(123,184,255,0.06)', border: '1px solid rgba(123,184,255,0.1)' }}
                        >
                          <div className="flex items-center gap-2">
                            <DiffTypeBadge type="updated" />
                            <span className="truncate" style={{ color: 'var(--text-muted)' }}>{d.path}</span>
                            {d.changePercent != null && (
                              <span className="ml-auto shrink-0 text-[9px]" style={{ color: 'var(--text-dim)' }}>
                                {d.changePercent}% changed
                              </span>
                            )}
                          </div>
                          {d.oldFirstLine && (
                            <div className="flex gap-1.5 text-[10px]">
                              <span style={{ color: '#f85149' }}>OLD:</span>
                              <span className="truncate" style={{ color: 'var(--text-dim)' }}>{d.oldFirstLine}</span>
                            </div>
                          )}
                          {d.newFirstLine && (
                            <div className="flex gap-1.5 text-[10px]">
                              <span style={{ color: '#3fb950' }}>NEW:</span>
                              <span className="truncate" style={{ color: 'var(--text-muted)' }}>{d.newFirstLine}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {r.suggestedTags.length > 0 && (
                  <section>
                    <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>
                      Tags Applied
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.suggestedTags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {newNotes.length === 0 && updatedNotes.length === 0 && (
                  <div className="text-center py-10 text-sm" style={{ color: 'var(--text-dim)' }}>
                    No changes detected in this run
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
