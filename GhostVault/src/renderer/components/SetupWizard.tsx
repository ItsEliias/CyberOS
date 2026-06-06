import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HelpTip from './ui/HelpTip';
import type { CoreTheme, PersonalityTheme, ThemeConfig } from '@shared/types';

const CORES:         CoreTheme[]        = ['stealth', 'graphite', 'frost', 'oled'];
const PERSONALITIES: PersonalityTheme[] = ['neutral', 'cyberpunk', 'terminal', 'threat'];

interface Props {
  onComplete: (vaultPath: string, theme: ThemeConfig, useExisting: boolean) => void;
}

export default function SetupWizard({ onComplete }: Props) {
  const [step, setStep]               = useState(0);
  const [vaultPath, setVaultPath]     = useState('');
  const [useExisting, setUseExisting] = useState(false);
  const [core, setCore]               = useState<CoreTheme>('stealth');
  const [personality, setPersonality] = useState<PersonalityTheme>('neutral');

  // Live-apply theme preview
  function applyPreview(c: CoreTheme, p: PersonalityTheme) {
    document.documentElement.setAttribute('data-core', c);
    document.documentElement.setAttribute('data-personality', p);
  }

  async function pickVault() {
    const p = await window.ghostvault.pickVaultDir({ skipFolderCreate: false });
    if (p) setVaultPath(p);
  }

  function handleFinish() {
    if (!vaultPath) return;
    onComplete(vaultPath, { core, personality }, useExisting);
  }

  const steps = [
    // ── Step 0: Welcome ──────────────────────────────────────────────────────
    <motion.div key="welcome" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-col items-center gap-6 py-4">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
        style={{ background: 'var(--accent)', boxShadow: '0 0 40px rgba(74,158,255,.3)' }}>
        👻
      </div>
      <div className="text-center">
        <div className="inline-flex items-center gap-2">
          <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Welcome to GhostVault</div>
          <HelpTip
            title="Setup wizard"
            body="Three steps: pick a theme, point GhostVault at a vault folder, and launch. You can change all of these later under Settings."
          />
        </div>
        <div className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          Your AI-powered note capture and markdown vault workspace.
        </div>
      </div>
      <div className="text-xs text-center max-w-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
        Let&apos;s get you set up in three quick steps — choose a theme, connect your vault, and you&apos;re ready.
      </div>
      <button onClick={() => setStep(1)}
        className="px-8 py-2.5 rounded-lg font-semibold text-sm transition-all"
        style={{ background: 'var(--accent)', color: '#fff' }}>
        Get Started
      </button>
    </motion.div>,

    // ── Step 1: Theme ────────────────────────────────────────────────────────
    <motion.div key="theme" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-col gap-5">
      <div>
        <div className="text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
          Core Theme
          <HelpTip body="Sets the surface palette: stealth (deep navy), graphite (warm dark), frost (cool gray), or oled (true black). Combine with a personality for the final look." />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {CORES.map(c => (
            <button key={c}
              onClick={() => { setCore(c); applyPreview(c, personality); }}
              className="py-2 rounded-lg text-xs capitalize font-medium border transition-all"
              style={{
                background  : core === c ? 'var(--accent)' : 'var(--bg3)',
                borderColor : core === c ? 'var(--accent)' : 'var(--border)',
                color       : core === c ? '#fff' : 'var(--text-muted)'
              }}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
          Personality
          <HelpTip body="Accent color and motion vibe layered on top of the core theme. Pick neutral for muted, cyberpunk / terminal / threat for louder palettes." />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {PERSONALITIES.map(p => (
            <button key={p}
              onClick={() => { setPersonality(p); applyPreview(core, p); }}
              className="py-2 rounded-lg text-xs capitalize font-medium border transition-all"
              style={{
                background  : personality === p ? 'var(--accent)' : 'var(--bg3)',
                borderColor : personality === p ? 'var(--accent)' : 'var(--border)',
                color       : personality === p ? '#fff' : 'var(--text-muted)'
              }}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-between pt-2">
        <button onClick={() => setStep(0)} className="text-sm px-4 py-2 rounded-lg border transition-colors hover:bg-white/5"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>Back</button>
        <button onClick={() => setStep(2)} className="text-sm px-6 py-2 rounded-lg font-medium"
          style={{ background: 'var(--accent)', color: '#fff' }}>Next</button>
      </div>
    </motion.div>,

    // ── Step 2: Vault ────────────────────────────────────────────────────────
    <motion.div key="vault" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-col gap-5">
      <div>
        <div className="text-[10px] uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
          Vault Directory
          <HelpTip body="The folder GhostVault reads and writes your notes into. Pick a fresh folder for a new vault, or an existing folder you already keep markdown notes in." />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2 rounded-lg border text-sm truncate"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: vaultPath ? 'var(--text)' : 'var(--text-dim)' }}>
            {vaultPath || 'No folder selected'}
          </div>
          <button onClick={pickVault}
            className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            Browse…
          </button>
        </div>
        {vaultPath && (
          <div className="text-[11px] mt-2" style={{ color: 'var(--accent)' }}>✓ Vault directory set</div>
        )}
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={useExisting} onChange={e => setUseExisting(e.target.checked)}
          className="w-4 h-4 accent-accent" />
        <div>
          <div className="text-sm" style={{ color: 'var(--text)' }}>Use existing structure</div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
            Don&apos;t create default folders — keep your own layout
          </div>
        </div>
      </label>

      <div className="flex justify-between pt-2">
        <button onClick={() => setStep(1)} className="text-sm px-4 py-2 rounded-lg border transition-colors hover:bg-white/5"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>Back</button>
        <button onClick={handleFinish} disabled={!vaultPath}
          className="text-sm px-6 py-2 rounded-lg font-medium disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#fff' }}>
          Launch GhostVault
        </button>
      </div>
    </motion.div>,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'var(--bg)' }}>
      <div className="w-[460px] p-8 rounded-2xl border"
        style={{ background: 'var(--bg3)', borderColor: 'var(--border)', boxShadow: '0 24px 60px rgba(0,0,0,.5)' }}>
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full transition-all"
              style={{ background: i === step ? 'var(--accent)' : i < step ? 'var(--accent)' : 'var(--border)', opacity: i < step ? 0.5 : 1 }} />
          ))}
        </div>
        <AnimatePresence mode="wait">{steps[step]}</AnimatePresence>
      </div>
    </div>
  );
}
