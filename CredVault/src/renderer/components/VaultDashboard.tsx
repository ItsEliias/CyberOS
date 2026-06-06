// CredVault — VaultDashboard
// Right-pane content shown when no credential is selected.
// Replaces the previous empty "Select a credential" state with stats,
// quick actions, recently used items and security tips.

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../store'
import { scorePassword } from '../utils/passwordStrength'
import type { Credential } from '@shared/types'

interface Props {
  onAddClick:       () => void
  onGenerateClick:  () => void
  onImportClick:    () => void
  onHibpClick:      () => void
  hibpRunning?:     boolean
  breachedCount?:   number
  onSelectCred?:    (cred: Credential) => void
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
      style={{
        background: 'rgba(13,14,24,0.55)',
        border: '1px solid rgba(42,51,71,0.45)',
        borderRadius: 10,
        padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 4,
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontSize: 22, color: accent ?? '#e2e8f0', fontWeight: 700, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: 10, color: '#4a5568' }}>{sub}</span>
      )}
    </motion.div>
  )
}

function ActionCard({ icon, label, hint, onClick, accent }: { icon: JSX.Element; label: string; hint?: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: accent ? 'rgba(247,129,102,0.08)' : 'rgba(13,14,24,0.55)',
        border: accent ? '1px solid rgba(247,129,102,0.35)' : '1px solid rgba(42,51,71,0.45)',
        borderRadius: 10,
        padding: '14px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 0.15s, background 0.15s, transform 0.12s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = accent ? 'rgba(247,129,102,0.55)' : 'rgba(247,129,102,0.35)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = accent ? 'rgba(247,129,102,0.35)' : 'rgba(42,51,71,0.45)'
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: accent ? 'rgba(247,129,102,0.15)' : 'rgba(247,129,102,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#f78166', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 12.5, color: '#e2e8f0', fontWeight: 600 }}>{label}</span>
        {hint && <span style={{ fontSize: 10.5, color: '#6b7280' }}>{hint}</span>}
      </div>
    </button>
  )
}

const TIPS = [
  { title: 'Use a unique password per service', body: 'Reuse means one breach unlocks every account that shares it.' },
  { title: 'Prefer passphrases for human-typed secrets', body: 'Four random words beat a short jumble of symbols.' },
  { title: 'Rotate API tokens on a schedule', body: 'Mark Token / API Key entries with an expiry note so you remember.' },
  { title: 'Check HIBP after onboarding', body: 'Pull in your imports first, then run the breach check from the toolbar.' },
]

