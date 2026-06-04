/**
 * CommandEntryRow — TerminalLink
 * Individual command entry in the history list.
 * Clicking the command copies it; copy button also copies.
 * Supports highlight of matched search text.
 */
import { useState } from 'react';
import type { CommandEntry } from '@shared/types';

interface Props {
  entry: CommandEntry;
  query: string;
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{
        background: 'rgba(245,158,11,0.2)',
        color: 'var(--warning, #e3b341)',
        borderRadius: 2,
        padding: '0 2px',
      }}>
        {text.slice(idx, idx + q.length)}
      </span>
      {text.slice(idx + q.length)}
    </>
  );
}

/** Tokenize a command string for syntax coloring */
function SyntaxColoredCommand({ text }: { text: string }) {
  // Split preserving whitespace tokens
  const tokens = text.split(/(\s+)/);
  return (
    <>
      {tokens.map((token, i) => {
        if (/^\s+$/.test(token)) return <span key={i}>{token}</span>;
        // Pipe character
        if (token === '|' || token === '||' || token === '&&' || token === ';') {
          return <span key={i} style={{ color: '#d29922' }}>{token}</span>;
        }
        // Flags starting with -
        if (token.startsWith('-')) {
          return <span key={i} style={{ color: '#00ff41' }}>{token}</span>;
        }
        // Paths starting with /
        if (token.startsWith('/') || token.startsWith('~/') || token.startsWith('./')) {
          return <span key={i} style={{ color: '#4a9eff' }}>{token}</span>;
        }
        // Redirects
        if (token === '>' || token === '>>' || token === '<') {
          return <span key={i} style={{ color: '#b44fff' }}>{token}</span>;
        }
        return <span key={i}>{token}</span>;
      })}
    </>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function CommandEntryRow({ entry, query }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(entry.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div
      onClick={copy}
      title="Click to copy"
      style={{
        padding: '6px 10px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        cursor: 'pointer',
        transition: 'background 0.1s ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Top row: pane badge, timestamp, copy button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 9,
            padding: '1px 4px',
            background: entry.pane === 'left' ? 'rgba(0,255,65,0.15)' : 'rgba(74,158,255,0.15)',
            color:      entry.pane === 'left' ? 'var(--accent)' : '#4a9eff',
            borderRadius: 2,
            textTransform: 'uppercase',
          }}>
            {entry.pane}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {new Date(entry.timestamp).toLocaleTimeString()}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
            ({relativeTime(entry.timestamp)})
          </span>
        </div>
        <button
          title="Copy command"
          onClick={e => { e.stopPropagation(); copy(); }}
          style={{
            fontSize: 10,
            color: copied ? 'var(--accent)' : 'var(--text-muted)',
            padding: '1px 5px',
            borderRadius: 2,
            background: 'var(--bg)',
            border: `1px solid ${copied ? 'var(--accent)' : 'var(--border)'}`,
            cursor: 'pointer',
            fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          {copied ? '✓ Copied' : '📋'}
        </button>
      </div>

      {/* Command text */}
      <span style={{
        fontSize: 12,
        color: 'var(--text)',
        wordBreak: 'break-all',
        whiteSpace: 'pre-wrap',
        fontFamily: 'inherit',
        lineHeight: 1.4,
      }}>
        {query ? (
          <HighlightedText text={entry.command} query={query} />
        ) : (
          <SyntaxColoredCommand text={entry.command} />
        )}
      </span>

      {/* Output snippet */}
      {entry.outputSnippet && (
        <span style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          borderLeft: '2px solid var(--border)',
          paddingLeft: 6,
        }}>
          {entry.outputSnippet}
        </span>
      )}
    </div>
  );
}
