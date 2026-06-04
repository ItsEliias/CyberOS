import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import type { ReportSection, SectionComment } from '@shared/types';
import { makeId } from '../lib/defaults';

interface Props {
  section: ReportSection;
  onClose: () => void;
}

export default function CommentsPanel({ section, onClose }: Props) {
  const { updateSection } = useStore();
  const [draft, setDraft] = useState('');
  const comments = section.comments ?? [];
  const unresolved = comments.filter(c => !c.resolved).length;

  function addComment() {
    const text = draft.trim();
    if (!text) return;
    const newComment: SectionComment = {
      id       : makeId(),
      text,
      author   : 'You',
      createdAt: new Date().toISOString(),
      resolved : false,
    };
    updateSection(section.id, { comments: [...comments, newComment] });
    setDraft('');
  }

  function resolveComment(id: string) {
    updateSection(section.id, {
      comments: comments.map(c => c.id === id ? { ...c, resolved: true } : c),
    });
  }

  function deleteComment(id: string) {
    updateSection(section.id, { comments: comments.filter(c => c.id !== id) });
  }

  function timeAgo(iso: string): string {
    const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return new Date(iso).toLocaleDateString();
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      style={{
        width: 280, flexShrink: 0, borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', background: 'var(--panel)',
        height: '100%',
      }}
    >
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>
          Comments
          {unresolved > 0 && (
            <span style={{ marginLeft: 6, background: 'var(--accent)', color: '#000', borderRadius: 99, padding: '1px 6px', fontSize: 10 }}>
              {unresolved}
            </span>
          )}
        </div>
        <button className="btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={onClose}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {comments.length === 0 ? (
          <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            No comments yet.
          </div>
        ) : (
          <AnimatePresence>
            {comments.map(c => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border)',
                  opacity: c.resolved ? 0.5 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)' }}>{c.author}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(c.createdAt)}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text)', marginBottom: 6, lineHeight: 1.5 }}>{c.text}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!c.resolved && (
                    <button
                      onClick={() => resolveComment(c.id)}
                      style={{ fontSize: 10, background: 'none', border: '1px solid var(--border)', borderRadius: 3, padding: '2px 7px', cursor: 'pointer', color: 'var(--accent)' }}
                    >
                      Resolve
                    </button>
                  )}
                  {c.resolved && (
                    <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>Resolved</span>
                  )}
                  <button
                    onClick={() => deleteComment(c.id)}
                    style={{ fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } }}
          style={{ width: '100%', resize: 'none', fontSize: 12, marginBottom: 6 }}
        />
        <button
          className="btn-primary"
          style={{ width: '100%', padding: '5px 0', fontSize: 11 }}
          disabled={!draft.trim()}
          onClick={addComment}
        >
          Add Comment
        </button>
      </div>
    </motion.div>
  );
}

export function unresolvedCount(section: ReportSection): number {
  return (section.comments ?? []).filter(c => !c.resolved).length;
}
