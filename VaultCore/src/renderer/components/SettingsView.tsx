import { useState } from 'react';
import { useStore } from '../store';
import type { CoreTheme, PersonalityTheme } from '@shared/types';
import HelpTip from './ui/Tooltip';

const SECTION_HELP: Record<string, string> = {
  Vault: 'Where scraped notes land. Point VaultCore at your Obsidian vault and it will detect installed plugins.',
  Theme: 'Visual presets. Core sets the base palette, Personality layers a color accent.',
  Behaviour: 'How the app handles tray minimization, notifications, sounds, and background scrapes.',
  About: 'App version and update checks.',
  'Danger Zone': 'Destructive operations like factory reset. Cannot be undone.',
};

const CORES: CoreTheme[]                = ['stealth', 'graphite', 'frost', 'oled'];
const PERSONALITIES: PersonalityTheme[] = ['neutral', 'cyberpunk', 'terminal', 'threat'];

function applyTheme(core: CoreTheme, personality: PersonalityTheme) {
  document.documentElement.setAttribute('data-core', core);
  document.documentElement.setAttribute('data-personality', personality);
}

export default function SettingsView() {
  const { config, vaultPath, version, theme, plugins,
    setConfig, setVaultPath, setTheme, setPlugins } = useStore();

  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const [detectingPlugins, setDP]       = useState(false);
  const [resetting, setResetting]       = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [updateMsg, setUpdateMsg]       = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const cfg = config ?? {};

  async function changeVault() {
    const p = await window.electronAPI.selectFolder();
    if (!p) return;
    await window.electronAPI.setVaultPath(p);
    setVaultPath(p);
  }

  async function changeCore(core: CoreTheme) {
    const next = { ...theme, core };
    setTheme(next);
    applyTheme(core, theme.personality as PersonalityTheme);
    await window.electronAPI.setTheme(next);
  }

  async function changePersonality(p: PersonalityTheme) {
    const next = { ...theme, personality: p };
    setTheme(next);
    applyTheme(theme.core as CoreTheme, p);
    await window.electronAPI.setTheme(next);
  }

  async function saveSetting(key: string, value: unknown) {
    setSaving(true);
    await window.electronAPI.setConfig(key, value);
    setConfig({ ...cfg, [key]: value });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function detectPlugins() {
    setDP(true);
    const list = await window.electronAPI.detectObsidianPlugins();
    setPlugins(list);
    setDP(false);
  }

  async function doFactoryReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      // Auto-clear the armed state if the user walks away without confirming
      // — otherwise the "Click again to confirm" prompt is a permanent landmine.
      setTimeout(() => setConfirmReset(false), 5000);
      return;
    }
    setResetting(true);
    await window.electronAPI.factoryReset();
    window.location.reload();
  }

  async function openVaultFolder() {
    if (vaultPath) await window.electronAPI.openFolder(vaultPath);
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">

        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Settings</div>
          {saved && <span className="text-xs" style={{ color: '#3fb950' }}>Saved ✓</span>}
        </div>

        {/* Vault */}
        <Section title="Vault">
          <Row label="Obsidian Vault Path" description="Where scraped content is saved as markdown notes">
            <div className="flex items-center gap-2">
              <span className="flex-1 text-xs font-mono truncate px-3 py-2 rounded-lg border"
                style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--text-muted)' }}>
                {vaultPath ?? 'Not configured'}
              </span>
              <button onClick={changeVault}
                className="px-3 py-2 rounded-lg text-xs border transition-all hover:bg-white/5 shrink-0"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                Change…
              </button>
              {vaultPath && (
                <button onClick={openVaultFolder}
                  className="px-3 py-2 rounded-lg text-xs border transition-all hover:bg-white/5 shrink-0"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  Open
                </button>
              )}
            </div>
          </Row>
          {vaultPath && (
            <Row label="Obsidian Plugins" description="Detected plugins in the vault">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex flex-wrap gap-1">
                  {plugins.length > 0
                    ? plugins.map(p => (
                      <span key={p} className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--bg3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        {p}
                      </span>
                    ))
                    : <span className="text-xs" style={{ color: 'var(--text-dim)' }}>None detected</span>
                  }
                </div>
                <button onClick={detectPlugins} disabled={detectingPlugins}
                  className="px-3 py-1.5 text-xs border rounded-lg transition-all hover:bg-white/5 disabled:opacity-40 shrink-0"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  {detectingPlugins ? 'Detecting…' : 'Detect'}
                </button>
              </div>
            </Row>
          )}
        </Section>

        {/* Theme */}
        <Section title="Theme">
          <Row label="Core" description="Base color palette">
            <div className="flex gap-2">
              {CORES.map(c => (
                <button key={c} onClick={() => changeCore(c)}
                  className="px-3 py-1.5 rounded-lg text-xs capitalize border font-medium transition-all"
                  style={{
                    background  : theme.core === c ? 'var(--accent)' : 'transparent',
                    borderColor : theme.core === c ? 'var(--accent)' : 'var(--border)',
                    color       : theme.core === c ? '#fff' : 'var(--text-muted)',
                  }}>
                  {c}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Personality" description="Accent color overlay">
            <div className="flex gap-2">
              {PERSONALITIES.map(p => (
                <button key={p} onClick={() => changePersonality(p)}
                  className="px-3 py-1.5 rounded-lg text-xs capitalize border font-medium transition-all"
                  style={{
                    background  : theme.personality === p ? 'var(--accent)' : 'transparent',
                    borderColor : theme.personality === p ? 'var(--accent)' : 'var(--border)',
                    color       : theme.personality === p ? '#fff' : 'var(--text-muted)',
                  }}>
                  {p}
                </button>
              ))}
            </div>
          </Row>
        </Section>

        {/* Behaviour */}
        <Section title="Behaviour">
          <Row label="Minimize to Tray" description="Keep VaultCore running in the system tray when closed">
            <Toggle
              checked={!!(cfg.minimiseToTray)}
              onChange={v => saveSetting('minimiseToTray', v)} />
          </Row>
          <Row label="Notifications" description="System notifications on scrape completion">
            <Toggle
              checked={cfg.notifications !== false}
              onChange={v => saveSetting('notifications', v)} />
          </Row>
          <Row label="Sound Effects" description="Audio feedback on scrape events">
            <Toggle
              checked={!!(cfg.soundEnabled)}
              onChange={v => saveSetting('soundEnabled', v)} />
          </Row>
        </Section>

        {/* About */}
        <Section title="About">
          <Row label="Version" description="">
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              VaultCore v{version || '1.0.0'}
            </span>
          </Row>
          <Row label="Check for Updates" description="">
            <div className="flex items-center gap-2">
              {updateMsg && (
                <span
                  className="text-[11px] font-mono"
                  style={{ color: updateMsg.startsWith('Update') ? '#a371f7' : 'var(--text-muted)' }}>
                  {updateMsg}
                </span>
              )}
              <button
                disabled={checkingUpdate}
                onClick={async () => {
                  setCheckingUpdate(true);
                  setUpdateMsg(null);
                  try {
                    const info = await window.electronAPI.checkForUpdates();
                    const msg = info.hasUpdate ? `Update available: v${info.version}` : 'You\'re up to date';
                    setUpdateMsg(msg);
                    setTimeout(() => setUpdateMsg(null), 5000);
                  } catch (err) {
                    setUpdateMsg('Check failed');
                    setTimeout(() => setUpdateMsg(null), 5000);
                  } finally {
                    setCheckingUpdate(false);
                  }
                }}
                className="px-3 py-1.5 rounded-lg text-xs border transition-all hover:bg-white/5 disabled:opacity-40"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                {checkingUpdate ? 'Checking…' : 'Check Now'}
              </button>
            </div>
          </Row>
        </Section>

        {/* Danger zone */}
        <Section title="Danger Zone">
          <Row label="Factory Reset" description="Erase all settings and source library data">
            <button
              onClick={doFactoryReset}
              disabled={resetting}
              className="px-3 py-1.5 rounded-lg text-xs border transition-all disabled:opacity-40"
              style={{
                borderColor : confirmReset ? '#f85149' : 'var(--border)',
                color       : confirmReset ? '#f85149' : 'var(--text-muted)',
                background  : confirmReset ? 'rgba(248,81,73,0.1)' : 'transparent',
              }}>
              {resetting ? 'Resetting…' : confirmReset ? 'Click again to confirm' : 'Factory Reset'}
            </button>
          </Row>
        </Section>

      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const help = SECTION_HELP[title];
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 pb-1 border-b"
        style={{ borderColor: 'var(--border)' }}>
        <div className="text-[10px] uppercase tracking-wider"
          style={{ color: 'var(--accent)' }}>
          {title}
        </div>
        {help && <HelpTip text={help} side="right" />}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Row({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="shrink-0 pt-0.5" style={{ minWidth: 160 }}>
        <div className="text-sm" style={{ color: 'var(--text)' }}>{label}</div>
        {description && <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{description}</div>}
      </div>
      <div className="flex-1 max-w-xs">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
      style={{ background: checked ? 'var(--accent)' : 'var(--border)' }}>
      <span
        className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }} />
    </button>
  );
}
