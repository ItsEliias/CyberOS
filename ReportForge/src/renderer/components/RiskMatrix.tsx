import { useState } from 'react';
import type { Finding } from '@shared/types';
import { SEV_COLORS } from '../lib/defaults';

interface Props {
  findings: Finding[];
}

const LIKELIHOOD_LABELS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const IMPACT_LABELS     = ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

function cellRisk(likelihood: number, impact: number): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  const score = likelihood * impact;
  if (score >= 16) return 'critical';
  if (score >= 9)  return 'high';
  if (score >= 4)  return 'medium';
  if (score >= 2)  return 'low';
  return 'info';
}

const CELL_COLORS: Record<string, string> = {
  critical: 'rgba(255,68,68,0.25)',
  high    : 'rgba(255,107,53,0.22)',
  medium  : 'rgba(240,165,0,0.20)',
  low     : 'rgba(63,185,80,0.18)',
  info    : 'rgba(139,148,158,0.12)',
};

export default function RiskMatrix({ findings }: Props) {
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);

  // findings with likelihood + impactScore (1-5)
  const plottable = findings.filter(
    f => f.likelihood != null && f.impactScore != null &&
         f.likelihood >= 1 && f.likelihood <= 5 &&
         f.impactScore >= 1 && f.impactScore <= 5
  );

  function findingsAt(l: number, imp: number) {
    return plottable.filter(f => f.likelihood === l && f.impactScore === imp);
  }

  const CELL_SIZE = 60;
  const LABEL_SIZE = 52;
  const gridSize = 5 * CELL_SIZE;

  return (
    <div style={{ padding: '12px 0', overflowX: 'auto' }}>
      <div style={{
        display: 'inline-flex', flexDirection: 'column', gap: 0,
        userSelect: 'none',
      }}>
        {/* Column headers (Impact) */}
        <div style={{ display: 'flex', marginLeft: LABEL_SIZE }}>
          {IMPACT_LABELS.map((label, i) => (
            <div key={i} style={{
              width: CELL_SIZE, textAlign: 'center',
              fontSize: 9, color: 'var(--text-muted)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              padding: '0 4px 4px',
            }}>
              {label}
            </div>
          ))}
        </div>

        {/* Rows (Likelihood, highest first) */}
        {[5, 4, 3, 2, 1].map(likelihood => (
          <div key={likelihood} style={{ display: 'flex', alignItems: 'stretch' }}>
            {/* Row label */}
            <div style={{
              width: LABEL_SIZE, fontSize: 9, color: 'var(--text-muted)',
              fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
              paddingRight: 8,
            }}>
              {LIKELIHOOD_LABELS[likelihood - 1]}
            </div>

            {/* Cells */}
            {[1, 2, 3, 4, 5].map(impact => {
              const risk = cellRisk(likelihood, impact);
              const dotsHere = findingsAt(likelihood, impact);
              const isHovered = hoveredCell?.[0] === likelihood && hoveredCell?.[1] === impact;

              return (
                <div
                  key={impact}
                  onMouseEnter={() => setHoveredCell([likelihood, impact])}
                  onMouseLeave={() => setHoveredCell(null)}
                  style={{
                    width: CELL_SIZE, height: CELL_SIZE,
                    border: '1px solid var(--border)',
                    background: isHovered
                      ? `color-mix(in srgb, ${CELL_COLORS[risk]}, rgba(255,255,255,0.06))`
                      : CELL_COLORS[risk],
                    position: 'relative',
                    display: 'flex', flexWrap: 'wrap',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 3,
                    padding: 4,
                    transition: 'background 0.1s',
                    cursor: dotsHere.length > 0 ? 'pointer' : 'default',
                  }}
                  title={dotsHere.length > 0 ? dotsHere.map(f => f.title).join(', ') : undefined}
                >
                  {dotsHere.map(f => (
                    <div
                      key={f.id}
                      style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: SEV_COLORS[f.severity],
                        border: '1px solid rgba(0,0,0,0.3)',
                        flexShrink: 0,
                      }}
                      title={f.title}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}

        {/* Axis labels */}
        <div style={{ display: 'flex', marginTop: 8 }}>
          <div style={{ width: LABEL_SIZE }} />
          <div style={{
            width: gridSize, textAlign: 'center',
            fontSize: 10, color: 'var(--text-muted)', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Impact
          </div>
        </div>
      </div>

      {/* Legend */}
      {plottable.length === 0 && (
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
          Set Likelihood (1–5) and Impact (1–5) on findings to plot them here.
        </div>
      )}
      {plottable.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {plottable.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: SEV_COLORS[f.severity], flexShrink: 0 }} />
              <span style={{ color: 'var(--text-dim)' }}>{f.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
