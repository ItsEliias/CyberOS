import { useState, useRef, useCallback, useEffect } from 'react';
import type { PanelId, BgThemeId, AccentThemeId } from '@shared/types';
import { useStore } from '../store';
import { BG_THEMES, ACCENT_THEMES } from '../lib/themes';

// ─── SVG icon set — 14×14 viewBox, stroke-based, consistent weight ───────────

function IconChat() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H2a1 1 0 00-1 1v8a1 1 0 001 1h3l3 3 3-3h3a1 1 0 001-1V3a1 1 0 00-1-1z" />
    </svg>
  );
}
function IconCommands() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 6 2 8 4 10" /><polyline points="12 6 14 8 12 10" /><line x1="9" y1="4" x2="7" y2="12" />
    </svg>
  );
}
function IconShell() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="14" height="12" rx="1.5" />
      <polyline points="4 6 7 8 4 10" /><line x1="9" y1="10" x2="12" y2="10" />
    </svg>
  );
}
function IconEncoder() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="4" height="8" rx="1" /><rect x="9" y="4" width="4" height="8" rx="1" />
      <line x1="7" y1="8" x2="9" y2="8" />
    </svg>
  );
}
function IconCheatsheets() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="1" width="12" height="14" rx="1" />
      <line x1="5" y1="5" x2="11" y2="5" /><line x1="5" y1="8" x2="11" y2="8" /><line x1="5" y1="11" x2="8" y2="11" />
    </svg>
  );
}
function IconSnippets() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" />
      <line x1="5.5" y1="6" x2="10.5" y2="6" /><line x1="5.5" y1="9" x2="8.5" y2="9" />
      <circle cx="11" cy="11" r="2" strokeWidth="1.25" /><line x1="12.4" y1="12.4" x2="14" y2="14" />
    </svg>
  );
}
function IconLabTracker() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="4" height="10" rx="0.75" /><rect x="6" y="3" width="4" height="7" rx="0.75" /><rect x="11" y="3" width="4" height="5" rx="0.75" />
    </svg>
  );
}
function IconProgress() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" /><polyline points="8 4 8 8 10.5 10" />
      <path d="M11 2.5L13.5 4" strokeWidth="1.25" />
    </svg>
  );
}
function IconFindings() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="5" /><line x1="10.5" y1="10.5" x2="14" y2="14" />
      <line x1="5" y1="7" x2="9" y2="7" /><line x1="7" y1="5" x2="7" y2="9" />
    </svg>
  );
}
function IconHistory() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 8A6.5 6.5 0 108 1.5" /><polyline points="1.5 1.5 1.5 5.5 5.5 5.5" />
      <polyline points="8 5 8 8 10 10" />
    </svg>
  );
}
function IconWriteup() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V5z" />
      <polyline points="11 2 11 5 14 5" />
      <line x1="5" y1="8" x2="11" y2="8" /><line x1="5" y1="11" x2="8" y2="11" />
    </svg>
  );
}
function IconKnowledgeBase() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h5a2 2 0 012 2v8a1.5 1.5 0 00-1.5-1.5H2V3z" />
      <path d="M14 3H9a2 2 0 00-2 2v8a1.5 1.5 0 011.5-1.5H14V3z" />
    </svg>
  );
}
function IconStats() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 11 5 6 8 9 11 5 15 8" />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" strokeWidth="1.25" />
    </svg>
  );
}

type PanelIcon = React.FC;

// ─── Panel definitions ────────────────────────────────────────────────────────

