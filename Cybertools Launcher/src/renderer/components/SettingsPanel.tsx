import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CyberToolsConfig } from '@shared/types';

interface Props {
  open: boolean;
  config: CyberToolsConfig | null;
  onClose: () => void;
  onSave: (updates: Record<string, unknown>) => void;
}

const CORES        = ['stealth', 'graphite', 'frost', 'oled'] as const;
const PERSONALITIES= ['neutral', 'cyberpunk', 'terminal', 'threat'] as const;

export default function SettingsPanel({ open, config, onClose, onSave }: Props) {
  const [tab, setTab] = useState<'apps' | 'vault' | 'theme'>('apps');

  async function pickFile(field: string, nested: string) {
    const picked = await window.api.openFilePicker();
    if (picked) {
      onSave({ [field]: { ...(config as Record<string, unknown>)[field] as object, [nested]: picked } });
    }
  }

  async function pickFolder(field: string) {
    const picked = await window.api.openFolderPicker();
    if (picked) onSave({ [field]: picked });
  }

  async function pickExecPath(field: string) {
    const isDir = await window.api.openFolderPicker();
    if (isDir) {
      onSave({ [field]: { ...(config as Record<string, unknown>)[field] as object, execPath: isDir } });
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ background: 'rgba(0,0,0,0.4)' }}
          />
          <motion.div
            className="absolute inset-y-0 right-0 z-40 flex flex-col w-72 border-l"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Settings</span>
              <button onClick={onClose} className="text-lg leading-none hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}>×</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
              {(['apps', 'vault', 'theme'] as const).map(t => (
                <button key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 py-2 text-[11px] uppercase tracking-wider font-medium capitalize transition-colors"
                  style={{
                    color: tab === t ? 'var(--accent)' : 'var(--text-dim)',
                    borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                    marginBottom: -1
                  }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {tab === 'apps' && (
                <>
                  {[
                    { label: 'CyberLab Companion', field: 'cyberlab',     installed: config?.cyberlab?.installed },
                    { label: 'VaultCore',           field: 'vaultscraper', installed: config?.vaultscraper?.installed },
                    { label: 'GhostVault',          field: 'ghostvault',   installed: false },
                  ].map(({ label, field, installed }) => {
                    const cfg = (config as Record<string, { execPath?: string; installed?: boolean }> | null)?.[field];
                    return (
                      <div key={field}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${installed ? 'bg-green-400' : 'bg-gray-500'}`} />
                          <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{label}</span>
                        </div>
                        <div className="text-[10px] mb-1.5 truncate" style={{ color: 'var(--text-dim)' }}>
                          {cfg?.execPath || 'Not configured'}
                        </div>
                        <button
                          onClick={() => pickExecPath(field)}
                          className="w-full text-[11px] py-1 rounded border text-center transition-colors hover:bg-white/5"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                        >
                          Locate app…
                        </button>
                      </div>
                    );
                  })}
                </>
              )}

              {tab === 'vault' && (
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>
                    Obsidian Vault
                  </div>
                  <div className="text-[10px] mb-1.5 truncate" style={{ color: 'var(--text-dim)' }}>
                    {config?.obsidianVaultPath || 'Not set'}
                  </div>
                  <button
                    onClick={() => pickFolder('obsidianVaultPath')}
                    className="w-full text-[11px] py-1 rounded border text-center transition-colors hover:bg-white/5"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  >
                    Choose folder…
                  </button>
                </div>
              )}

              {tab === 'theme' && (
                <>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                      Core Theme
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {CORES.map(core => (
                        <button key={core}
                          onClick={() => onSave({ theme: core })}
                          className="py-1.5 rounded text-[11px] capitalize font-medium border transition-colors"
                          style={{
                            background    : config?.theme === core ? 'var(--accent)' : 'var(--bg3)',
                            borderColor   : config?.theme === core ? 'var(--accent)' : 'var(--border)',
                            color         : config?.theme === core ? '#fff' : 'var(--text-muted)'
                          }}>
                          {core}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                      Personality
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PERSONALITIES.map(p => (
                        <button key={p}
                          onClick={() => onSave({ personalityTheme: p })}
                          className="py-1.5 rounded text-[11px] capitalize font-medium border transition-colors"
                          style={{
                            background  : config?.personalityTheme === p ? 'var(--accent)' : 'var(--bg3)',
                            borderColor : config?.personalityTheme === p ? 'var(--accent)' : 'var(--border)',
                            color       : config?.personalityTheme === p ? '#fff' : 'var(--text-muted)'
                          }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
