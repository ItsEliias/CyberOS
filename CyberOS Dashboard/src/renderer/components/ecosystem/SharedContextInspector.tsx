// CyberOS Dashboard — Shared Context Inspector

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useDashboardStore } from '../../stores/useDashboardStore'
import { timeAgo } from '../../utils/timeAgo'

// ─── Copy icon ────────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch { /* ignore */ }
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy'}
      className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded transition-all flex-shrink-0 ml-1"
      style={{
        background: copied ? 'rgba(63,185,80,0.15)' : 'rgba(42,51,71,0.45)',
        color:      copied ? '#3fb950' : '#8b949e',
        border:     `1px solid ${copied ? 'rgba(63,185,80,0.3)' : 'rgba(42,51,71,0.6)'}`,
      }}
    >
      {copied ? (
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
          <rect x="1" y="3" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M4 3V2a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-1" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      )}
    </button>
  )
}

export default function SharedContextInspector() {
  const config = useDashboardStore((s) => s.config)
  const ctx = config.shared_context

  const fields = [
    { label: 'Active Lab',     value: ctx?.activeLab },
    { label: 'Active Target',  value: ctx?.activeTarget },
    { label: 'Active IP',      value: ctx?.activeIP,       mono: true },
    { label: 'Active Playbook',value: ctx?.activePlaybook },
    { label: 'Last Updated',   value: ctx?.lastUpdated ? timeAgo(ctx.lastUpdated) : null },
    { label: 'Updated By',     value: ctx?.updatedBy },
  ]

  const activeCount = fields.filter((f) => !!f.value).length

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--elevation-1), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
          Shared Context
        </span>
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{
            background: activeCount > 0 ? 'rgba(74,158,255,0.1)' : 'rgba(42,51,71,0.4)',
            color: activeCount > 0 ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          {activeCount}/{fields.length}
        </span>
      </div>

      <div className="space-y-2.5">
        {fields.map((field, i) => (
          <motion.div
            key={field.label}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18, delay: i * 0.06, ease: 'easeOut' }}
            className="flex items-center justify-between gap-4 group"
          >
            <span className="text-[11px] text-text-secondary shrink-0">{field.label}</span>
            {field.value ? (
              <div className="flex items-center min-w-0">
                <span
                  className="text-[11px] text-text-primary truncate max-w-[160px]"
                  style={{ fontFamily: field.mono ? 'var(--font-mono)' : 'var(--font-display)' }}
                  title={String(field.value)}
                >
                  {field.value}
                </span>
                <CopyButton value={String(field.value)} />
              </div>
            ) : (
              <span className="text-[11px] text-text-muted italic">Not set</span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
