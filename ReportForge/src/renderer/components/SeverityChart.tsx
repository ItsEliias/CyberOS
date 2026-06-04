import { useEffect, useRef, useState } from 'react';
import type { Finding, Severity } from '@shared/types';
import { SEV_COLORS, SEVERITIES } from '../lib/defaults';

interface Props {
  findings: Finding[];
}

const SEV_LABELS: Record<Severity, string> = {
  critical: 'Critical',
  high    : 'High',
  medium  : 'Medium',
  low     : 'Low',
  info    : 'Info',
};

export default function SeverityChart({ findings }: Props) {
  const barsRef = useRef<SVGGElement | null>(null);
  const [hoveredSev, setHoveredSev] = useState<Severity | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; sev: Severity } | null>(null);

  const counts = SEVERITIES.reduce((acc, s) => {
    acc[s] = findings.filter(f => f.severity === s).length;
    return acc;
  }, {} as Record<Severity, number>);

  const max = Math.max(...Object.values(counts), 1);
  const total = findings.length;

  const chartWidth = 320;
  const barHeight = 16;
  const gap = 10;
  const labelWidth = 60;
  const countWidth = 28;
  const barMaxWidth = chartWidth - labelWidth - countWidth - 16;
  const svgHeight = SEVERITIES.length * (barHeight + gap) - gap + 4;

  // Animate bars on mount via CSS keyframe via clipPath width trick
  useEffect(() => {
    if (!barsRef.current) return;
    const rects = barsRef.current.querySelectorAll<SVGRectElement>('[data-bar]');
    rects.forEach((rect) => {
      const targetW = parseFloat(rect.getAttribute('data-target-w') ?? '0');
      rect.style.width = '0';
      const start = performance.now();
      const duration = 500;
      function step(now: number) {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        rect.style.width = `${targetW * eased}px`;
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }, [findings.length]);

  if (total === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
        No findings to chart.
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 0', position: 'relative' }}>
      <svg
        width={chartWidth}
        height={svgHeight}
        style={{ display: 'block', overflow: 'visible' }}
        aria-label="Severity distribution chart"
        onMouseLeave={() => { setHoveredSev(null); setTooltip(null); }}
      >
        <g ref={barsRef}>
          {SEVERITIES.map((sev, i) => {
            const count = counts[sev];
            const barWidth = count === 0 ? 0 : Math.max(4, (count / max) * barMaxWidth);
            const y = i * (barHeight + gap);
            const color = SEV_COLORS[sev];
            const isHovered = hoveredSev === sev;
            const isDimmed  = hoveredSev !== null && !isHovered;

            return (
              <g
                key={sev}
                transform={`translate(0, ${y})`}
                style={{ cursor: count > 0 ? 'pointer' : 'default' }}
                onMouseEnter={(e) => {
                  if (count > 0) {
                    setHoveredSev(sev);
                    const svgRect = (e.currentTarget.closest('svg') as SVGSVGElement).getBoundingClientRect();
                    setTooltip({ x: labelWidth + barWidth + 8, y: y + barHeight / 2, sev });
                  }
                }}
              >
                <text
                  x={labelWidth - 6}
                  y={barHeight / 2 + 1}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize="10"
                  fontWeight="500"
                  fill={count > 0 ? color : 'var(--text-muted)'}
                  style={{ fontFamily: 'inherit', opacity: isDimmed ? 0.35 : 1, transition: 'opacity 0.15s' }}
                >
                  {SEV_LABELS[sev]}
                </text>
                {/* Track */}
                <rect
                  x={labelWidth}
                  y={0}
                  width={barMaxWidth}
                  height={barHeight}
                  rx={3}
                  fill="rgba(255,255,255,0.04)"
                />
                {/* Animated bar */}
                {count > 0 && (
                  <rect
                    data-bar="true"
                    data-target-w={barWidth}
                    x={labelWidth}
                    y={0}
                    width={barWidth}
                    height={barHeight}
                    rx={3}
                    fill={color}
                    opacity={isDimmed ? 0.18 : isHovered ? 1 : 0.85}
                    style={{ transition: 'opacity 0.15s' }}
                  />
                )}
                {/* Count */}
                <text
                  x={labelWidth + barMaxWidth + 6}
                  y={barHeight / 2 + 1}
                  dominantBaseline="middle"
                  fontSize="10"
                  fontWeight={count > 0 ? '700' : '400'}
                  fill={count > 0 ? color : 'var(--text-muted)'}
                  style={{ fontFamily: 'inherit', opacity: isDimmed ? 0.35 : 1, transition: 'opacity 0.15s' }}
                >
                  {count}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* SVG tooltip */}
      {tooltip && hoveredSev && (
        <div style={{
          position: 'absolute',
          left: tooltip.x + 16,
          top: tooltip.y - 20,
          background: 'var(--surface-1)',
          border: `1px solid ${SEV_COLORS[hoveredSev]}55`,
          borderRadius: 6, padding: '6px 10px',
          fontSize: 11, pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          zIndex: 10,
        }}>
          <span style={{ fontWeight: 700, color: SEV_COLORS[hoveredSev] }}>{SEV_LABELS[hoveredSev]}</span>
          <span style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>
            {counts[hoveredSev]} ({Math.round((counts[hoveredSev] / total) * 100)}%)
          </span>
        </div>
      )}
      {/* Mini data table */}
      <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <th style={{ textAlign: 'left', padding: '2px 0', fontWeight: 600 }}>Severity</th>
              <th style={{ textAlign: 'right', padding: '2px 0', fontWeight: 600 }}>Count</th>
              <th style={{ textAlign: 'right', padding: '2px 0', fontWeight: 600 }}>%</th>
            </tr>
          </thead>
          <tbody>
            {SEVERITIES.filter(sev => counts[sev] > 0).map(sev => (
              <tr key={sev}>
                <td style={{ padding: '2px 0', color: SEV_COLORS[sev], fontWeight: 600, textTransform: 'capitalize' }}>
                  {SEV_LABELS[sev]}
                </td>
                <td style={{ textAlign: 'right', padding: '2px 0', fontFamily: 'var(--font-mono)', color: SEV_COLORS[sev], fontWeight: 700 }}>
                  {counts[sev]}
                </td>
                <td style={{ textAlign: 'right', padding: '2px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {Math.round((counts[sev] / total) * 100)}%
                </td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ padding: '3px 0', color: 'var(--text-muted)', fontWeight: 600 }}>Total</td>
              <td style={{ textAlign: 'right', padding: '3px 0', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{total}</td>
              <td style={{ textAlign: 'right', padding: '3px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
