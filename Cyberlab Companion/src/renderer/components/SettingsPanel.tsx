import { useState, useEffect } from 'react';
import { useStore } from '../store';
import type { AppConfig, BgThemeId, AccentThemeId } from '@shared/types';
import { BG_THEMES, ACCENT_THEMES } from '../lib/themes';

export default function SettingsPanel() {
  const { config, setConfig, setBgTheme, setAccentTheme, bgTheme, accentTheme } = useStore();
  const [form, setForm] = useState<Partial<AppConfig>>(config || {});
  const [newApiKey, setNewApiKey] = useState('');
  const [testingKey, setTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'idle'|'ok'|'fail'>('idle');
  const [saved, setSaved] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<'unknown'|'ok'|'error'>('unknown');
  const [loadingOllamaModels, setLoadingOllamaModels] = useState(false);

  const aiProvider = form.aiProvider || 'claude';

  useEffect(() => {
    if (aiProvider === 'ollama') refreshOllamaModels();
  }, [aiProvider]);

  async function refreshOllamaModels() {
    setLoadingOllamaModels(true);
    try {
      const res = await (window.electronAPI as Record<string, Function>).ollamaListModels(form.ollamaEndpoint) as { success: boolean; models: string[]; error?: string };
      if (res.success) {
        setOllamaModels(res.models);
        setOllamaStatus('ok');
      } else {
        setOllamaStatus('error');
        setOllamaModels([]);
      }
    } catch {
      setOllamaStatus('error');
    } finally {
      setLoadingOllamaModels(false);
    }
  }

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
      const result = await window.electronAPI.testApiKey(newApiKey.trim()) as { success: boolean; error?: string; warning?: string };
      if (result?.success) {
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

  const BG_IDS     = Object.keys(BG_THEMES)     as BgThemeId[];
  const ACCENT_IDS = Object.keys(ACCENT_THEMES) as AccentThemeId[];

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4">
      <div className="max-w-xl mx-auto w-full space-y-6">
        <h2 className="text-sm font-semibold text-[var(--text)]">Settings</h2>

        {/* Theme — Background */}
        <section className="card space-y-3">
          <div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wide">Background</div>
          <div className="flex gap-2 flex-wrap">
            {BG_IDS.map(id => (
              <button
                key={id}
                className={`flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors ${
                  bgTheme === id ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent-dim)]' : 'btn-ghost'
                }`}
                onClick={() => setBgTheme(id)}
              >
                <div className="w-2.5 h-2.5 rounded-full border border-[var(--border)]" style={{ background: BG_THEMES[id].dot }} />
                {BG_THEMES[id].name}
              </button>
            ))}
          </div>
        </section>

        {/* Theme — Colour / Accent */}
        <section className="card space-y-3">
          <div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wide">Colour</div>
          <div className="flex gap-2 flex-wrap">
            {ACCENT_IDS.map(id => (
              <button
                key={id}
                className={`flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors ${
                  accentTheme === id ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent-dim)]' : 'btn-ghost'
                }`}
                onClick={() => setAccentTheme(id)}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: ACCENT_THEMES[id].dot }} />
                {ACCENT_THEMES[id].name}
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

        {/* AI Provider */}
        <section className="card space-y-3">
          <div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wide">AI Provider</div>
          <div className="flex gap-2">
            {(['claude', 'ollama'] as const).map(p => (
              <button
                key={p}
                className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                  aiProvider === p ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent-dim)]' : 'btn-ghost'
                }`}
                onClick={() => setForm(f => ({ ...f, aiProvider: p }))}
              >
                {p === 'claude' ? 'Claude API' : 'Ollama (Local)'}
              </button>
            ))}
          </div>
          {aiProvider === 'claude' && (
            <div className="space-y-3">
              <div className="input-group">
                <label>Claude Model</label>
                <select
                  value={form.claudeModel || 'claude-sonnet-4-6'}
                  onChange={e => setForm(f => ({ ...f, claudeModel: e.target.value }))}
                  className="w-full text-xs"
                >
                  <option value="claude-haiku-4-5-20251001">Haiku 4.5 — Fast / cheap</option>
                  <option value="claude-sonnet-4-6">Sonnet 4.6 — Balanced (default)</option>
                  <option value="claude-opus-4-7">Opus 4.7 — Best / slow</option>
                </select>
              </div>
              <div className="text-xs text-[var(--text-muted)]">Update your Anthropic API key. The current key is encrypted.</div>
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
            </div>
          )}
          {aiProvider === 'ollama' && (
            <div className="space-y-3">
              <div className="input-group">
                <label>Ollama Endpoint</label>
                <input
                  type="text"
                  value={form.ollamaEndpoint || 'http://localhost:11434'}
                  onChange={e => setForm(f => ({ ...f, ollamaEndpoint: e.target.value }))}
                  className="w-full font-mono text-xs"
                  placeholder="http://localhost:11434"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ollamaStatus === 'ok' ? 'bg-[var(--success)]' : ollamaStatus === 'error' ? 'bg-[var(--error)]' : 'bg-[var(--text-muted)]'}`} />
                <span className="text-xs text-[var(--text-muted)]">
                  {ollamaStatus === 'ok' ? 'Ollama reachable' : ollamaStatus === 'error' ? 'Ollama not running' : 'Unknown'}
                </span>
                <button className="btn-ghost px-2 py-1 text-xs ml-auto" onClick={refreshOllamaModels} disabled={loadingOllamaModels}>
                  {loadingOllamaModels ? '...' : 'Refresh'}
                </button>
              </div>
              <div className="input-group">
                <label>Model</label>
                <select
                  value={form.ollamaModel || ''}
                  onChange={e => setForm(f => ({ ...f, ollamaModel: e.target.value }))}
                  className="w-full text-xs"
                >
                  <option value="">Select a model...</option>
                  {ollamaModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {ollamaStatus === 'error' && (
                <p className="text-xs" style={{ color: 'var(--error)' }}>Start Ollama with: <code className="font-mono">ollama serve</code></p>
              )}
            </div>
          )}
        </section>

        {/* Integrations: HTB + THM */}
        <section className="card space-y-3">
          <div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wide">Integrations</div>
          <div className="input-group">
            <label>HTB API Key</label>
            <input
              type="password"
              value={form.htbApiKey || ''}
              onChange={e => setForm(f => ({ ...f, htbApiKey: e.target.value }))}
              className="w-full font-mono text-xs"
              placeholder="eyJ0eXAi... (from hackthebox.com/profile)"
            />
            <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Used for HTB Machine lookup in New Session and the HTB Progress dashboard
            </div>
          </div>
          <div className="input-group">
            <label>THM Username</label>
            <input
              type="text"
              value={form.thmUsername || ''}
              onChange={e => setForm(f => ({ ...f, thmUsername: e.target.value }))}
              className="w-full font-mono text-xs"
              placeholder="your-thm-username"
            />
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
