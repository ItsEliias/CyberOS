// ─── VaultViewStates — skeleton, empty, no-results, filter chip ───────────────
// Extracted from VaultView.tsx to keep it under 500 lines.

import { motion } from 'framer-motion'

// ─── Column header definitions (shared with VaultView) ────────────────────────

export const COL_HEADERS: { label: string; sortKey?: string }[] = [
  { label: 'Service',   sortKey: 'alpha'    },
  { label: 'Category'                       },
  { label: 'Username'                       },
  { label: 'IP / Port'                      },
  { label: 'Tags'                           },
  { label: 'Source'                         },
  { label: 'Date',      sortKey: 'newest'   },
  { label: 'Status'                         },
  { label: 'Age',       sortKey: 'lastUsed' },
  { label: 'Breach'                         },
]

// ─── Skeleton shimmer rows ────────────────────────────────────────────────────

export function SkeletonRows() {
  const widths = [
    ['120px', '60px', '90px', '70px', '60px', '55px', '70px', '50px', '48px'],
    ['85px',  '50px', '110px','60px', '80px', '55px', '70px', '50px', '48px'],
    ['100px', '70px', '75px', '90px', '50px', '55px', '70px', '50px', '48px'],
    ['140px', '55px', '95px', '60px', '70px', '55px', '70px', '50px', '48px'],
    ['90px',  '65px', '80px', '80px', '60px', '55px', '70px', '50px', '48px'],
  ]
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {COL_HEADERS.map(col => (
            <th key={col.label} className="table-sticky-head" style={{
              padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600,
              color: '#484f58', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {widths.map((row, ri) => (
          <tr key={ri} style={{ borderBottom: '1px solid rgba(42,51,71,0.25)' }}>
            {row.map((w, ci) => (
              <td key={ci} style={{ padding: '12px 14px' }}>
                <div className="skeleton" style={{ height: 12, width: w }} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

export function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '2px 8px', borderRadius: 12, fontSize: 11, cursor: 'pointer',
        border: active ? '1px solid rgba(247,129,102,0.5)' : '1px solid rgba(42,51,71,0.5)',
        background: active ? 'rgba(247,129,102,0.1)' : 'transparent',
        color: active ? '#f78166' : '#8b949e',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

// ─── Illustrated empty state ──────────────────────────────────────────────────

export function Empty() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ padding: '72px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}
    >
      <div style={{ position: 'relative', width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.12, 0.35] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(247,129,102,0.2) 0%, transparent 70%)',
            border: '1px solid rgba(247,129,102,0.15)',
          }}
        />
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'radial-gradient(circle at 50% 35%, rgba(247,129,102,0.12) 0%, rgba(247,129,102,0.04) 100%)',
            border: '1px solid rgba(247,129,102,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 24px rgba(247,129,102,0.1)',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f78166" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.75 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            <circle cx="12" cy="16" r="1" fill="#f78166" />
          </svg>
        </motion.div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 300 }}>
        <div style={{ fontSize: 16, color: '#c9d1d9', fontWeight: 600, letterSpacing: '-0.2px' }}>Vault is empty</div>
        <div style={{ fontSize: 12, color: '#484f58', lineHeight: 1.6 }}>
          Add your first credential using <span style={{ color: '#f78166', fontWeight: 500 }}>+ Add</span>, or import from ReconDesk or a CSV export.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ opacity: [0.15, 0.5, 0.15] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3 }}
            style={{ width: 5, height: 5, borderRadius: '50%', background: '#f78166' }}
          />
        ))}
      </div>
    </motion.div>
  )
}

// ─── No-results state ─────────────────────────────────────────────────────────

export function NoResults() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: 'rgba(42,51,71,0.3)', border: '1px solid rgba(42,51,71,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#484f58" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 13, color: '#8b949e', fontWeight: 500, marginBottom: 4 }}>No results</div>
        <div style={{ fontSize: 12, color: '#484f58' }}>Try a different search or clear your filters.</div>
      </div>
    </motion.div>
  )
}
