import { useState, useRef, useCallback, useEffect } from 'react';
import type { PanelId, BgThemeId, AccentThemeId } from '@shared/types';
import { useStore } from '../store';
import { BG_THEMES, ACCENT_THEMES } from '../lib/themes';

// ─── Panel definitions ────────────────────────────────────────────────────────

const PANELS: Array<{ id: PanelId; label: string; icon: string; help: string }> = [
  { id: 'chat',         label: 'Chat',        icon: '💬',
    help: 'AI assistant powered by Claude. Ask anything about the lab — exploits, enumeration, privilege escalation. Context is kept across the whole session.' },
  { id: 'commands',     label: 'Commands',    icon: '⚡',
    help: 'Command builder for common pentest tools (nmap, ffuf, gobuster, etc.). Your target IP/hostname auto-fills into every template.' },
  { id: 'reverseshell', label: 'Rev Shell',   icon: '🐚',
    help: 'Reverse shell generator. Pick a language and OS, enter your listener IP and port, and get a ready-to-paste one-liner.' },
  { id: 'encoder',      label: 'Encoder',     icon: '🔐',
    help: 'Encode and decode strings — Base64, URL, hex, HTML entities. Useful for decoding server responses or crafting payloads.' },
  { id: 'cheatsheets',  label: 'Cheatsheets', icon: '📋',
    help: 'Quick-reference sheets for privilege escalation, file transfers, web attacks, Active Directory, and more.' },
  { id: 'snippets',     label: 'Snippets',    icon: '📎',
    help: 'Save your own reusable commands and payloads. Star favourites, search by tag, copy with one click.' },
  { id: 'labtracker',   label: 'Lab Tracker', icon: '📊',
    help: 'Kanban board to track machines across HTB, THM, and other platforms. Log status, flags, and notes per target.' },
  { id: 'progress',     label: 'Progress',    icon: '🏆',
    help: 'Sync your HTB and THM stats — completed machines, rank, points, and recent activity.' },
  { id: 'findings',     label: 'Findings',    icon: '🔍',
    help: 'All findings logged for this session — ports, credentials, flags, CVEs, and more. Send any finding to ReconDesk with one click.' },
  { id: 'history',      label: 'Lab History', icon: '📅',
    help: 'All past lab sessions — sortable by name, date, duration, flags, and hints. Click a row to expand session details.' },
  { id: 'writeup',      label: 'Writeup',     icon: '📝',
    help: 'Writeup editor with category templates, auto-save to GhostVault, CVE tag detection, PDF/HTML export and collaboration export.' },
  { id: 'knowledgebase',label: 'Knowledge Base',icon: '📚',
    help: 'Persistent notes across all sessions. Categories: Commands, Payloads, Theory, References. Full-text search.' },
  { id: 'stats',        label: 'Stats',       icon: '📈',
    help: 'Time-to-solve analytics: average time per category, personal records, solve sparkline, flags by category.' },
  { id: 'settings',     label: 'Settings',    icon: '⚙️',
    help: 'Configure API key, operator name, Obsidian vault path, output directory, and app preferences.' },
];

const BG_IDS     = Object.keys(BG_THEMES)     as BgThemeId[];
const ACCENT_IDS = Object.keys(ACCENT_THEMES) as AccentThemeId[];

// ─── Help bubble (fixed-positioned to avoid overflow clipping) ───────────────

