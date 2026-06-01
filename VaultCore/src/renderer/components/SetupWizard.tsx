import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CoreTheme, PersonalityTheme } from '@shared/types';

const CORES: CoreTheme[]           = ['stealth', 'graphite', 'frost', 'oled'];
const PERSONALITIES: PersonalityTheme[] = ['neutral', 'cyberpunk', 'terminal', 'threat'];

interface Props {
  onComplete: (vaultPath: string, theme: { core: CoreTheme; personality: PersonalityTheme }) => void;
}

export default function SetupWizard({ onComplete }: Props) {
  const [step, setStep]         = useState(1);
  const [core, setCore]         = useState<CoreTheme>('stealth');
  const [personality, setPersonality] = useState<PersonalityTheme>('neutral');
  const [vaultPath, setVaultPath] = useState('');
  const [vaultStatus, setVaultStatus] = useState('');

  function applyTheme(c: CoreTheme, p: PersonalityTheme) {
    document.documentElement.setAttribute('data-core', c);
    document.documentElement.setAttribute('data-personality', p);
  }

  function pickCore(c: CoreTheme) { setCore(c); applyTheme(c, personality); }
  function pickPersonality(p: PersonalityTheme) { setPersonality(p); applyTheme(core, p); }

  async function browseVault() {
    const p = await window.electronAPI.selectFolder();
    if (p) { setVaultPath(p); setVaultStatus('✓ Vault path selected'); }
  }

  function finish() {
    if (!vaultPath) return;
    onComplete(vaultPath, { core, personality });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <motion.div
        className="rounded-2xl border p-8 w-[540px]"
        style={{ background: 'var(--bg3)', borderColor: 'var(--border)', boxShadow: '0 32px 80px rgba(0,0,0,.6)' }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--accent)' }}>CYBERTOOLS</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>VAULTCORE</div>
          <div className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
            Step {step} of 2 — {step === 1 ? 'Choose Theme' : 'Select Vault'}
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2 mb-8">
          {[1, 2].map(n => (
            <div key={n} className="flex-1 h-1 rounded-full transition-all" style={{ background: step >= n ? 'var(--accent)' : 'var(--border)' }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>Core</div>
                  <div className="grid grid-cols-4 gap-2">
                    {CORES.map(c => (
                      <button key={c} onClick={() => pickCore(c)}
                        className="py-2 rounded-lg text-xs capitalize font-medium border transition-all"
                        style={{ background: core === c ? 'var(--accent)' : 'var(--bg)', borderColor: core === c ? 'var(--accent)' : 'var(--border)', color: core === c ? '#fff' : 'var(--text-muted)' }}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>Personality</div>
                  <div className="grid grid-cols-4 gap-2">
                    {PERSONALITIES.map(p => (
                      <button key={p} onClick={() => pickPersonality(p)}
                        className="py-2 rounded-lg text-xs capitalize font-medium border transition-all"
                        style={{ background: personality === p ? 'var(--accent)' : 'var(--bg)', borderColor: personality === p ? 'var(--accent)' : 'var(--border)', color: personality === p ? '#fff' : 'var(--text-muted)' }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-center pt-2" style={{ color: 'var(--text-dim)' }}>
                  {core.charAt(0).toUpperCase() + core.slice(1)} + {personality.charAt(0).toUpperCase() + personality.slice(1)}
                </div>
              </div>
              <button onClick={() => setStep(2)}
                className="w-full mt-6 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                Next →
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                Select your Obsidian vault folder. VaultCore will save scraped content there as markdown notes.
              </p>
              <div className="flex gap-2 mb-2">
                <div className="flex-1 px-3 py-2 rounded-lg text-sm font-mono truncate border"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  {vaultPath || 'No folder selected'}
                </div>
                <button onClick={browseVault}
                  className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-white/5"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  Browse…
                </button>
              </div>
              {vaultStatus && (
                <div className="text-xs mb-4" style={{ color: '#3fb950' }}>{vaultStatus}</div>
              )}
              <div className="flex gap-2 mt-6">
                <button onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl text-sm border transition-colors hover:bg-white/5"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  ← Back
                </button>
                <button onClick={finish} disabled={!vaultPath}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 transition-all"
                  style={{ background: 'var(--accent)', color: '#fff' }}>
                  Launch VaultCore
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
