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
  const counts = SEVERITIES.reduce((acc, s) => {
    acc[s] = findings.filter(f => f.severity === s).length;
    return acc;
  }, {} as Record<Severity, number>);

  const max = Math.max(...Object.values(counts), 1);
  const total = findings.length;

  if (total === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
        No findings to chart.
      </div>
    );
  }

  const chartWidth = 320;
  const barHeight = 16;
  const gap = 10;
  const labelWidth = 60;
  const countWidth = 28;
  const barMaxWidth = chartWidth - labelWidth - countWidth - 16;
  const svgHeight = SEVERITIES.length * (barHeight + gap) - gap + 4;

  return (
    <div style={{ padding: '12px 0' }}>
      <svg
        width={chartWidth}
        height={svgHeight}
        style={{ display: 'block', overflow: 'visible' }}
        aria-label="Severity distribution chart"
      >
        {SEVERITIES.map((sev, i) => {
          const count = counts[sev];
          const barWidth = count === 0 ? 0 : Math.max(4, (count / max) * barMaxWidth);
          const y = i * (barHeight + gap);
          const color = SEV_COLORS[sev];

          return (
            <g key={sev} transform={`translate(0, ${y})`}>
              <text
                x={labelWidth - 6}
                y={barHeight / 2 + 1}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="10"
                fontWeight="500"
                fill={count > 0 ? color : 'var(--text-muted)'}
                style={{ fontFamily: 'inherit' }}
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
              {/* Bar */}
              {count > 0 && (
                <rect
                  x={labelWidth}
                  y={0}
                  width={barWidth}
                  height={barHeight}
                  rx={3}
                  fill={color}
                  opacity={0.85}
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
                style={{ fontFamily: 'inherit' }}
              >
                {count}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
        {total} finding{total !== 1 ? 's' : ''} total
      </div>
    </div>
  );
}