function HelpBubble({ text, anchorRef, onClose }: {
  text: string;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.top + r.height / 2, left: r.right + 10 });
    }
  }, [anchorRef]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) onClose();
    }
    setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      ref={bubbleRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        transform: 'translateY(-50%)',
        zIndex: 9999,
        width: '220px',
        background: 'var(--panel)',
        border: '1px solid var(--accent)',
        borderRadius: '8px',
        padding: '10px 12px',
        fontSize: '12px',
        lineHeight: '1.55',
        color: 'var(--text-dim)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        pointerEvents: 'auto',
      }}
    >
      {/* arrow pointing left */}
      <div style={{
        position: 'absolute',
        right: '100%',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 0, height: 0,
        borderTop: '5px solid transparent',
        borderBottom: '5px solid transparent',
        borderRight: '6px solid var(--accent)',
      }} />
      {text}
    </div>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({ panel, isActive, onClick, openHelp, onHelpToggle }: {
  panel: typeof PANELS[number];
  isActive: boolean;
  onClick: () => void;
  openHelp: PanelId | null;
  onHelpToggle: (id: PanelId, ref: React.RefObject<HTMLElement | null>) => void;
}) {
  const rowRef   = useRef<HTMLDivElement>(null);
  const helpBtnRef = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);

  const handleHelpClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onHelpToggle(panel.id, helpBtnRef as React.RefObject<HTMLElement | null>);
  }, [panel.id, onHelpToggle]);

  return (
    <div
      ref={rowRef}
      className="relative flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* active left bar */}
      <div
        style={{
          position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
          width: '3px', height: isActive ? '20px' : '0',
          background: 'var(--accent)', borderRadius: '0 2px 2px 0',
          transition: 'height 0.15s',
        }}
      />

      {/* main nav button */}
      <button
        onClick={onClick}
        style={{
          flex: 1,
          display: 'flex', alignItems: 'center', gap: '9px',
          padding: '9px 10px 9px 14px',
          background: isActive ? 'var(--accent-dim)' : hovered ? 'var(--bg3)' : 'transparent',
          color: isActive ? 'var(--accent)' : hovered ? 'var(--text)' : 'var(--text-muted)',
          border: 'none', borderRadius: 0, textAlign: 'left',
          transition: 'background 0.12s, color 0.12s',
          minWidth: 0,
        }}
      >
        <span style={{ fontSize: '14px', flexShrink: 0, lineHeight: 1 }}>{panel.icon}</span>
        <span style={{ fontSize: '12px', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {panel.label}
        </span>
      </button>

      {/* ? help button — only visible on hover */}
      <button
        ref={helpBtnRef}
        onClick={handleHelpClick}
        style={{
          flexShrink: 0,
          width: '18px', height: '18px',
          marginRight: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', fontWeight: 700,
          background: openHelp === panel.id ? 'var(--accent)' : 'var(--bg4)',
          color: openHelp === panel.id ? '#fff' : 'var(--text-muted)',
          border: '1px solid var(--border2)',
          borderRadius: '50%',
          opacity: hovered || openHelp === panel.id ? 1 : 0,
          transition: 'opacity 0.15s, background 0.12s',
          padding: 0,
        }}
      >
        ?
      </button>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { tabs, activeTabId, setActivePanel, setBgTheme, setAccentTheme, bgTheme, accentTheme } = useStore();
  const activeTab   = tabs.find(t => t.id === activeTabId);
  const activePanel = activeTab?.activePanel || 'chat';

  const [openHelp, setOpenHelp]     = useState<PanelId | null>(null);
  const [helpAnchor, setHelpAnchor] = useState<React.RefObject<HTMLElement | null> | null>(null);

  const handleHelpToggle = useCallback((id: PanelId, ref: React.RefObject<HTMLElement | null>) => {
    setOpenHelp(prev => {
      if (prev === id) { setHelpAnchor(null); return null; }
      setHelpAnchor(ref);
      return id;
    });
  }, []);

  const closeHelp = useCallback(() => { setOpenHelp(null); setHelpAnchor(null); }, []);

  return (
    <div
      style={{
        width: '168px', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        paddingTop: '6px',
      }}
    >
      {/* Nav items */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'visible' }}>
        {PANELS.map(p => (
          <NavItem
            key={p.id}
            panel={p}
            isActive={activePanel === p.id}
            onClick={() => activeTabId && setActivePanel(activeTabId, p.id)}
            openHelp={openHelp}
            onHelpToggle={handleHelpToggle}
          />
        ))}
      </div>

      {/* Theme picker */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '10px 12px 10px' }}>
        {/* Background row */}
        <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '6px' }}>
          Background
        </p>
        <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {BG_IDS.map(id => (
            <button
              key={id}
              title={BG_THEMES[id].name}
              onClick={() => setBgTheme(id)}
              style={{
                width: '18px', height: '18px', borderRadius: '50%', padding: 0, border: 'none',
                background: BG_THEMES[id].dot,
                outline: bgTheme === id ? `2px solid var(--accent)` : '2px solid transparent',
                outlineOffset: '2px',
                transform: bgTheme === id ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform 0.15s, outline 0.15s',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        {/* Accent row */}
        <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '6px' }}>
          Colour
        </p>
        <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
          {ACCENT_IDS.map(id => (
            <button
              key={id}
              title={ACCENT_THEMES[id].name}
              onClick={() => setAccentTheme(id)}
              style={{
                width: '18px', height: '18px', borderRadius: '50%', padding: 0, border: 'none',
                background: ACCENT_THEMES[id].dot,
                outline: accentTheme === id ? `2px solid ${ACCENT_THEMES[id].dot}` : '2px solid transparent',
                outlineOffset: '2px',
                transform: accentTheme === id ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform 0.15s, outline 0.15s',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      </div>

      {/* Help bubble rendered at root level to escape overflow clipping */}
      {openHelp && helpAnchor && (
        <HelpBubble
          text={PANELS.find(p => p.id === openHelp)!.help}
          anchorRef={helpAnchor}
          onClose={closeHelp}
        />
      )}
    </div>
  );
}
