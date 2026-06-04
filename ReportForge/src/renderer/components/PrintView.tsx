import { useEffect } from 'react';
import type { Report } from '@shared/types';
import { injectPrintStyles, removePrintStyles, watermarkStyle } from '../utils/printStyles';
import { applyVariables } from '../utils/variables';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMarkdown(md: string): string {
  if (!md.trim()) return '';
  let h = md;
  h = h.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre style="background:#f4f4f4;padding:10px 14px;border-radius:4px;font-size:11px;overflow-x:auto;margin:8px 0"><code>${esc(code.trim())}</code></pre>`
  );
  h = h.replace(/`([^`]+)`/g, (_, c) => `<code style="background:#f0f0f0;padding:1px 5px;border-radius:3px;font-size:12px">${esc(c)}</code>`);
  h = h.replace(/^#{6}\s+(.+)$/gm, '<h6 style="font-size:12px;margin:10px 0 4px">$1</h6>');
  h = h.replace(/^#{5}\s+(.+)$/gm, '<h5 style="font-size:13px;margin:10px 0 4px">$1</h5>');
  h = h.replace(/^#{4}\s+(.+)$/gm, '<h4 style="font-size:14px;margin:12px 0 4px">$1</h4>');
  h = h.replace(/^#{3}\s+(.+)$/gm, '<h3 style="font-size:15px;margin:14px 0 6px">$1</h3>');
  h = h.replace(/^#{2}\s+(.+)$/gm, '<h2 style="font-size:16px;font-weight:700;margin:16px 0 6px">$1</h2>');
  h = h.replace(/^#{1}\s+(.+)$/gm, '<h1 style="font-size:18px;font-weight:700;margin:16px 0 6px">$1</h1>');
  h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
  h = h.replace(/~~(.+?)~~/g, '<del>$1</del>');
  h = h.replace(/^[-*+] (.+)$/gm, '<li style="margin-left:20px">$1</li>');
  h = h.replace(/^(\d+)\. (.+)$/gm, '<li style="margin-left:20px">$2</li>');
  h = h.replace(/(<li[\s\S]*?<\/li>)/g, block => `<ul style="margin:6px 0;padding:0">${block}</ul>`);
  h = h.replace(/((?:\|[^\n]+\|\n)+)/g, (tb) => {
    const rows = tb.trim().split('\n').filter(r => !/^\|[-| :]+\|$/.test(r.trim()));
    if (!rows.length) return tb;
    const parseRow = (r: string) => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    const [head, ...body] = rows;
    const thCells = parseRow(head).map(c => `<th style="border:1px solid #ccc;padding:5px 10px;background:#f5f5f5;text-align:left">${c}</th>`).join('');
    const tbRows  = body.map(r => `<tr>${parseRow(r).map(c => `<td style="border:1px solid #ccc;padding:5px 10px">${c}</td>`).join('')}</tr>`).join('');
    return `<table style="border-collapse:collapse;width:100%;margin:10px 0"><thead><tr>${thCells}</tr></thead><tbody>${tbRows}</tbody></table>`;
  });
  h = h.replace(/\n\n+/g, '</p><p style="margin:8px 0">');
  h = `<p style="margin:8px 0">${h}</p>`;
  h = h.replace(/<p[^>]*>\s*<\/p>/g, '');
  h = h.replace(/<p[^>]*>(<(?:h[1-6]|pre|ul|ol|table)[^>]*>)/g, '$1');
  h = h.replace(/(<\/(?:h[1-6]|pre|ul|ol|table)>)<\/p>/g, '$1');
  return h;
}

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
    injectPrintStyles();

    // Inject watermark if set
    const wm = report.watermark && report.watermark !== 'none' ? report.watermark : null;
    let wmStyle: HTMLStyleElement | null = null;
    if (wm) {
      wmStyle = document.createElement('style');
      wmStyle.id = 'reportforge-watermark';
      wmStyle.textContent = watermarkStyle(wm);
      document.head.appendChild(wmStyle);
    }

    const t = setTimeout(() => { onReady(); }, 600);
    return () => {
      clearTimeout(t);
      removePrintStyles();
      wmStyle?.remove();
    };
  }, [onReady, report.watermark]);

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
        // Cover section
        if (s.type === 'cover' && s.coverData) {
          const cd = s.coverData;
          return (
            <section key={s.id} style={{ marginBottom: 40, paddingBottom: 24, borderBottom: '2px solid #2a7a36' }}>
              {cd.logoBase64 && <img src={cd.logoBase64} alt="logo" style={{ height: 48, marginBottom: 12, objectFit: 'contain' }} />}
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#cc0000', border: '1px solid #cc0000', display: 'inline-block', padding: '2px 8px', borderRadius: 3, marginBottom: 12 }}>{cd.classification}</div>
              <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>{cd.title || report.title}</h1>
              <div style={{ fontSize: 13, color: '#555', display: 'flex', flexWrap: 'wrap', gap: '4px 20px' }}>
                {cd.clientName && <span>Client: <strong>{cd.clientName}</strong></span>}
                {cd.testerName && <span>Prepared by: <strong>{cd.testerName}</strong></span>}
                {cd.date       && <span>Date: <strong>{cd.date}</strong></span>}
              </div>
            </section>
          );
        }

        // Signature block section
        if (s.type === 'signature' && s.signatureBlock) {
          const sb = s.signatureBlock;
          return (
            <section key={s.id} style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, borderBottom: '1px solid #ddd', paddingBottom: 6, marginBottom: 12 }}>{s.title}</h2>
              <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 10, marginTop: 20, display: 'inline-block' }}>
                {sb.signatureData && (
                  sb.signatureData.startsWith('data:')
                    ? <img src={sb.signatureData} alt="signature" style={{ height: 40, marginBottom: 4, display: 'block' }} />
                    : <div style={{ fontSize: 22, fontFamily: 'cursive', marginBottom: 4 }}>{sb.signatureData}</div>
                )}
                <div style={{ fontSize: 13, fontWeight: 700 }}>{sb.preparedBy}</div>
                <div style={{ fontSize: 12, color: '#555' }}>{sb.role}</div>
                <div style={{ fontSize: 12, color: '#555' }}>{sb.date}</div>
              </div>
            </section>
          );
        }

        const resolvedContent = applyVariables(s.content, report.variables);
        if (!resolvedContent.trim()) return null;
        return (
          <section key={s.id} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, borderBottom: '1px solid #ddd', paddingBottom: 6, marginBottom: 12 }}>{s.title}</h2>
            <div style={{ fontSize: 13 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(resolvedContent) }} />
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
