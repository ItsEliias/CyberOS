import { useEffect } from 'react';
import type { Report } from '@shared/types';

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const;

const SEV_PRINT_COLORS: Record<string, string> = {
  critical: '#cc0000',
  high    : '#cc4400',
  medium  : '#aa7700',
  low     : '#2a7a36',
  info    : '#555555',
};

interface Props {
  report: Report;
  onReady: () => void;
}

export default function PrintView({ report, onReady }: Props) {
  useEffect(() => {
    // Signal main after a brief render delay
    const t = setTimeout(() => {
      onReady();
    }, 400);
    return () => clearTimeout(t);
  }, [onReady]);

  const sortedSections = [...report.sections]
    .filter(s => s.visible)
    .sort((a, b) => a.order - b.order);

  const grouped: Record<string, typeof report.findings> = {};
  SEVERITY_ORDER.forEach(s => { grouped[s] = []; });
  report.findings.forEach(f => { if (grouped[f.severity]) grouped[f.severity].push(f); });

  return (
    <div className="print-page" style={{ padding: '40px 60px', fontFamily: 'Georgia, serif', color: '#1a1a1a', lineHeight: 1.6, background: '#fff' }}>
      {/* Cover */}
      <div style={{ marginBottom: 40, paddingBottom: 24, borderBottom: '2px solid #2a7a36' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>{report.title}</h1>
        <table style={{ fontSize: 13, borderCollapse: 'collapse', marginTop: 12 }}>
          <tbody>
            <MetaRow label="Target" value={`${report.targetName}${report.targetIP ? ` (${report.targetIP})` : ''}`} />
            <MetaRow label="Platform" value={report.platform} />
            <MetaRow label="Date" value={report.assessmentDate} />
            <MetaRow label="Operator" value={report.operator} />
            {report.difficulty && <MetaRow label="Difficulty" value={report.difficulty} />}
          </tbody>
        </table>
      </div>

      {sortedSections.map(s => {
        if (s.title === 'Findings') {
          return (
            <section key={s.id} style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, borderBottom: '1px solid #ddd', paddingBottom: 6, marginBottom: 16 }}>Findings</h2>
              {SEVERITY_ORDER.map(sev =>
                grouped[sev].map(f => (
                  <div key={f.id} style={{ marginBottom: 24, paddingLeft: 12, borderLeft: `3px solid ${SEV_PRINT_COLORS[f.severity]}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{f.title}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: SEV_PRINT_COLORS[f.severity], border: `1px solid ${SEV_PRINT_COLORS[f.severity]}`, padding: '1px 6px', borderRadius: 3 }}>{f.severity}</span>
                      {f.cvss && <span style={{ fontSize: 12, color: '#555' }}>CVSS: {f.cvss}</span>}
                    </div>
                    <p style={{ fontSize: 13, marginBottom: 6 }}><strong>Description:</strong> {f.description}</p>
                    {f.evidence && <p style={{ fontSize: 13, marginBottom: 6 }}><strong>Evidence:</strong> {f.evidence}</p>}
                    {f.impact && <p style={{ fontSize: 13, marginBottom: 6 }}><strong>Impact:</strong> {f.impact}</p>}
                    {f.recommendation && <p style={{ fontSize: 13, marginBottom: 6 }}><strong>Recommendation:</strong> {f.recommendation}</p>}
                    {f.references.length > 0 && (
                      <p style={{ fontSize: 12, color: '#555' }}><strong>References:</strong> {f.references.join(', ')}</p>
                    )}
                  </div>
                ))
              )}
            </section>
          );
        }
        if (!s.content.trim()) return null;
        return (
          <section key={s.id} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, borderBottom: '1px solid #ddd', paddingBottom: 6, marginBottom: 12 }}>{s.title}</h2>
            <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{s.content}</div>
          </section>
        );
      })}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: '3px 12px 3px 0', fontWeight: 600, color: '#555', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</td>
      <td style={{ padding: '3px 0', fontSize: 13 }}>{value}</td>
    </tr>
  );
}
