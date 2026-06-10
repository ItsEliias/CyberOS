// SettingsPanel — slide-in right drawer, 4 tabs (apps/vault/theme/backup).
// Migration: replaced all old parallel token vars (--panel, --border, --text,
// --text-dim, --bg3) with canonical tokens.css vars and Tailwind preset classes.
// Anti-slop: bg-green-400/bg-gray-500 replaced with --state-online/--state-offline.
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

const CORES         = ['stealth', 'graphite', 'frost', 'oled'] as const;
const PERSONALITIES = ['neutral', 'cyberpunk', 'terminal', 'threat'] as const;

export default function SettingsPanel({ open, config, onClose, onSave }: Props) {
  const [tab, setTab] = useState<'apps' | 'vault' | 'theme' | 'backup'>('apps');

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
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ background: 'rgba(0,0,0,0.4)' }}
          />

          {/* Drawer */}
          <motion.div
            className="absolute inset-y-0 right-0 z-40 flex flex-col w-72 border-l border-border-default"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{ background: 'var(--surface-3)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
              <span className="text-sm font-semibold text-text-primary">Settings</span>
              <button onClick={onClose} className="text-lg leading-none hover:opacity-70 text-text-secondary">
                ×
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-border-default">
              {(['apps', 'vault', 'theme', 'backup'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="flex-1 py-2 text-[11px] uppercase tracking-wider font-medium capitalize transition-colors"
                  style={{
                    color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
                    borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                    marginBottom: -1,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* ── Apps tab ── */}
              {tab === 'apps' && (
                <>
                  <div className="text-[10px] uppercase tracking-wider mb-1 inline-flex items-center gap-1.5 text-text-muted">
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
                    const installed = cfg?.installed ?? !!cfg?.execPath;
                    return (
                      <div key={field}>
                        <div className="flex items-center gap-2 mb-1">
                          {/* Token-driven state dot — no Tailwind default palette */}
                          <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{
                              background: installed ? 'var(--state-online)' : 'var(--state-offline)',
                              boxShadow:  installed ? '0 0 4px var(--state-online)' : undefined,
                            }}
                          />
                          <span className="text-xs font-semibold text-text-primary">{label}</span>
                        </div>
                        <div className="text-[10px] mb-1.5 truncate text-text-muted">
                          {cfg?.execPath || 'Not configured'}
                        </div>
                        <button
                          onClick={() => pickExecPath(field)}
                          className="w-full text-[11px] py-1 rounded border text-center transition-colors hover:bg-white/5 border-border-default text-text-secondary"
                        >
                          Locate app…
                        </button>
                      </div>
                    );
                  })}

                  <div className="text-[10px] uppercase tracking-wider mt-3 mb-1 inline-flex items-center gap-1.5 text-text-muted">
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
                          <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{
                              background: hasPath ? 'var(--state-online)' : 'var(--state-offline)',
                              boxShadow:  hasPath ? '0 0 4px var(--state-online)' : undefined,
                            }}
                          />
                          <span className="text-xs font-semibold text-text-primary">{label}</span>
                        </div>
                        <div className="text-[10px] mb-1.5 truncate text-text-muted">
                          {cfg?.execPath || 'Not configured'}
                        </div>
                        <button
                          onClick={() => pickExecPath(field)}
                          className="w-full text-[11px] py-1 rounded border text-center transition-colors hover:bg-white/5 border-border-default text-text-secondary"
                        >
                          Locate app…
                        </button>
                      </div>
                    );
                  })}
                </>
              )}

              {/* ── Vault tab ── */}
              {tab === 'vault' && (
                <div>
                  <div className="text-xs font-semibold mb-1 inline-flex items-center gap-1.5 text-text-primary">
                    Obsidian Vault
                    <HelpTip
                      title="Obsidian vault"
                      body="Where CyberOS apps write notes, reports, and exports. Point this at your Obsidian vault folder to keep everything in one searchable place."
                    />
                  </div>
                  <div className="text-[10px] mb-1.5 truncate text-text-muted">
                    {config?.obsidianVaultPath || 'Not set'}
                  </div>
                  <button
                    onClick={() => pickFolder('obsidianVaultPath')}
                    className="w-full text-[11px] py-1 rounded border text-center transition-colors hover:bg-white/5 border-border-default text-text-secondary"
                  >
                    Choose folder…
                  </button>
                </div>
              )}

              {/* ── Theme tab ── */}
              {tab === 'theme' && (
                <>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider mb-2 inline-flex items-center gap-1.5 text-text-muted">
                      Core Theme
                      <HelpTip
                        title="Core theme"
                        body="The base palette every CyberOS app inherits. Switching this restyles the Launcher and broadcasts to other apps that are listening."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {CORES.map(core => (
                        <button
                          key={core}
                          onClick={() => onSave({ theme: core })}
                          className="py-1.5 rounded text-[11px] capitalize font-medium border transition-colors"
                          style={{
                            background:  config?.theme === core ? 'var(--accent)' : 'var(--surface-2)',
                            borderColor: config?.theme === core ? 'var(--accent)' : 'var(--border-default)',
                            color:       config?.theme === core ? 'var(--text-inverse)' : 'var(--text-secondary)',
                          }}
                        >
                          {core}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider mb-2 inline-flex items-center gap-1.5 text-text-muted">
                      Personality
                      <HelpTip
                        title="Personality"
                        body="Modulates accent colors, copy tone, and small UI flourishes on top of the core theme — pick the vibe that matches the work you're doing."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PERSONALITIES.map(p => (
                        <button
                          key={p}
                          onClick={() => onSave({ personalityTheme: p })}
                          className="py-1.5 rounded text-[11px] capitalize font-medium border transition-colors"
                          style={{
                            background:  config?.personalityTheme === p ? 'var(--accent)' : 'var(--surface-2)',
                            borderColor: config?.personalityTheme === p ? 'var(--accent)' : 'var(--border-default)',
                            color:       config?.personalityTheme === p ? 'var(--text-inverse)' : 'var(--text-secondary)',
                          }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── Backup tab ── */}
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
