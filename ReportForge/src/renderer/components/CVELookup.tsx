import { useState } from 'react';

interface Props {
  onFill: (description: string, cvss: string) => void;
  onClose: () => void;
}

async function fetchCVE(id: string): Promise<{ description: string; cvss: string } | null> {
  const clean = id.trim().toUpperCase();
  if (!/^CVE-\d{4}-\d+$/.test(clean)) return null;
  try {
    const res = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${clean}`);
    if (!res.ok) return null;
    const data = await res.json();
    const cve = data?.vulnerabilities?.[0]?.cve;
    if (!cve) return null;
    const desc = cve.descriptions?.find((d: { lang: string }) => d.lang === 'en')?.value ?? '';
    const m = cve.metrics;
    let cvss = '';
    const m31 = m?.cvssMetricV31?.[0]?.cvssData;
    const m30 = m?.cvssMetricV30?.[0]?.cvssData;
    const m2  = m?.cvssMetricV2?.[0]?.cvssData;
    if (m31)      cvss = `${m31.baseScore} (${m31.baseSeverity})`;
    else if (m30) cvss = `${m30.baseScore} (${m30.baseSeverity})`;
    else if (m2)  cvss = `${m2.baseScore} (${m2.baseSeverity ?? 'N/A'})`;
    return { description: desc, cvss };
  } catch { return null; }
}

export default function CVELookup({ onFill, onClose }: Props) {
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function handleLookup() {
    const id = input.trim();
    if (!id) return;
    setLoading(true);
    setError('');
    const result = await fetchCVE(id);
    setLoading(false);
    if (!result) {
      setError('CVE not found or NVD API unavailable.');
      return;
    }
    onFill(result.description, result.cvss);
  }

  return (
    <div style={{
      padding: '8px 20px', borderBottom: '1px solid var(--border)',
      background: 'rgba(63,185,80,0.05)', flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', flexShrink: 0 }}>CVE Lookup</span>
      <input
        autoFocus
        value={input}
        onChange={e => { setInput(e.target.value); setError(''); }}
        onKeyDown={e => { if (e.key === 'Enter') handleLookup(); if (e.key === 'Escape') onClose(); }}
        placeholder="CVE-2021-44228"
        style={{ flex: 1, maxWidth: 200, fontFamily: '"SF Mono", monospace', fontSize: 12 }}
      />
      <button
        className="btn-primary"
        style={{ padding: '3px 12px', fontSize: 11, flexShrink: 0 }}
        onClick={handleLookup}
        disabled={!input.trim() || loading}
      >
        {loading ? 'Fetching…' : 'Fill'}
      </button>
      <button className="btn-ghost" style={{ padding: '3px 8px', fontSize: 11, flexShrink: 0 }} onClick={onClose}>✕</button>
      {error && <span style={{ fontSize: 11, color: 'var(--danger)' }}>{error}</span>}
      {!error && (
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Appends description + CVSS from NVD to section content</span>
      )}
    </div>
  );
}
