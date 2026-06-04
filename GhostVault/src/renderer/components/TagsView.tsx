// GhostVault — Tags View (Screen 3)
// Tag cloud with counts; click to filter notes

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import type { NoteFile } from '@shared/types';

interface TagStats {
  tag: string;
  count: number;
}

function parseTags(content?: string, noteName?: string): string[] {
  const tags: string[] = [];
  // Frontmatter YAML: tags: [a, b] or tags:\n  - a
  if (content) {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const fm = frontmatterMatch[1];
      // tags: [a, b, c]
      const inlineMatch = fm.match(/^tags:\s*\[([^\]]*)\]/m);
      if (inlineMatch) {
        inlineMatch[1].split(',').forEach(t => {
          const tag = t.trim().replace(/['"]/g, '');
          if (tag) tags.push(tag.startsWith('#') ? tag.slice(1) : tag);
        });
      }
      // tags:\n  - a
      const blockMatches = fm.matchAll(/^  - (.+)$/gm);
      for (const m of blockMatches) {
        const tag = m[1].trim().replace(/['"]/g, '');
        if (tag) tags.push(tag.startsWith('#') ? tag.slice(1) : tag);
      }
    }
    // Inline #tags
    const inlineTags = content.match(/(?<!\w)#([\w-]+)/g) || [];
    inlineTags.forEach(t => tags.push(t.slice(1)));
  }
  return [...new Set(tags)];
}

interface Props {
  onOpenNote: (note: NoteFile) => void;
}

export default function TagsView({ onOpenNote }: Props) {
  const { notes } = useStore();
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [noteContents, setNoteContents] = useState<Record<string, string>>({});

  // Build tag stats from note names (content-based tags would need async loading)
  const tagStats = useMemo<TagStats[]>(() => {
    const counts: Record<string, number> = {};
    for (const note of notes) {
      // Parse tags from stored content if available
      const content = noteContents[note.path];
      const tags = parseTags(content, note.name);
      // Also infer folder as implicit tag
      if (note.folder && note.folder !== '/' && note.folder !== '') {
        const folderTag = note.folder.toLowerCase().replace(/\s+/g, '-');
        counts[folderTag] = (counts[folderTag] || 0) + 1;
      }
      for (const tag of tags) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [notes, noteContents]);

  const maxCount = tagStats[0]?.count || 1;

  const filteredNotes = useMemo(() => {
    if (!activeTag) return [];
    return notes.filter(n => {
      const folderTag = n.folder.toLowerCase().replace(/\s+/g, '-');
      if (folderTag === activeTag) return true;
      const content = noteContents[n.path] || '';
      const tags = parseTags(content, n.name);
      return tags.includes(activeTag);
    });
  }, [activeTag, notes, noteContents]);

  async function handleTagClick(tag: string) {
    if (activeTag === tag) {
      setActiveTag(null);
      return;
    }
    setActiveTag(tag);
    // Load content for notes in this tag for richer display
    const unloaded = notes.filter(n => !noteContents[n.path]);
    if (unloaded.length > 0 && unloaded.length <= 20) {
      const results = await Promise.all(
        unloaded.map(async n => {
          try {
            const c = await window.ghostvault.readNote(n.path);
            return [n.path, c] as [string, string];
          } catch { return null; }
        })
      );
      const newContents: Record<string, string> = {};
      for (const r of results) {
        if (r) newContents[r[0]] = r[1];
      }
      setNoteContents(prev => ({ ...prev, ...newContents }));
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
        <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>Tags</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
          {tagStats.length} tag{tagStats.length !== 1 ? 's' : ''} across {notes.length} notes
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Tag cloud */}
        <div className="w-72 border-r flex flex-col shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
            {tagStats.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-sm" style={{ color: 'var(--text-dim)' }}>No tags found</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-dim)', opacity: 0.7 }}>
                  Add #tags to your notes
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tagStats.map((ts, i) => {
                  const size = 0.75 + (ts.count / maxCount) * 0.5;
                  const isActive = activeTag === ts.tag;
                  return (
                    <motion.button
                      key={ts.tag}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => handleTagClick(ts.tag)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all"
                      style={{
                        fontSize: `${size}rem`,
                        background: isActive ? '#7bb8ff' : 'var(--bg3)',
                        borderColor: isActive ? '#7bb8ff' : 'var(--border)',
                        color: isActive ? '#0a0a0f' : 'var(--text-muted)',
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      <span>#</span>
                      <span>{ts.tag}</span>
                      <span
                        className="text-[10px] px-1 rounded-full"
                        style={{
                          background: isActive ? 'rgba(10,10,15,0.2)' : 'rgba(123,184,255,0.15)',
                          color: isActive ? '#0a0a0f' : '#7bb8ff',
                        }}
                      >
                        {ts.count}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Notes with selected tag */}
        <div className="flex-1 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
          {!activeTag && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-dim)', opacity: 0.4 }}>
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              <div className="text-sm" style={{ color: 'var(--text-dim)' }}>Select a tag to view notes</div>
            </div>
          )}

          {activeTag && filteredNotes.length === 0 && (
            <div className="text-sm py-8 text-center" style={{ color: 'var(--text-dim)' }}>
              No notes found for #{activeTag}
            </div>
          )}

          {activeTag && filteredNotes.length > 0 && (
            <>
              <div className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--text-dim)' }}>
                #{activeTag} · {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}
              </div>
              <div className="space-y-2">
                {filteredNotes.map((note, i) => (
                  <motion.button
                    key={note.path}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => onOpenNote(note)}
                    className="w-full text-left px-4 py-3 rounded-lg border transition-all hover:scale-[1.01]"
                    style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
                  >
                    <div className="text-sm font-medium mb-0.5" style={{ color: 'var(--text)' }}>
                      {note.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{note.folder}</span>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>
                        {new Date(note.mtime).toLocaleDateString()}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
