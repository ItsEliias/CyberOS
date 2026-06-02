import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ScrapeResult, ScrapeDiff, DiffLine } from '@shared/types';

interface Props {
  result: ScrapeResult;
  onOpenObsidian: () => void;
  onViewSources: () => void;
  onNewScrape: () => void;
}

export default function ScrapeSummary({ result, onOpenObsidian, onViewSources, onNewScrape }: Props) {
  // Flatten all suggested tags across notes
  const allSuggestedTags = Object.values(result.suggestedTags ?? {}).flat();
  const uniqueInitial = [...new Set(allSuggestedTags)];
  const [activeTagsSet, setActiveTags] = useState<Set<string>>(new Set(uniqueInitial));
  const [customTag, setCustomTag] = useState('');
  const [showUpdates, setShowUpdates] = useState(false);
  const [diffOpenIndex, setDiffOpenIndex] = useState<number | null>(null);

  function toggleTag(tag: string) {
    setActiveTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function addCustomTag() {
    const t = customTag.trim().replace(/^#/, '');
    if (!t) return;
    setActiveTags(prev => new Set([...prev, `#${t}`]));
    setCustomTag('');
  }

  const updatedNotes  = result.updatedNotes ?? [];
  const folderStats   = result.folderStats ?? [];
  const scrapeDiffs   = result.scrapeDiffs ?? [];

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
      className="border-b overflow-hidden"
      style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>

        {/* Diff-style headline */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-semibold" style={{ color: '#3fb950' }}>✓ Scrape Complete</span>
          <span style={{ color: 'var(--text-dim)' }}>—</span>
          {result.saved > 0 && (
            <span className="font-mono" style={{ color: '#3fb950' }}>+{result.saved} new</span>
          )}
          {result.updated > 0 && (
            <span className="font-mono" style={{ color: '#7bb8ff' }}>{result.updated} updated</span>
          )}
          {(result.skipped ?? 0) > 0 && (
            <span className="font-mono" style={{ color: 'var(--text-dim)' }}>{result.skipped} unchanged</span>
          )}
          {result.failed > 0 && (
            <span className="font-mono" style={{ color: '#f85149' }}>{result.failed} failed</span>
          )}
        </div>

        {/* Updated note diffs */}
        {updatedNotes.length > 0 && (
          <div>
            <button
              onClick={() => setShowUpdates(v => !v)}
              className="text-[10px] uppercase tracking-wider"
              style={{ color: 'var(--accent)' }}>
              {showUpdates ? '▼' : '▶'} Updated notes ({updatedNotes.length})
            </button>
            {showUpdates && (
              <div className="mt-2 space-y-2">
                {updatedNotes.slice(0, 8).map((n, i) => (
                  <div key={i} className="rounded p-2 text-[10px] font-mono"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                    <div className="font-semibold mb-1 truncate" style={{ color: 'var(--text-muted)' }}>{n.title}</div>
                    {n.oldFirstLine && (
                      <div className="truncate" style={{ color: '#f85149' }}>− {n.oldFirstLine}</div>
                    )}
                    {n.newFirstLine && (
                      <div className="truncate" style={{ color: '#3fb950' }}>+ {n.newFirstLine}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scrape diffs */}
        {scrapeDiffs.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>
              Content Changes
            </div>
            <div className="space-y-2">
              {scrapeDiffs.map((diff: ScrapeDiff, idx: number) => {
                const added   = diff.diff.filter((l: DiffLine) => l.type === 'added').length;
                const removed = diff.diff.filter((l: DiffLine) => l.type === 'removed').length;
                const noChange = added === 0 && removed === 0;
                const isOpen  = diffOpenIndex === idx;
                const label   = diff.url.length > 55 ? '…' + diff.url.slice(-52) : diff.url;
                return (
                  <div key={idx} className="rounded border overflow-hidden"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg3)' }}>
                    <button
                      onClick={() => setDiffOpenIndex(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left"
                      style={{ background: 'transparent' }}>
                      <span className="text-[10px] font-mono truncate flex-1" style={{ color: 'var(--text-muted)' }}>{label}</span>
                      {noChange ? (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0"
                          style={{ background: 'rgba(63,185,80,0.1)', color: 'var(--success)' }}>
                          No changes
                        </span>
                      ) : (
                        <span className="ml-2 text-[10px] flex-shrink-0 font-mono" style={{ color: 'var(--text-muted)' }}>
                          {added > 0 && <span style={{ color: 'var(--success)' }}>▲ {added} added</span>}
                          {added > 0 && removed > 0 && ' / '}
                          {removed > 0 && <span style={{ color: 'var(--error)' }}>▼ {removed} removed</span>}
                          <span className="ml-1.5" style={{ color: 'var(--text-dim)' }}>{isOpen ? '▲' : '▼'}</span>
                        </span>
                      )}
                    </button>
                    {isOpen && !noChange && (
                      <div className="border-t overflow-y-auto font-mono"
                        style={{ borderColor: 'var(--border)', maxHeight: 260, fontSize: 10 }}>
                        {diff.diff.map((line: DiffLine, li: number) => (
                          <div key={li}
                            className={line.type !== 'unchanged' ? 'border-l-2 px-3 py-0.5' : 'px-3 py-0.5'}
                            style={
                              line.type === 'added'
                                ? { background: 'rgba(63,185,80,0.08)', color: 'var(--success)', borderColor: 'var(--success)' }
                                : line.type === 'removed'
                                  ? { background: 'rgba(248,81,73,0.08)', color: 'var(--error)', borderColor: 'var(--error)', textDecoration: 'line-through', opacity: 0.7 }
                                  : { color: 'var(--text-muted)' }
                            }>
                            <span style={{ userSelect: 'none', opacity: 0.5, marginRight: 8 }}>
                              {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}
                            </span>
                            {line.line}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Suggested tags */}
        {uniqueInitial.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>
              Suggested tags — click to deselect
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {uniqueInitial.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="px-2 py-0.5 rounded-full text-[10px] border transition-all"
                  style={activeTagsSet.has(tag)
                    ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' }
                    : { background: 'transparent', borderColor: 'var(--border)', color: 'var(--text-dim)', textDecoration: 'line-through' }}>
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                value={customTag}
                onChange={e => setCustomTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomTag()}
                placeholder="Add tag…"
                className="flex-1 px-2 py-1 rounded text-[10px] outline-none"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              <button onClick={addCustomTag}
                className="px-2 py-1 rounded text-[10px] border"
                style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                + Add
              </button>
            </div>
          </div>
        )}

        {/* Folder stats */}
        {folderStats.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>
              Vault by category
            </div>
            <div className="space-y-1">
              {folderStats.slice(0, 8).map(f => (
                <div key={f.folder} className="flex items-center gap-2">
                  <span className="flex-1 text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{f.folder}</span>
                  <div className="h-1 rounded-full overflow-hidden" style={{ width: 60, background: 'var(--border)' }}>
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(100, (f.count / (folderStats[0]?.count || 1)) * 100)}%`,
                      background: 'var(--accent)'
                    }} />
                  </div>
                  <span className="text-[10px] font-mono w-8 text-right" style={{ color: 'var(--accent)' }}>{f.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button onClick={onOpenObsidian}
            className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            Open in Obsidian
          </button>
          <button onClick={onViewSources}
            className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            View Sources
          </button>
          <button onClick={onNewScrape}
            className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            New Scrape
          </button>
        </div>
      </div>
    </motion.div>
  );
}
