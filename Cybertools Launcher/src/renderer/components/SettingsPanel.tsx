import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CyberToolsConfig } from '@shared/types';
import HelpTip from './ui/HelpTip';
import BackupSection from './BackupSection';

interface Props {
  open: boolean;
  config: CyberToolsConfig | null;
  onClose: () => void;
  onSave: (updates: Record<string, unknown>) => void;
}

const CORES        = ['stealth', 'graphite', 'frost', 'oled'] as const;
const PERSONALITIES= ['neutral', 'cyberpunk', 'terminal', 'threat'] as const;

export default function SettingsPanel({ open, config, onClose, onSave }: Props) {
  const [tab, setTab] = useState<'apps' | 'vault' | 'theme' | 'backup'>('apps');

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
              {(['apps', 'vault', 'theme', 'backup'] as const).map(t => (
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
                  <div className="text-[10px] uppercase tracking-wider mb-1 inline-flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                    Core
                    <HelpTip
                      title="Core apps"
                      body="The primary CyberOS apps. Use 'Locate app…' to point the Launcher at where each app's executable lives if auto-detect didn't find it."
                    />
                  </div>
                  {[
                    { label: 'CyberLab Companion', field: 'cyberlab' },
                    { label: 'VaultCore',           field: 'vaultscraper' },
                    { label: 'GhostVault',          field: 'ghostvault' },
                    { label: 'ReconDesk',           field: 'recondesk' },
                    { label: 'SignalBoard',          field: 'signalboard' },
                    { label: 'CyberOS Dashboard',   field: 'cyberos' },
                  ].map(({ label, field }) => {
                    const cfg = (config as Record<string, { execPath?: string; installed?: boolean }> | null)?.[field];
                    // Treat any app with a configured execPath as installed.
                    // The previous code hardcoded `installed: false` for 4 of
                    // 6 entries, so the green-dot indicator was dead for them.
                    const installed = cfg?.installed ?? !!cfg?.execPath;
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

                  <div className="text-[10px] uppercase tracking-wider mt-3 mb-1 inline-flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                    Tools
                    <HelpTip
                      title="Tool apps"
                      body="Supporting CyberOS tools. Configure their executable paths here so the Launcher can spawn them when you click Open."
                    />
                  </div>
                  {[
                    { label: 'CredVault',       field: 'credvault' },
                    { label: 'PlaybookStudio',  field: 'playbookstudio' },
                    { label: 'ReportForge',     field: 'reportforge' },
                    { label: 'TerminalLink',    field: 'terminallink' },
                    { label: 'NetworkMap',      field: 'networkmap' },
                  ].map(({ label, field }) => {
                    const cfg = (config as Record<string, { execPath?: string }> | null)?.[field];
                    const hasPath = !!cfg?.execPath;
                    return (
                      <div key={field}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hasPath ? 'bg-green-400' : 'bg-gray-500'}`} />
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
                  <div className="text-xs font-semibold mb-1 inline-flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                    Obsidian Vault
                    <HelpTip
                      title="Obsidian vault"
                      body="Where CyberOS apps write notes, reports, and exports. Point this at your Obsidian vault folder to keep everything in one searchable place."
                    />
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
                    <div className="text-[10px] uppercase tracking-wider mb-2 inline-flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                      Core Theme
                      <HelpTip
                        title="Core theme"
                        body="The base palette every CyberOS app inherits. Switching this restyles the Launcher and broadcasts to other apps that are listening."
                      />
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
                    <div className="text-[10px] uppercase tracking-wider mb-2 inline-flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                      Personality
                      <HelpTip
                        title="Personality"
                        body="Modulates accent colors, copy tone, and small UI flourishes on top of the core theme — pick the vibe that matches the work you're doing."
                      />
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

              {tab === 'backup' && (
                <BackupSection
                  backup={(config as Record<string, unknown> | null)?.backup as
                    { enabled?: boolean; folder?: string; lastRun?: string; frequency?: 'manual' | 'daily' | 'weekly' } | undefined}
                  cloud={(config as Record<string, unknown> | null)?.cloudSync as
                    { enabled?: boolean; provider?: 'icloud' | 'dropbox' | 'google' } | undefined}
                  onSave={onSave}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
