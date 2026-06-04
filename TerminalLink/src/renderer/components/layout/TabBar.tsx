import { useState, useRef, useCallback } from 'react';
import type { TerminalSession } from '../../types/terminallink';

interface Props {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onClose: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onColorChange: (id: string, color: string) => void;
}

const SESSION_COLORS = [
  '#00ff41', '#ff4444', '#4a9eff', '#e3b341',
  '#b44fff', '#56d4dd', '#ff8c00', '#ffffff',
];

interface CtxMenu { id: string; x: number; y: number }

export default function TabBar({
  sessions, activeSessionId, onSelect, onNew, onClose, onRename, onColorChange,
}: Props) {
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editValue, setEditValue]   = useState('');
  const [ctxMenu,   setCtxMenu]     = useState<CtxMenu | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const startRename = useCallback((id: string, name: string) => {
    setEditingId(id);
    setEditValue(name);
    setTimeout(() => inputRef.current?.select(), 30);
  }, []);

  const commitRename = useCallback(() => {
    if (editingId && editValue.trim()) onRename(editingId, editValue.trim());
    setEditingId(null);
  }, [editingId, editValue, onRename]);

  const handleTabCtx = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setCtxMenu({ id, x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div style={{
        height: 30,
        display: 'flex',
        alignItems: 'stretch',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto',
        flexShrink: 0,
        scrollbarWidth: 'none',
      }}>
        {sessions.map(sess => {
          const isActive = sess.id === activeSessionId;
          const color    = sess.color ?? 'var(--accent)';
          return (
            <div
              key={sess.id}
              onClick={() => onSelect(sess.id)}
              onDoubleClick={() => startRename(sess.id, sess.name)}
              onContextMenu={e => handleTabCtx(e, sess.id)}
              title={sess.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '0 10px',
                cursor: 'pointer',
                borderRight: '1px solid var(--border)',
                borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
                background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                flexShrink: 0,
                minWidth: 80,
                maxWidth: 160,
                position: 'relative',
                userSelect: 'none',
              }}
            >
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
                boxShadow: isActive ? `0 0 5px ${color}` : 'none',
              }} />

              {editingId === sess.id ? (
                <input
                  ref={inputRef}
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onClick={e => e.stopPropagation()}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 10,
                    background: 'var(--bg)',
                    border: `1px solid ${color}`,
                    borderRadius: 2,
                    color: 'var(--text)',
                    padding: '1px 4px',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
              ) : (
                <span style={{
                  flex: 1,
                  fontSize: 10,
                  color: isActive ? 'var(--text)' : 'var(--text-dim)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {sess.name}
                </span>
              )}

              <button
                onClick={e => { e.stopPropagation(); onClose(sess.id); }}
                title="Close tab"
                style={{
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0 2px',
                  lineHeight: 1,
                  flexShrink: 0,
                  opacity: 0.6,
                }}
              >
                ✕
              </button>
            </div>
          );
        })}

        {/* New tab button */}
        <button
          onClick={onNew}
          title="New session (Cmd+T)"
          style={{
            padding: '0 10px',
            fontSize: 14,
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          +
        </button>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          onMouseLeave={() => setCtxMenu(null)}
          style={{
            position: 'fixed',
            top: ctxMenu.y,
            left: ctxMenu.x,
            zIndex: 9999,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            minWidth: 160,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            fontSize: 11,
          }}
        >
          <CtxItem label="Rename" onClick={() => {
            const sess = sessions.find(s => s.id === ctxMenu.id);
            if (sess) startRename(ctxMenu.id, sess.name);
            setCtxMenu(null);
          }} />
          <div style={{ padding: '6px 10px 4px', fontSize: 10, color: 'var(--text-muted)' }}>Color</div>
          <div style={{ display: 'flex', gap: 5, padding: '2px 10px 8px' }}>
            {SESSION_COLORS.map(c => (
              <div
                key={c}
                onClick={() => { onColorChange(ctxMenu.id, c); setCtxMenu(null); }}
                title={c}
                style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: c, cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)' }} />
          <CtxItem label="Close" danger onClick={() => { onClose(ctxMenu.id); setCtxMenu(null); }} />
        </div>
      )}
    </>
  );
}

function CtxItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '7px 12px',
        cursor: 'pointer',
        color: danger ? 'var(--error)' : 'var(--text-dim)',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {label}
    </div>
  );
}
