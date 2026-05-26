import { useState } from 'react';
import { useStore } from '../store';
import type { AppConfig } from '@shared/types';
import type { ThemeId } from '@shared/types';
import { THEMES } from '../lib/themes';

export default function SettingsPanel() {
  const { config, setConfig, setTheme, theme } = useStore();
  const [form, setForm] = useState<Partial<AppConfig>>(config || {});
  const [newApiKey, setNewApiKey] = useState('');
  const [testingKey, setTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'idle'|'ok'|'fail'>('idle');
  const [saved, setSaved] = useState(false);

  async function save() {
    const updated = { ...config, ...form } as AppConfig;
    await window.electronAPI.saveConfig(updated);
    setConfig(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function testKey() {
    if (!newApiKey.trim()) return;
    setTestingKey(true);
    try {
      const ok = await window.electronAPI.testApiKey(newApiKey.trim());
      if (ok) {
        await window.electronAPI.saveApiKey(newApiKey.trim());
        setKeyStatus('ok');
      } else {
        setKeyStatus('fail');
      }
    } catch {
      setKeyStatus('fail');
    } finally {
      setTestingKey(false);
      setTimeout(() => setKeyStatus('idle'), 3000);
    }
  }

  async function pickOutputDir() {
    const path = await window.electronAPI.pickFolder();
    if (path) setForm(f => ({ ...f, outputDir: path }));
  }

  async function pickVault() {
    const path = await window.electronAPI.pickFolder();
    if (path) setForm(f => ({ ...f, obsidianVault: path }));
  }

  const THEME_IDS = Object.keys(THEMES) as ThemeId[];

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4">
      <div className="max-w-xl mx-auto w-full space-y-6">
        <h2 className="text-sm font-semibold text-[var(--text)]">Settings</h2>

        {/* Theme */}
        <section className="card space-y-3">
          <div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wide">Theme</div>
          <div className="flex gap-2 flex-wrap">
            {THEME_IDS.map(t => (
              <button
                key={t}
                className={`flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors ${
                  theme === t ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent-dim)]' : 'btn-ghost'
                }`}
                onClick={() => setTheme(t)}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: THEMES[t].dot }} />
                {THEMES[t].name}
              </button>
            ))}
          </div>
        </section>

        {/* Identity */}
        <section className="card space-y-3">
          <div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wide">Identity</div>
          <div className="input-group">
            <label>Operator Name</label>
            <input
              type="text"
              value={form.operatorName || ''}
              onChange={e => setForm(f => ({ ...f, operatorName: e.target.value }))}
              className="w-full"
              placeholder="ItsEliias"
            />
          </div>
        </section>

        {/* Storage */}
        <section className="card space-y-3">
          <div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wide">Storage</div>
          <div className="input-group">
            <label>Obsidian Vault Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.obsidianVault || ''}
                onChange={e => setForm(f => ({ ...f, obsidianVault: e.target.value }))}
                className="flex-1 text-xs"
                placeholder="/path/to/vault"
              />
              <button className="btn-ghost px-3 py-1.5 text-xs" onClick={pickVault}>Browse</button>
            </div>
          </div>
          <div className="input-group">
            <label>Output Directory</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.outputDir || ''}
                onChange={e => setForm(f => ({ ...f, outputDir: e.target.value }))}
                className="flex-1 text-xs"
                placeholder="/path/to/output"
              />
              <button className="btn-ghost px-3 py-1.5 text-xs" onClick={pickOutputDir}>Browse</button>
            </div>
          </div>
        </section>

        {/* API Key */}
        <section className="card space-y-3">
          <div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wide">Claude API Key</div>
          <p className="text-xs text-[var(--text-muted)]">Update your Anthropic API key. The current key is encrypted.</p>
          <div className="flex gap-2">
            <input
              type="password"
              value={newApiKey}
              onChange={e => setNewApiKey(e.target.value)}
              className="flex-1 font-mono text-xs"
              placeholder="sk-ant-api03-..."
            />
            <button
              className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                keyStatus === 'ok' ? 'border-[var(--success)] text-[var(--success)] bg-transparent' :
                keyStatus === 'fail' ? 'border-[var(--error)] text-[var(--error)] bg-transparent' :
                'btn-accent'
              }`}
              onClick={testKey}
              disabled={testingKey || !newApiKey.trim()}
            >
              {testingKey ? 'Testing...' : keyStatus === 'ok' ? 'Saved ✓' : keyStatus === 'fail' ? 'Failed ✗' : 'Test & Save'}
            </button>
          </div>
        </section>

        {/* Preferences */}
        <section className="card space-y-3">
          <div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wide">Preferences</div>
          {[
            { key: 'autosaveEnabled', label: 'Auto-save sessions (every 60s)' },
            { key: 'vpnCheckEnabled', label: 'VPN status checking' },
            { key: 'soundEnabled', label: 'Sound effects' },
          ].map(pref => (
            <label key={pref.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!(form as Record<string,unknown>)[pref.key]}
                onChange={e => setForm(f => ({ ...f, [pref.key]: e.target.checked }))}
              />
              <span className="text-sm text-[var(--text-dim)]">{pref.label}</span>
            </label>
          ))}
          <div className="input-group">
            <label>Font Size</label>
            <select
              value={form.fontSize || 'medium'}
              onChange={e => setForm(f => ({ ...f, fontSize: e.target.value as 'small'|'medium'|'large' }))}
              className="w-full"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </section>

        <button className="btn-accent w-full py-2.5" onClick={save}>
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
