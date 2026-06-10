import { useState } from 'react';
import type { JbeckerRow, JbeckerFixtureResult } from '../../shared/types.js';
import { DetailDrawer } from './DetailDrawer.js';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

interface Props {
  fixture: JbeckerFixtureResult;
}

function reasonLabel(reason: 'not_found' | 'parse_error' | 'read_error'): string {
  const map = {
    not_found:   'FIXTURE NOT FOUND',
    parse_error: 'FIXTURE PARSE ERROR',
    read_error:  'FIXTURE READ ERROR'
  };
  return map[reason];
}

const PRICE_BAND_THRESHOLD = 50;

function computeROI(rows: JbeckerRow[], filtered: boolean): number {
  const subset = filtered
    ? rows.filter(r => r.pre_commission_price_cents >= PRICE_BAND_THRESHOLD)
    : rows;
  if (subset.length === 0) return 0;
  const sum = subset.reduce((acc, r) => acc + r.realised_return, 0);
  return sum / subset.length;
}

function buildEquityCurve(rows: JbeckerRow[]): number[] {
  const filtered = rows.filter(r => r.pre_commission_price_cents >= PRICE_BAND_THRESHOLD);
  let equity = 1;
  return filtered.map(r => {
    equity *= (1 + r.realised_return);
    return equity;
  });
}

