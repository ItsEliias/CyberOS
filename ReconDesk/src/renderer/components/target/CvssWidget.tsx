// ReconDesk — CVSS v3 Base Score Calculator widget
import { useState } from 'react'
import type { CvssMetrics } from '../../types/recondesk'

const CVSS_WEIGHTS = {
  AV:   { N: 0.85, A: 0.62, L: 0.55, P: 0.2  },
  AC:   { L: 0.77, H: 0.44 },
  PR:   { N: 0.85, L: 0.62, H: 0.27 },
  PR_S: { N: 0.85, L: 0.68, H: 0.5  },
  UI:   { N: 0.85, R: 0.62 },
  C:    { N: 0,    L: 0.22, H: 0.56  },
  I:    { N: 0,    L: 0.22, H: 0.56  },
  A:    { N: 0,    L: 0.22, H: 0.56  },
}

export function calcCvssScore(m: CvssMetrics): number {
  const pr  = m.S === 'C' ? CVSS_WEIGHTS.PR_S[m.PR] : CVSS_WEIGHTS.PR[m.PR]
  const iss = 1 - (1 - CVSS_WEIGHTS.C[m.C]) * (1 - CVSS_WEIGHTS.I[m.I]) * (1 - CVSS_WEIGHTS.A[m.A])
  const impact = m.S === 'U'
    ? 3.4 * iss
    : 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15)
  if (impact <= 0) return 0
  const exploitability = 8.22 * CVSS_WEIGHTS.AV[m.AV] * CVSS_WEIGHTS.AC[m.AC] * pr * CVSS_WEIGHTS.UI[m.UI]
  const base = m.S === 'U'
    ? Math.min(impact + exploitability, 10)
    : Math.min(1.08 * (impact + exploitability), 10)
  return Math.round(base * 10) / 10
}

export function cvssColor(score: number): string {
  if (score === 0) return '#4a5568'
  if (score < 4)  return '#3fb950'
  if (score < 7)  return '#d29922'
  if (score < 9)  return '#f85149'
  return '#b44fff'
}

export function cvssSeverity(score: number): string {
  if (score === 0) return 'None'
  if (score < 4)  return 'Low'
  if (score < 7)  return 'Medium'
  if (score < 9)  return 'High'
  return 'Critical'
}

const DEFAULT_CVSS: CvssMetrics = { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'N', I: 'N', A: 'N' }

interface CvssWidgetProps {
  value?: CvssMetrics
  onChange: (m: CvssMetrics) => void
}

export default function CvssWidget({ value, onChange }: CvssWidgetProps) {
  const [open, setOpen] = useState(false)
  const m     = value ?? DEFAULT_CVSS
  const score = value ? calcCvssScore(m) : null
  const color = score !== null ? cvssColor(score) : '#4a5568'

  function sel(label: string, key: keyof CvssMetrics, opts: string[]) {
    return (
      <div key={key}>
        <label className="block text-[9px] text-[#4a5568] uppercase tracking-widest mb-0.5">{label}</label>
        <select
          value={m[key]}
          onChange={e => onChange({ ...m, [key]: e.target.value } as CvssMetrics)}
          className="w-full bg-[#0a0a0f] border border-[#2a3347] rounded px-1.5 py-1 text-[10px] text-[#e2e8f0] focus:outline-none focus:border-[#d29922]"
        >
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-[11px] text-[#4a5568] uppercase tracking-widest">CVSS v3</label>
        {score !== null && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ color, background: `${color}15`, border: `1px solid ${color}25` }}>
            {score} {cvssSeverity(score)}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-[10px] py-1.5 rounded border border-dashed border-[#2a3347] text-[#4a5568] hover:text-[#d29922] hover:border-[#d29922]/30 transition-colors"
      >
        {open ? 'Hide CVSS Calculator' : (value ? 'Edit CVSS Metrics' : '+ Add CVSS Score')}
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {sel('AV',    'AV', ['N', 'A', 'L', 'P'])}
          {sel('AC',    'AC', ['L', 'H'])}
          {sel('PR',    'PR', ['N', 'L', 'H'])}
          {sel('UI',    'UI', ['N', 'R'])}
          {sel('Scope', 'S',  ['U', 'C'])}
          {sel('Conf',  'C',  ['N', 'L', 'H'])}
          {sel('Integ', 'I',  ['N', 'L', 'H'])}
          {sel('Avail', 'A',  ['N', 'L', 'H'])}
        </div>
      )}
    </div>
  )
}
