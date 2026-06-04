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
  '#00ff41', '#f85149', '#4a9eff', '#d29922',
  '#b44fff', '#56d4dd', '#ff8c42', '#c8ffc8',
];

interface CtxMenu { id: string; x: number; y: number }

export default function TabBar({
  sessions, activeSessionId, onSelect, onNew, onClose, onRename, onColorChange,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [ctxMenu,   setCtxMenu]   = useState<CtxMenu | null>(null);
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
        height: 32,
        display: 'flex',
        alignItems: 'stretch',
        background: 'rgba(7,12,5,0.95)',
        borderBottom: '1px solid rgba(0,255,65,0.1)',
        overflowX: 'auto',
        flexShrink: 0,
        scrollbarWidth: 'none',
        fontFamily: 'var(--font-mono)',
      }}>
        {sessions.map(sess => {
          const isActive = sess.id === activeSessionId;
          const color    = sess.color ?? '#00ff41';
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
                borderRight: '1px solid rgba(0,255,65,0.07)',
                borderBottom: isActive
                  ? `2px solid ${color}`
                  : '2px solid transparent',
                background: isActive
                  ? 'rgba(0,255,65,0.07)'
                  : 'transparent',
                boxShadow: isActive
                  ? `inset 0 -1px 6px rgba(0,255,65,0.08), 0 0 0 0 transparent`
                  : 'none',
                flexShrink: 0,
                minWidth: 90,
                maxWidth: 160,
                position: 'relative',
                userSelect: 'none',
                transition: 'background 0.15s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.15s ease',
              }}
            >
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: color, flexShrink: 0,
                boxShadow: isActive ? `0 0 6px ${color}` : 'none',
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
                    flex: 1, minWidth: 0, fontSize: 10,
                    background: 'rgba(0,255,65,0.05)',
                    border: `1px solid ${color}`,
                    borderRadius: 2,
                    color: '#c8ffc8',
                    padding: '1px 4px',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                  }}
                />
              ) : (
                <span style={{
                  flex: 1, fontSize: 10,
                  color: isActive ? '#c8ffc8' : 'rgba(0,255,65,0.4)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontWeight: isActive ? 500 : 400,
                  letterSpacing: '0.03em',
                }}>
                  {sess.name}
                </span>
              )}

              <button
                onClick={e => { e.stopPropagation(); onClose(sess.id); }}
                title="Close tab"
                style={{
                  fontSize: 9,
                  color: 'rgba(0,255,65,0.3)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', padding: '2px 4px',
                  lineHeight: 1, flexShrink: 0,
                  fontFamily: 'var(--font-mono)',
                  borderRadius: 4,
                  transition: 'color 0.15s ease, background 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#f85149';
                  e.currentTarget.style.background = 'rgba(248,81,73,0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'rgba(0,255,65,0.3)';
                  e.currentTarget.style.background = 'none';
                }}
              >
                ✕
              </button>
            </div>
          );
        })}

        {/* New tab */}
        <button
          onClick={onNew}
          title="New session (Cmd+T)"
          style={{
            padding: '0 12px', fontSize: 16,
            color: 'rgba(0,255,65,0.35)',
            background: 'none', border: 'none',
            cursor: 'pointer', flexShrink: 0, lineHeight: 1,
            fontFamily: 'var(--font-mono)',
            transition: 'color 0.15s ease, transform 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#00ff41';
            e.currentTarget.style.transform = 'scale(1.2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'rgba(0,255,65,0.35)';
            e.currentTarget.style.transform = 'scale(1)';
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
            position: 'fixed', top: ctxMenu.y, left: ctxMenu.x,
            zIndex: 9999,
            background: '#0d1208',
            border: '1px solid rgba(0,255,65,0.2)',
            borderRadius: 4, minWidth: 160,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            fontSize: 11, fontFamily: 'var(--font-mono)',
          }}
        >
          <CtxItem label="Rename" onClick={() => {
            const sess = sessions.find(s => s.id === ctxMenu.id);
            if (sess) startRename(ctxMenu.id, sess.name);
            setCtxMenu(null);
          }} />
          <div style={{ padding: '6px 10px 4px', fontSize: 9, color: 'rgba(0,255,65,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Color
          </div>
          <div style={{ display: 'flex', gap: 5, padding: '2px 10px 8px' }}>
            {SESSION_COLORS.map(c => (
              <div
                key={c}
                onClick={() => { onColorChange(ctxMenu.id, c); setCtxMenu(null); }}
                title={c}
                style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: c, cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(0,255,65,0.1)' }} />
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
        padding: '7px 12px', cursor: 'pointer',
        color: danger ? '#f85149' : '#7abf7a',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,255,65,0.06)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {label}
    </div>
  );
}
