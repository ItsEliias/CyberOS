// FindingsParts — extracted presentational components for FindingsPanel

import type { Finding, Severity } from '@shared/types';
import { SEVERITIES, SEV_COLORS } from '../lib/defaults';

// ── Mini severity donut ────────────────────────────────────────────────────────

export function SeverityDonut({ findings }: { findings: { severity: string }[] }) {
  const SEV_DOT_COLORS: Record<string, string> = {
    critical: '#f85149', high: '#ff8c42', medium: '#d29922', low: '#4a9eff', info: '#484f58',
  };
  const order = ['critical', 'high', 'medium', 'low', 'info'];
  const counts = order.reduce((acc, s) => {
    acc[s] = findings.filter(f => f.severity === s).length;
    return acc;
  }, {} as Record<string, number>);
  const total = findings.length;
  const r = 22; const cx = 28; const cy = 28;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const segments: { sev: string; dash: number; gap: number; dashOffset: number }[] = [];
  for (const sev of order) {
    const count = counts[sev];
    if (count === 0) continue;
    const dash = (count / total) * circumference;
    segments.push({ sev, dash, gap: circumference - dash, dashOffset: -offset });
    offset += dash;
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 4px', flexShrink: 0 }}>
      <svg width={56} height={56} viewBox="0 0 56 56" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} />
        {segments.map(seg => (
          <circle key={seg.sev} cx={cx} cy={cy} r={r} fill="none"
            stroke={SEV_DOT_COLORS[seg.sev]} strokeWidth={6}
            strokeDasharray={`${seg.dash} ${seg.gap}`} strokeDashoffset={seg.dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dasharray 0.4s ease' }} />
        ))}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
          fontSize={11} fontWeight={700} fill="var(--text-primary)" style={{ fontFamily: 'inherit' }}>
          {total}
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {order.filter(s => counts[s] > 0).map(sev => (
          <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: SEV_DOT_COLORS[sev], flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{sev}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: SEV_DOT_COLORS[sev], marginLeft: 2 }}>{counts[sev]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CVSS badge ────────────────────────────────────────────────────────────────

export function CvssBadge({ score }: { score?: string }) {
  if (!score) return <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>—</span>;
  const num = parseFloat(score);
  let color = 'var(--text-muted)'; let bg = 'transparent'; let border = 'transparent';
  if (!isNaN(num)) {
    if (num >= 9.0) { color = '#f85149'; bg = 'rgba(248,81,73,0.12)'; border = 'rgba(248,81,73,0.30)'; }
    else if (num >= 7.0) { color = '#ff8c42'; bg = 'rgba(255,140,66,0.12)'; border = 'rgba(255,140,66,0.30)'; }
    else if (num >= 4.0) { color = '#d29922'; bg = 'rgba(210,153,34,0.12)'; border = 'rgba(210,153,34,0.30)'; }
    else if (num > 0) { color = '#4a9eff'; bg = 'rgba(74,158,255,0.10)'; border = 'rgba(74,158,255,0.25)'; }
  }
  return (
    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: bg, color, border: `1px solid ${border}`, letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums' }}>
      {score}
    </span>
  );
}

// ── Severity-grouped findings view ────────────────────────────────────────────

interface GroupedProps {
  sorted: Finding[];
  activeFindingId: string | null;
  collapsedSevs: Set<string>;
  onEdit: (id: string) => void;
  onToggleCollapse: (sev: string) => void;
}

export function FindingsSeverityGroups({ sorted, activeFindingId, collapsedSevs, onEdit, onToggleCollapse }: GroupedProps) {
  return (
    <div>
      {SEVERITIES.filter(sev => sorted.some(f => f.severity === sev)).map(sev => {
        const sevFindings = sorted.filter(f => f.severity === sev);
        const collapsed = collapsedSevs.has(sev);
        const sevColor = SEV_COLORS[sev as Severity];
        const sevLabel = sev.charAt(0).toUpperCase() + sev.slice(1);
        return (
          <div key={sev}>
            <button
              onClick={() => onToggleCollapse(sev)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: `${sevColor}0d`, border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', textAlign: 'left' }}
            >
              <span style={{ fontSize: 9, color: sevColor, transform: collapsed ? 'none' : 'rotate(90deg)', display: 'inline-block', transition: 'transform 0.15s' }}>▶</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: sevColor, textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>{sevLabel}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{sevFindings.length}</span>
            </button>
            {!collapsed && sevFindings.map(f => {
              const isActive = activeFindingId === f.id;
              return (
                <div key={f.id} onClick={() => onEdit(f.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', background: isActive ? `${sevColor}0d` : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.03)', borderLeft: isActive ? `2px solid ${sevColor}` : '2px solid transparent', transition: 'background 0.15s' }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isActive ? `${sevColor}0d` : 'transparent'; }}
                >
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isActive ? 600 : 400 }}>{f.title}</span>
                  <CvssBadge score={f.cvss} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function FindingsEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '32px 24px', textAlign: 'center', gap: 0 }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 16, background: 'rgba(74,158,255,0.06)', border: '1px solid rgba(74,158,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 32px rgba(74,158,255,0.08)' }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ color: 'rgba(74,158,255,0.7)' }}>
          <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" stroke="currentColor" strokeWidth="1.5" fill="rgba(74,158,255,0.08)" strokeLinejoin="round" />
          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>No findings yet</h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, lineHeight: 1.6, marginBottom: 18 }}>
        Add vulnerabilities, misconfigurations, and security issues discovered during testing.
      </p>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
        {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
          const colors: Record<string, { bg: string; text: string }> = {
            critical: { bg: 'rgba(248,81,73,0.1)',  text: '#f85149' }, high: { bg: 'rgba(255,140,66,0.1)', text: '#ff8c42' },
            medium:   { bg: 'rgba(210,153,34,0.1)', text: '#d29922' }, low:  { bg: 'rgba(74,158,255,0.1)', text: '#4a9eff' },
          };
          const c = colors[sev];
          return <span key={sev} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '2px 8px', borderRadius: 99, background: c.bg, color: c.text, border: `1px solid ${c.text}44` }}>{sev}</span>;
        })}
      </div>
      <button onClick={onAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: 'pointer', background: 'rgba(74,158,255,0.15)', color: '#4a9eff', border: '1px solid rgba(74,158,255,0.30)', transition: 'all 0.2s var(--ease)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.25)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,158,255,0.15)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
        Add First Finding
      </button>
    </div>
  );
}
