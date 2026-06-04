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

  // Find ALL occurrences (case-insensitive) and wrap each
  const lower = text.toLowerCase();
  const lq    = q.toLowerCase();
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const idx = lower.indexOf(lq, cursor);
    if (idx === -1) {
      nodes.push(text.slice(cursor));
      break;
    }
    if (idx > cursor) nodes.push(text.slice(cursor, idx));
    nodes.push(
      <mark key={idx} style={{
        background: 'rgba(0,255,65,0.22)',
        color: '#00ff41',
        borderRadius: 2,
        padding: '0 1px',
        fontWeight: 600,
        boxShadow: '0 0 4px rgba(0,255,65,0.3)',
      }}>
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    cursor = idx + q.length;
  }

  return <>{nodes}</>;
}

/** Colorize output snippet line using ANSI-inspired rules */
function ColoredOutputSnippet({ text }: { text: string }) {
  const isError   = /error|fail|denied|not found|exception|fatal|refused/i.test(text);
  const isSuccess = /ok|success|done|complete|connected|accepted|200/i.test(text);
  const isPath    = /^(\/|\~\/|\.\/)/.test(text.trimStart());
  const isWarn    = /warn|timeout|retry|skip|deprecated/i.test(text);

  const color = isError   ? '#f85149'
              : isSuccess ? '#00ff41'
              : isPath    ? '#4a9eff'
              : isWarn    ? '#d29922'
              : 'rgba(0,255,65,0.35)';

  return (
    <span style={{ color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {text}
    </span>
  );
}

/** Tokenize a command string for syntax coloring */
export function SyntaxColoredCommand({ text }: { text: string }) {
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

/**
 * SyntaxColoredCommand with query match highlighting overlaid.
 * Splits the text at match boundaries, then applies syntax coloring
 * per segment but wraps matched segments in a highlight <mark>.
 */
export function SyntaxHighlightedCommandWithQuery({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  if (!q) return <SyntaxColoredCommand text={text} />;

  // Build segments: {str, isMatch}[]
  const segments: Array<{ str: string; isMatch: boolean }> = [];
  const lower = text.toLowerCase();
  let cursor = 0;
  while (cursor < text.length) {
    const idx = lower.indexOf(q, cursor);
    if (idx === -1) {
      segments.push({ str: text.slice(cursor), isMatch: false });
      break;
    }
    if (idx > cursor) segments.push({ str: text.slice(cursor, idx), isMatch: false });
    segments.push({ str: text.slice(idx, idx + q.length), isMatch: true });
    cursor = idx + q.length;
  }

  return (
    <>
      {segments.map((seg, i) =>
        seg.isMatch ? (
          <mark
            key={i}
            style={{
              background: 'rgba(0,255,65,0.22)',
              color: '#00ff41',
              borderRadius: 2,
              padding: '0 1px',
              fontWeight: 600,
              boxShadow: '0 0 4px rgba(0,255,65,0.3)',
            }}
          >
            <SyntaxColoredCommand text={seg.str} />
          </mark>
        ) : (
          <SyntaxColoredCommand key={i} text={seg.str} />
        )
      )}
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
  const [copied,  setCopied]  = useState(false);
  const [hovered, setHovered] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(entry.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div
      onClick={copy}
      title="Click to copy"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '6px 10px',
        borderBottom: '1px solid rgba(42,51,71,0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        cursor: 'pointer',
        transition: 'background 0.1s ease',
        background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
      }}
    >
      {/* Top row: timestamp, copy button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 9,
            padding: '1px 4px',
            background: entry.pane === 'left' ? 'rgba(0,255,65,0.12)' : 'rgba(74,158,255,0.12)',
            color:      entry.pane === 'left' ? '#00ff41' : '#4a9eff',
            borderRadius: 2,
            textTransform: 'uppercase',
            fontFamily: 'var(--font-mono)',
          }}>
            {entry.pane}
          </span>
          <span style={{ fontSize: 10, color: '#4a5568', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
            {new Date(entry.timestamp).toLocaleTimeString()}
          </span>
          <span style={{ fontSize: 9, color: '#4a5568', fontFamily: 'var(--font-mono)' }}>
            ({relativeTime(entry.timestamp)})
          </span>
        </div>
        {/* Copy button — shown on hover */}
        <button
          title="Copy command"
          onClick={e => { e.stopPropagation(); copy(); }}
          style={{
            fontSize: 10,
            color: copied ? '#00ff41' : '#4a5568',
            padding: '1px 6px',
            borderRadius: 3,
            background: copied ? 'rgba(0,255,65,0.08)' : 'rgba(42,51,71,0.3)',
            border: `1px solid ${copied ? 'rgba(0,255,65,0.4)' : 'rgba(42,51,71,0.4)'}`,
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            flexShrink: 0,
            opacity: hovered || copied ? 1 : 0,
            transition: 'opacity 0.15s ease',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Command text */}
      <span style={{
        fontSize: 12,
        color: '#e2e8f0',
        wordBreak: 'break-all',
        whiteSpace: 'pre-wrap',
        fontFamily: 'var(--font-mono)',
        lineHeight: 1.4,
      }}>
        {query ? (
          <SyntaxHighlightedCommandWithQuery text={entry.command} query={query} />
        ) : (
          <SyntaxColoredCommand text={entry.command} />
        )}
      </span>

      {/* Output snippet */}
      {entry.outputSnippet && (
        <span style={{
          fontSize: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          overflow: 'hidden',
          borderLeft: '2px solid rgba(42,51,71,0.6)',
          paddingLeft: 6,
        }}>
          <ColoredOutputSnippet text={entry.outputSnippet} />
        </span>
      )}
    </div>
  );
}
