// GhostVault — Editor empty state (ghost/notebook domain glyph)

export default function EditorEmptyState() {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8 content-stream-in"
      style={{ pointerEvents: 'none' }}
    >
      {/* ghost/quick-capture domain glyph */}
      <div className="empty-glyph">
        <svg width="22" height="22" viewBox="0 0 16 16" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2C5.8 2 4 3.8 4 6c0 2 1.2 3.4 2.4 4.4L8 14l1.6-3.6C10.8 9.4 12 8 12 6c0-2.2-1.8-4-4-4z" />
          <circle cx="8" cy="6" r="1.5" fill="currentColor" />
        </svg>
      </div>

      <div>
        <div className="empty-title mb-1">No note open</div>
        <div className="empty-sub" style={{ margin: '0 auto 12px' }}>
          Select a note from the list or create one
        </div>
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--surface-2)', color: 'var(--accent)',
                border: '1px solid var(--accent-border)',
                fontSize: 'var(--type-caption)', fontFamily: 'var(--font-mono)',
              }}>
              ⌘N
            </kbd>
            <span style={{ fontSize: 'var(--type-caption)', color: 'var(--text-muted)' }}>new note</span>
          </div>
          <span className="status-sep">·</span>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--surface-2)', color: 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
                fontSize: 'var(--type-caption)', fontFamily: 'var(--font-mono)',
              }}>
              ⌘S
            </kbd>
            <span style={{ fontSize: 'var(--type-caption)', color: 'var(--text-muted)' }}>save</span>
          </div>
        </div>
      </div>
    </div>
  );
}
