// ReconDesk — Soft lock screen shown when "Require CredVault session" is
// on and the shared SSO state reports CredVault as locked or expired.

import { motion } from 'framer-motion'

interface Props {
  onCheck: () => void
}

export default function SSOLockScreen({ onCheck }: Props) {
  async function openCredVault() {
    try { await window.electronAPI.openCredVault() } catch { /* ignore */ }
    setTimeout(onCheck, 1500)
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(180deg, rgba(7,8,15,0.96) 0%, rgba(13,14,24,0.96) 100%)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 60,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        style={{
          width: 380, maxWidth: 'calc(100vw - 32px)',
          padding: 28, borderRadius: 14,
          background: 'rgba(13,14,24,0.92)',
          border: '1px solid rgba(210,153,34,0.22)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center',
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: 12,
          background: 'rgba(210,153,34,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d29922" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#e6edf3' }}>
            ReconDesk is locked
          </span>
          <span style={{ fontSize: 12, color: '#8b949e', lineHeight: 1.5 }}>
            Unlock CredVault to access targets and credentials. The lock is enforced because
            you turned on “Require CredVault session” in Settings.
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button onClick={openCredVault}
            style={{
              padding: '8px 14px', borderRadius: 8,
              background: 'rgba(210,153,34,0.18)',
              border: '1px solid rgba(210,153,34,0.4)',
              color: '#d29922', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
            }}>
            Open CredVault
          </button>
          <button onClick={onCheck}
            style={{
              padding: '8px 14px', borderRadius: 8,
              background: 'transparent',
              border: '1px solid rgba(42,51,71,0.6)',
              color: '#8b949e', cursor: 'pointer',
              fontSize: 12,
            }}>
            Check again
          </button>
        </div>
      </motion.div>
    </div>
  )
}