export default function VaultDashboard({
  onAddClick, onGenerateClick, onImportClick, onHibpClick,
  hibpRunning, breachedCount, onSelectCred,
}: Props) {
  const credentials = useStore(s => s.credentials)
  const version     = useStore(s => s.version)
  const pending     = useStore(s => s.pendingCount)

  const totals = useMemo(() => {
    const total = credentials.length
    const withPw = credentials.filter(c => c.password)
    const strong = withPw.filter(c => scorePassword(c.password!).level >= 3).length
    const weak   = withPw.length - strong
    const folders = new Set(credentials.map(c => c.folder).filter(Boolean)).size
    const categories = new Set(credentials.map(c => c.category).filter(Boolean)).size
    const score = withPw.length === 0 ? null : Math.round((strong / withPw.length) * 100)
    return { total, strong, weak, folders, categories, score, withPwCount: withPw.length }
  }, [credentials])

  const recent = useMemo(() => {
    return [...credentials]
      .filter(c => c.lastUsed)
      .sort((a, b) => new Date(b.lastUsed!).getTime() - new Date(a.lastUsed!).getTime())
      .slice(0, 5)
  }, [credentials])

  const weakest = useMemo(() => {
    return credentials
      .filter(c => c.password)
      .map(c => ({ cred: c, strength: scorePassword(c.password!) }))
      .filter(x => x.strength.level <= 2)
      .sort((a, b) => a.strength.score - b.strength.score)
      .slice(0, 5)
  }, [credentials])

  const tip = useMemo(() => TIPS[Math.floor((credentials.length + new Date().getDate()) % TIPS.length)], [credentials.length])

  const isEmpty = credentials.length === 0

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 18, padding: '18px 22px', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>
            {isEmpty ? 'Welcome' : 'Vault overview'}
          </span>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e6edf3', margin: 0, letterSpacing: '-0.01em' }}>
            {isEmpty ? 'Get started with CredVault' : 'At a glance'}
          </h2>
          {isEmpty && (
            <span style={{ fontSize: 12, color: '#8b949e', maxWidth: 460 }}>
              Local-first credential vault. Add your first secret, import an existing list, or generate a strong password to get started.
            </span>
          )}
        </div>
        {version && (
          <span style={{ fontSize: 10, color: '#4a5568', fontFamily: 'JetBrains Mono, monospace' }}>
            v{version}
          </span>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <StatCard
          label="Credentials"
          value={totals.total}
          sub={totals.total === 0 ? 'empty vault' : `${totals.categories} categor${totals.categories === 1 ? 'y' : 'ies'}`}
        />
        <StatCard
          label="Strong passwords"
          value={totals.withPwCount === 0 ? '—' : `${totals.strong}/${totals.withPwCount}`}
          sub={totals.score == null ? 'no passwords yet' : totals.score >= 80 ? 'looking healthy' : totals.score >= 50 ? 'room to improve' : 'needs attention'}
          accent={totals.score == null ? undefined : totals.score >= 80 ? '#3fb950' : totals.score >= 50 ? '#d29922' : '#f85149'}
        />
        <StatCard
          label="Breached"
          value={breachedCount ?? 0}
          sub={hibpRunning ? 'checking…' : (breachedCount ?? 0) === 0 ? 'no known breaches' : 'rotate these soon'}
          accent={(breachedCount ?? 0) > 0 ? '#f85149' : undefined}
        />
        <StatCard
          label="Pending imports"
          value={pending ?? 0}
          sub={(pending ?? 0) > 0 ? 'staged for review' : 'inbox is clear'}
          accent={(pending ?? 0) > 0 ? '#d29922' : undefined}
        />
      </div>

      {/* Quick actions */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            Quick actions
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <ActionCard
            accent
            onClick={onAddClick}
            label="Add credential"
            hint="Login, API key, SSH, note…"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            }
          />
          <ActionCard
            onClick={onGenerateClick}
            label="Generate password"
            hint="Strong, random, copyable"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
            }
          />
          <ActionCard
            onClick={onImportClick}
            label="Import credentials"
            hint={(pending ?? 0) > 0 ? `${pending} pending` : 'CSV · ReconDesk · JSON'}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            }
          />
          <ActionCard
            onClick={onHibpClick}
            label={hibpRunning ? 'Checking HIBP…' : 'Check HIBP'}
            hint="Scan known breaches"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Needs attention — weakest passwords */}
      {weakest.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
              Needs attention
            </span>
            <span style={{ fontSize: 10, color: '#f85149', fontWeight: 600 }}>
              {weakest.length} weak password{weakest.length === 1 ? '' : 's'}
            </span>
          </div>
          <div style={{
            background: 'rgba(13,14,24,0.55)',
            border: '1px solid rgba(248,81,73,0.25)',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            {weakest.map(({ cred: c, strength }, i) => (
              <button
                key={c.id}
                onClick={() => onSelectCred?.(c)}
                style={{
                  width: '100%', padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'transparent',
                  border: 'none', cursor: 'pointer',
                  borderBottom: i === weakest.length - 1 ? 'none' : '1px solid rgba(42,51,71,0.25)',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,81,73,0.05)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: `${strength.color}1f`, color: strength.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 12.5, color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.service}
                  </span>
                  <span style={{ fontSize: 10.5, color: '#8b949e', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.username}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: strength.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {strength.label}
                  </span>
                  <div style={{ width: 56, height: 3, borderRadius: 99, background: 'rgba(42,51,71,0.5)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${strength.score}%`, background: strength.color }} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Recently viewed */}
      {recent.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            Recently used
          </span>
          <div style={{
            background: 'rgba(13,14,24,0.55)',
            border: '1px solid rgba(42,51,71,0.45)',
            borderRadius: 10,
            overflow: 'hidden',
          }}>
            {recent.map((c, i) => (
              <button
                key={c.id}
                onClick={() => onSelectCred?.(c)}
                style={{
                  width: '100%', padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'transparent',
                  border: 'none', cursor: 'pointer',
                  borderBottom: i === recent.length - 1 ? 'none' : '1px solid rgba(42,51,71,0.25)',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(247,129,102,0.05)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: 'rgba(247,129,102,0.1)', color: '#f78166',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {c.service.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 12.5, color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.service}
                  </span>
                  <span style={{ fontSize: 10.5, color: '#8b949e', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.username}
                  </span>
                </div>
                <span style={{ fontSize: 10, color: '#4a5568' }}>
                  {c.lastUsed ? new Date(c.lastUsed).toLocaleDateString() : ''}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Tip card */}
      <section style={{
        marginTop: 'auto',
        background: 'rgba(13,14,24,0.55)',
        border: '1px solid rgba(42,51,71,0.45)',
        borderRadius: 10,
        padding: '12px 14px',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: 'rgba(74,158,255,0.1)', color: '#4a9eff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.9.8 1 2.3 1 3.3h6c0-1 .1-2.5 1-3.3A7 7 0 0 0 12 2z" />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, color: '#4a9eff', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Security tip
          </span>
          <span style={{ fontSize: 12.5, color: '#e2e8f0', fontWeight: 600 }}>{tip.title}</span>
          <span style={{ fontSize: 11.5, color: '#8b949e', lineHeight: 1.5 }}>{tip.body}</span>
        </div>
      </section>

    </div>
  )
}
