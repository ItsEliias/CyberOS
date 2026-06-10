import { useState } from 'react';
import type { AuditEvent } from '../../shared/types.js';
import { DetailDrawer } from './DetailDrawer.js';

interface Props {
  events: AuditEvent[];
}

function levelClass(l: AuditEvent['level']): string {
  const map: Record<AuditEvent['level'], string> = {
    INFO:  'text-[var(--info)]',
    WARN:  'text-[var(--warning)]',
    ERROR: 'text-[var(--danger)]'
  };
  return map[l];
}

export function AuditFeedCard({ events }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="bento-card"
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Audit Feed ${events.length} events — open detail`}
        onClick={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); } }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-[var(--text-muted)] text-[11px] font-mono uppercase tracking-widest">
            Audit Feed
          </p>
          <span className="text-[var(--text-muted)] text-[10px] font-mono">{events.length} events</span>
        </div>
        {events.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-1 max-h-[140px] overflow-y-auto">
            {events.slice(0, 6).map((e, i) => (
              <AuditRow key={i} event={e} compact />
            ))}
          </div>
        )}
      </div>

      <DetailDrawer open={open} onClose={() => setOpen(false)} title="Audit Feed">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <EmptyState />
          </div>
        ) : (
          <div className="space-y-1">
            {events.map((e, i) => (
              <AuditRow key={i} event={e} compact={false} />
            ))}
          </div>
        )}
      </DetailDrawer>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
      <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] text-[14px]">
        —
      </div>
      <p className="text-[var(--text-secondary)] text-[12px]">No events yet</p>
      <p className="text-[var(--text-muted)] text-[11px] leading-relaxed max-w-[200px]">
        SIM_MODE has not been booted or no audit log exists on disk.
      </p>
    </div>
  );
}

function AuditRow({ event, compact }: { event: AuditEvent; compact: boolean }) {
  const ts = new Date(event.ts);
  const time = compact
    ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ts.toISOString();

  return (
    <div className="flex items-start gap-2 py-1 border-b border-[var(--border-subtle)] last:border-0">
      <span className={`text-[9px] font-mono shrink-0 mt-0.5 ${levelClass(event.level)}`}>
        {event.level}
      </span>
      <span className="text-[var(--text-muted)] text-[10px] font-mono shrink-0">{time}</span>
      <span className="text-[var(--text-secondary)] text-[11px] font-mono shrink-0">{event.module}</span>
      <span className="text-[var(--text-primary)] text-[11px] leading-tight">{event.message}</span>
    </div>
  );
}