const PANELS: Array<{ id: PanelId; label: string; Icon: PanelIcon; help: string }> = [
  { id: 'chat',         label: 'Chat',         Icon: IconChat,
    help: 'AI assistant powered by Claude. Ask anything about the lab — exploits, enumeration, privilege escalation. Context is kept across the whole session.' },
  { id: 'commands',     label: 'Commands',     Icon: IconCommands,
    help: 'Command builder for common pentest tools (nmap, ffuf, gobuster, etc.). Your target IP/hostname auto-fills into every template.' },
  { id: 'reverseshell', label: 'Rev Shell',    Icon: IconShell,
    help: 'Reverse shell generator. Pick a language and OS, enter your listener IP and port, and get a ready-to-paste one-liner.' },
  { id: 'encoder',      label: 'Encoder',      Icon: IconEncoder,
    help: 'Encode and decode strings — Base64, URL, hex, HTML entities. Useful for decoding server responses or crafting payloads.' },
  { id: 'cheatsheets',  label: 'Cheatsheets',  Icon: IconCheatsheets,
    help: 'Quick-reference sheets for privilege escalation, file transfers, web attacks, Active Directory, and more.' },
  { id: 'snippets',     label: 'Snippets',     Icon: IconSnippets,
    help: 'Save your own reusable commands and payloads. Star favourites, search by tag, copy with one click.' },
  { id: 'labtracker',   label: 'Lab Tracker',  Icon: IconLabTracker,
    help: 'Kanban board to track machines across HTB, THM, and other platforms. Log status, flags, and notes per target.' },
  { id: 'progress',     label: 'Progress',     Icon: IconProgress,
    help: 'Sync your HTB and THM stats — completed machines, rank, points, and recent activity.' },
  { id: 'findings',     label: 'Findings',     Icon: IconFindings,
    help: 'All findings logged for this session — ports, credentials, flags, CVEs, and more. Send any finding to ReconDesk with one click.' },
  { id: 'history',      label: 'Lab History',  Icon: IconHistory,
    help: 'All past lab sessions — sortable by name, date, duration, flags, and hints. Click a row to expand session details.' },
  { id: 'writeup',      label: 'Writeup',      Icon: IconWriteup,
    help: 'Writeup editor with category templates, auto-save to GhostVault, CVE tag detection, PDF/HTML export and collaboration export.' },
  { id: 'knowledgebase',label: 'Knowledge',    Icon: IconKnowledgeBase,
    help: 'Persistent notes across all sessions. Categories: Commands, Payloads, Theory, References. Full-text search.' },
  { id: 'stats',        label: 'Stats',        Icon: IconStats,
    help: 'Time-to-solve analytics: average time per category, personal records, solve sparkline, flags by category.' },
  { id: 'settings',     label: 'Settings',     Icon: IconSettings,
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

function NavItem({ panel, isActive, onClick, openHelp, onHelpToggle, showDot }: {
  panel: typeof PANELS[number];
  isActive: boolean;
  onClick: () => void;
  openHelp: PanelId | null;
  onHelpToggle: (id: PanelId, ref: React.RefObject<HTMLElement | null>) => void;
  showDot?: boolean;
}) {
  const rowRef   = useRef<HTMLDivElement>(null);
  const helpBtnRef = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);

  const handleHelpClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onHelpToggle(panel.id, helpBtnRef as React.RefObject<HTMLElement | null>);
  }, [panel.id, onHelpToggle]);

  const { Icon } = panel;

  return (
    <div
      ref={rowRef}
      className="relative flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Active left indicator bar */}
      <div
        style={{
          position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
          width: '2px',
          height: isActive ? '18px' : '0',
          background: '#b44fff',
          borderRadius: '0 2px 2px 0',
          transition: 'height 0.15s var(--ease)',
        }}
      />

      {/* Main nav button — Motion #3 (translateX nudge via CSS .nav-item class) */}
      <button
        onClick={onClick}
        className="nav-item"
        style={{
          flex: 1,
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 10px 7px 14px',
          margin: '1px 6px 1px 0',
          background: isActive ? 'rgba(180,79,255,0.1)' : hovered ? 'var(--surface-1)' : 'transparent',
          color: isActive ? '#b44fff' : hovered ? 'var(--text-primary)' : 'var(--text-muted)',
          border: isActive ? '1px solid rgba(180,79,255,0.18)' : '1px solid transparent',
          borderRadius: '6px',
          textAlign: 'left',
          boxShadow: 'none',
          minWidth: 0,
          transform: hovered && !isActive ? 'translateX(2px)' : 'translateX(0)',
        }}
      >
        {/* SVG icon slot */}
        <span style={{ flexShrink: 0, lineHeight: 1, opacity: isActive ? 1 : hovered ? 0.9 : 0.55, display: 'flex', alignItems: 'center' }}>
          <Icon />
        </span>
        <span
          style={{
            fontSize: 'var(--type-body)',
            fontWeight: isActive ? 500 : 400,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {panel.label}
        </span>
        {showDot && !isActive && (
          <span
            className="badge-pulse"
            style={{
              width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
              background: '#f85149',
              boxShadow: '0 0 4px rgba(248,81,73,0.7)',
              marginRight: '2px',
            }}
          />
        )}
      </button>

      {/* Help button — only visible on hover */}
      <button
        ref={helpBtnRef}
        onClick={handleHelpClick}
        style={{
          flexShrink: 0,
          width: '16px', height: '16px',
          marginRight: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '9px', fontWeight: 700,
          background: openHelp === panel.id ? '#b44fff' : 'var(--surface-2)',
          color: openHelp === panel.id ? '#fff' : 'var(--text-muted)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '50%',
          opacity: hovered || openHelp === panel.id ? 1 : 0,
          transition: 'opacity 0.15s var(--ease), background 0.12s var(--ease)',
          padding: 0,
          fontFamily: 'var(--font-display)',
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
  const session = activeTab?.session;
  const findingsCount = session ? (
    (session.findings?.ports?.length ?? 0) +
    (session.findings?.credentials?.length ?? 0) +
    (session.findings?.flags?.length ?? 0) +
    (session.findings?.users?.length ?? 0) +
    (session.findings?.cves?.length ?? 0)
  ) : 0;

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
        width: '164px', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: 'var(--surface-0)',
        borderRight: '1px solid var(--border-subtle)',
        paddingTop: '4px',
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
            showDot={p.id === 'findings' && findingsCount > 0}
          />
        ))}
      </div>

      {/* Theme picker — compact */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '10px 12px' }}>
        <p
          style={{
            fontSize: 'var(--type-caption)',
            textTransform: 'uppercase',
            letterSpacing: '0.10em',
            color: 'var(--text-muted)',
            marginBottom: '6px',
            fontWeight: 500,
          }}
        >
          Background
        </p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {BG_IDS.map(id => (
            <button
              key={id}
              title={BG_THEMES[id].name}
              onClick={() => setBgTheme(id)}
              style={{
                width: '16px', height: '16px', borderRadius: '50%', padding: 0, border: 'none',
                background: BG_THEMES[id].dot,
                outline: bgTheme === id ? `2px solid #b44fff` : '2px solid transparent',
                outlineOffset: '2px',
                transform: bgTheme === id ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform var(--motion-fast) var(--ease), outline-color var(--motion-fast) var(--ease)',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        <p
          style={{
            fontSize: 'var(--type-caption)',
            textTransform: 'uppercase',
            letterSpacing: '0.10em',
            color: 'var(--text-muted)',
            marginBottom: '6px',
            fontWeight: 500,
          }}
        >
          Colour
        </p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {ACCENT_IDS.map(id => (
            <button
              key={id}
              title={ACCENT_THEMES[id].name}
              onClick={() => setAccentTheme(id)}
              style={{
                width: '16px', height: '16px', borderRadius: '50%', padding: 0, border: 'none',
                background: ACCENT_THEMES[id].dot,
                outline: accentTheme === id ? `2px solid ${ACCENT_THEMES[id].dot}` : '2px solid transparent',
                outlineOffset: '2px',
                transform: accentTheme === id ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform var(--motion-fast) var(--ease), outline-color var(--motion-fast) var(--ease)',
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