export function EdgeReplicationCard({ fixture }: Props) {
  const [open, setOpen] = useState(false);

  if (!fixture.ok) {
    return <FixtureErrorCard fixture={fixture} open={open} setOpen={setOpen} />;
  }

  const rows = fixture.rows;
  const filteredROI = computeROI(rows, true);
  const unfilteredROI = computeROI(rows, false);
  const curve = buildEquityCurve(rows);
  const curvePoints = curve.map((v, i) => ({ i, v }));

  const filteredPct = (filteredROI * 100).toFixed(2);
  const unfilteredPct = (unfilteredROI * 100).toFixed(2);
  const filteredPos = filteredROI >= 0;
  const filteredCount = rows.filter(r => r.pre_commission_price_cents >= PRICE_BAND_THRESHOLD).length;

  return (
    <>
      <div className="bento-card" onClick={() => setOpen(true)}>
        <p className="text-[var(--text-muted)] text-[11px] font-mono uppercase tracking-widest mb-3">
          GWU Edge Replication
        </p>
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className={`text-[18px] font-mono font-semibold tabular-nums ${
              filteredPos ? 'text-[var(--state-online)]' : 'text-[var(--danger)]'
            }`}>
              {filteredPos ? '+' : ''}{filteredPct}%
            </p>
            <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
              filtered ROI ({filteredCount} rows, ≥{PRICE_BAND_THRESHOLD}¢)
            </p>
          </div>
          <div className="text-right">
            <p className="text-[var(--danger)] text-[14px] font-mono tabular-nums">
              {unfilteredPct}%
            </p>
            <p className="text-[var(--text-muted)] text-[10px] mt-0.5">unfiltered ({rows.length} rows)</p>
          </div>
        </div>
        {curvePoints.length > 0 && (
          <div style={{ height: 48 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curvePoints} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                <defs>
                  <linearGradient id="apex-equity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  fill="url(#apex-equity)"
                  dot={false}
                  isAnimationActive
                  animationDuration={600}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-[var(--text-muted)] text-[10px] mt-2">
          Validation thesis only — GATE-12 required before capital.
        </p>
      </div>

      <DetailDrawer open={open} onClose={() => setOpen(false)} title="GWU Edge Replication">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-[var(--radius-md)] bg-[rgba(63,185,80,0.06)] border border-[rgba(63,185,80,0.20)]">
              <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-mono mb-1">
                Filtered ROI
              </p>
              <p className="text-[var(--state-online)] text-[20px] font-mono font-semibold tabular-nums">
                +{filteredPct}%
              </p>
              <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
                {filteredCount} rows ≥ {PRICE_BAND_THRESHOLD}¢
              </p>
            </div>
            <div className="p-3 rounded-[var(--radius-md)] bg-[rgba(248,81,73,0.06)] border border-[rgba(248,81,73,0.20)]">
              <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-mono mb-1">
                Unfiltered ROI
              </p>
              <p className="text-[var(--danger)] text-[20px] font-mono font-semibold tabular-nums">
                {unfilteredPct}%
              </p>
              <p className="text-[var(--text-muted)] text-[10px] mt-0.5">{rows.length} rows total</p>
            </div>
          </div>
          <div>
            <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-mono mb-2">
              Equity Curve (filtered)
            </p>
            <div style={{ height: 80 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={curvePoints} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <defs>
                    <linearGradient id="apex-equity-lg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fill="url(#apex-equity-lg)"
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-mono mb-2">
              Fixture Rows ({rows.length})
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono">
                <thead>
                  <tr className="text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                    <th className="text-left py-1 pr-3">Contract</th>
                    <th className="text-right py-1 pr-3">Price¢</th>
                    <th className="text-right py-1">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const passes = r.pre_commission_price_cents >= PRICE_BAND_THRESHOLD;
                    return (
                      <tr key={i} className={`border-b border-[var(--border-subtle)] last:border-0 ${passes ? '' : 'opacity-40'}`}>
                        <td className="py-0.5 pr-3 text-[var(--text-secondary)] truncate max-w-[160px]">
                          {r.contract_id.replace('kalshi:', '')}
                        </td>
                        <td className={`py-0.5 pr-3 text-right tabular-nums ${passes ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                          {r.pre_commission_price_cents}
                        </td>
                        <td className={`py-0.5 text-right tabular-nums ${r.realised_return >= 0 ? 'text-[var(--state-online)]' : 'text-[var(--danger)]'}`}>
                          {r.realised_return >= 0 ? '+' : ''}{(r.realised_return * 100).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--accent-tint)] border border-[var(--accent-border)]">
            <p className="text-[var(--accent)] text-[10px] font-mono font-medium mb-1">
              Source: GWU CER WP 2026-001 (Burgi, Deng, Whelan)
            </p>
            <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed">
              Price-band filter (≥50¢ post-commission) is a HARD invariant — load-bearing for the edge thesis. Faded rows are below threshold. GATE-12 full-dataset OOS run required before any capital.
            </p>
          </div>
          <div>
            <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-mono mb-2">
              Fixture Origin
            </p>
            <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--surface-2)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium ${
                  fixture.source === 'env_override'
                    ? 'text-[var(--info)] bg-[rgba(74,158,255,0.10)]'
                    : 'text-[var(--text-muted)] bg-[rgba(72,79,88,0.12)]'
                }`}>
                  {fixture.source === 'env_override' ? 'ENV OVERRIDE' : 'DEFAULT PATH'}
                </span>
                <span className="text-[var(--text-secondary)] text-[10px] font-mono">
                  {rows.length} row{rows.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-[var(--text-muted)] text-[10px] font-mono break-all leading-relaxed">
                {fixture.resolved_path}
              </p>
              <p className="text-[var(--text-muted)] text-[10px] mt-1.5 leading-relaxed">
                Override via <span className="font-mono text-[var(--text-secondary)]">APEX_BENTO_FIXTURE_PATH</span> env var.
              </p>
            </div>
          </div>
        </div>
      </DetailDrawer>
    </>
  );
}

interface ErrorProps {
  fixture: Extract<JbeckerFixtureResult, { ok: false }>;
  open: boolean;
  setOpen: (b: boolean) => void;
}

function FixtureErrorCard({ fixture, open, setOpen }: ErrorProps) {
  return (
    <>
      <div className="bento-card" onClick={() => setOpen(true)}>
        <p className="text-[var(--text-muted)] text-[11px] font-mono uppercase tracking-widest mb-3">
          GWU Edge Replication
        </p>
        <div className="flex flex-col items-start gap-2">
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium text-[var(--warning)] bg-[rgba(210,153,34,0.10)]">
            {reasonLabel(fixture.reason)}
          </span>
          <p className="text-[var(--text-secondary)] text-[12px] leading-relaxed">
            Equity-curve data unavailable. Click for details.
          </p>
          <p className="text-[var(--text-muted)] text-[10px] font-mono break-all leading-relaxed">
            {fixture.resolved_path || '(no path resolved)'}
          </p>
        </div>
        <p className="text-[var(--text-muted)] text-[10px] mt-3">
          Validation thesis only — GATE-12 required before capital.
        </p>
      </div>

      <DetailDrawer open={open} onClose={() => setOpen(false)} title="GWU Edge Replication">
        <div className="space-y-4">
          <div className="p-3 rounded-[var(--radius-md)] bg-[rgba(210,153,34,0.06)] border border-[rgba(210,153,34,0.20)]">
            <p className="text-[var(--warning)] text-[10px] font-mono font-medium mb-1.5">
              {reasonLabel(fixture.reason)}
            </p>
            <p className="text-[var(--text-secondary)] text-[12px] leading-relaxed">
              {fixture.message}
            </p>
          </div>
          <div>
            <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-mono mb-2">
              Resolved Path
            </p>
            <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--surface-2)] border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium ${
                  fixture.source === 'env_override'
                    ? 'text-[var(--info)] bg-[rgba(74,158,255,0.10)]'
                    : 'text-[var(--text-muted)] bg-[rgba(72,79,88,0.12)]'
                }`}>
                  {fixture.source === 'env_override' ? 'ENV OVERRIDE' : 'DEFAULT PATH'}
                </span>
              </div>
              <p className="text-[var(--text-muted)] text-[10px] font-mono break-all leading-relaxed">
                {fixture.resolved_path || '(no path resolved)'}
              </p>
            </div>
          </div>
          <div>
            <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-mono mb-2">
              How to fix
            </p>
            <ol className="space-y-2 text-[var(--text-secondary)] text-[12px] leading-relaxed list-decimal pl-4">
              <li>Verify the APEX prototype is checked out and the jbecker fixture exists at the resolved path above.</li>
              <li>If your APEX clone lives elsewhere, set <span className="font-mono text-[var(--text-primary)]">APEX_BENTO_FIXTURE_PATH=/abs/path/to/jbecker_sample.json</span> before launching APEX Bento.</li>
              <li>Restart the app — the override is read on main-process startup.</li>
            </ol>
          </div>
          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--accent-tint)] border border-[var(--accent-border)]">
            <p className="text-[var(--accent)] text-[10px] font-mono font-medium mb-1">
              Read-only observability
            </p>
            <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed">
              APEX Bento never writes the fixture — failures here mean the file is missing, unreadable, or malformed on disk. Capital is gated by GATE-12 regardless.
            </p>
          </div>
        </div>
      </DetailDrawer>
    </>
  );
}
