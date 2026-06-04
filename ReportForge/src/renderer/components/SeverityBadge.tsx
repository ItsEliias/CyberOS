import type { Severity } from '@shared/types';
import SeverityPill from './ui/SeverityPill';

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <SeverityPill severity={severity} />;
}

export function SeveritySummary({ findings }: { findings: Array<{ severity: Severity }> }) {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  findings.forEach(f => { counts[f.severity]++; });

  const order: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
  const hasAny = Object.values(counts).some(v => v > 0);

  if (!hasAny) {
    return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No findings</span>;
  }

  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      {order.filter(s => counts[s] > 0).map(s => (
        <span key={s} className={`badge badge-${s}`}>{counts[s]} {s}</span>
      ))}
    </div>
  );
}
