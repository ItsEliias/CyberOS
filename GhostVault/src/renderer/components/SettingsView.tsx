import { useState, useEffect } from 'react';
import { useStore } from '../store';
import HelpTip from './ui/HelpTip';
import type { CoreTheme, PersonalityTheme, AiCtx } from '@shared/types';

const CORES:         CoreTheme[]        = ['stealth', 'graphite', 'frost', 'oled'];
const PERSONALITIES: PersonalityTheme[] = ['neutral', 'cyberpunk', 'terminal', 'threat'];

interface Props {
  ollamaModels: string[];
  onOllamaRefresh: () => void;
}

export default function SettingsView({ ollamaModels, onOllamaRefresh }: Props) {
  const {
    config, vaultPath, alwaysOnTop, ollamaStatus, aiCtx, ollamaModel,
    setAlwaysOnTop, setAiCtx, setOllamaModel, version
  } = useStore();

  const [captureHotkey, setCaptureHotkey]       = useState('CommandOrControl+Shift+G');
  const [hotkeyRecording, setHotkeyRecording]   = useState(false);
  const [hotkeyError, setHotkeyError]           = useState<string | null>(null);
  const [hotkeySuccess, setHotkeySuccess]       = useState(false);
  const [academicMode, setAcademicMode]         = useState(false);
  const [academicAuthor, setAcademicAuthor]     = useState('');

  useEffect(() => {
    window.ghostvault.getCaptureHotkey().then(setCaptureHotkey);
    window.ghostvault.getConfig().then(cfg => {
      setAcademicMode(!!cfg.academicMode);
      setAcademicAuthor(cfg.academicAuthor || '');
    });
  }, []);

  const core        = (config?.theme as { core?: CoreTheme })?.core        || 'stealth';
  const personality = (config?.theme as { personality?: PersonalityTheme })?.personality || 'neutral';

  function applyTheme(c: CoreTheme, p: PersonalityTheme) {
    document.documentElement.setAttribute('data-core', c);
    document.documentElement.setAttribute('data-personality', p);
    window.ghostvault.saveConfig({ theme: { core: c, personality: p } });
  }

  async function toggleAot() {
    const next = !alwaysOnTop;
    await window.ghostvault.setAlwaysOnTop(next);
    setAlwaysOnTop(next);
  }

  function setAutosave(val: boolean) {
    window.ghostvault.saveConfig({ autosave: val });
  }

  function handleHotkeyKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!hotkeyRecording) return;
    e.preventDefault();
    e.stopPropagation();
    if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) return;

    const parts: string[] = [];
    if (e.metaKey || e.ctrlKey) parts.push('CommandOrControl');
    if (e.altKey)   parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    const key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
    parts.push(key);
    const combo = parts.join('+');
    setCaptureHotkey(combo);
    setHotkeyRecording(false);
  }

  async function saveHotkey() {
    setHotkeyError(null);
    setHotkeySuccess(false);
    const result = await window.ghostvault.setCaptureHotkey(captureHotkey);
    if (result.ok) {
      setHotkeySuccess(true);
      setTimeout(() => setHotkeySuccess(false), 2000);
    } else {
      setHotkeyError(result.error || 'Failed to register hotkey');
    }
  }

  async function changeVault() {
    const p = await window.ghostvault.pickVaultDir();
    if (p) {
      await window.ghostvault.saveConfig({ vaultPath: p });
      window.location.reload();
    }
  }

  async function toggleAcademicMode(enabled: boolean) {
    setAcademicMode(enabled);
    await window.ghostvault.saveConfig({ academicMode: enabled });
    if (enabled && vaultPath) {
      const weekFolders = ['Week 01', 'Week 02', 'Week 03', 'Week 04'];
      await window.ghostvault.createFolder(vaultPath, 'Courses');
      for (const w of weekFolders) {
        await window.ghostvault.createFolder(vaultPath, `Courses/Labs/${w}`);
      }
    }
  }

  async function saveAcademicAuthor(value: string) {
    setAcademicAuthor(value);
    await window.ghostvault.saveConfig({ academicAuthor: value });
  }

  async function createLabReport() {
    if (!vaultPath || !academicMode) return;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const weekNum = Math.ceil(now.getDate() / 7).toString().padStart(2, '0');
    const folder = `Courses/Labs/Week ${weekNum}`;
    const title = `Lab Report — ${dateStr}`;
    const content = `---\ntitle: ${title}\ndate: ${dateStr}\nauthor: ${academicAuthor || 'Student'}\n---\n\n# ${title}\n\n## Objective\n\n\n## Methodology\n\n\n## Results\n\n\n## Discussion\n\n\n## Conclusion\n\n`;
    await window.ghostvault.createFolder(vaultPath, folder);
    await window.ghostvault.newNote(vaultPath, folder, title);
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8 max-w-2xl mx-auto w-full"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
      <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>Settings</div>

      {/* Vault */}
      <section>
        <h3 className="text-[10px] uppercase tracking-widest font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
          Vault
          <HelpTip body="The on-disk folder that stores every note. Change Vault opens a picker to point GhostVault at a different directory; the app reloads after switching." />
        </h3>
        <div className="space-y-2">
          <div className="px-3 py-2.5 rounded-lg border text-sm font-mono truncate"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            {vaultPath || 'No vault configured'}
          </div>
          <button onClick={changeVault}
            className="text-sm px-4 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            Change Vault…
          </button>
        </div>
      </section>

      {/* Capture Hotkey */}
      <section>
        <h3 className="text-[10px] uppercase tracking-widest font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
          Capture Hotkey
          <HelpTip body="Global keyboard shortcut that opens the Quick Capture window from anywhere in your OS. Click the field, press a combo, then Save." />
        </h3>
        <div className="space-y-2">
          <div className="text-[11px] mb-1" style={{ color: 'var(--text-dim)' }}>
            Global shortcut to open the capture window from any app.
          </div>
          <div className="flex gap-2 items-center">
            <input
              readOnly
              value={hotkeyRecording ? 'Press a key combination…' : captureHotkey}
              onKeyDown={handleHotkeyKeyDown}
              onBlur={() => setHotkeyRecording(false)}
              onClick={() => { setHotkeyRecording(true); setHotkeyError(null); }}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-mono outline-none cursor-pointer"
              style={{
                background  : hotkeyRecording ? 'var(--bg2)' : 'var(--bg3)',
                border      : `1px solid ${hotkeyRecording ? 'var(--accent)' : 'var(--border)'}`,
                color       : hotkeyRecording ? 'var(--text-dim)' : 'var(--text)',
              }}
            />
            <button
              onClick={saveHotkey}
              className="text-sm px-3 py-2 rounded-lg border transition-colors hover:bg-white/5"
              style={{
                borderColor : hotkeySuccess ? 'var(--success,#22c55e)' : 'var(--border)',
                color       : hotkeySuccess ? '#22c55e' : 'var(--text-muted)',
              }}>
              {hotkeySuccess ? 'Saved' : 'Save'}
            </button>
          </div>
          {hotkeyError && (
            <div className="text-[11px]" style={{ color: 'var(--error,#f85149)' }}>{hotkeyError}</div>
          )}
          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Click the field then press your key combination to record it.
          </div>
        </div>
      </section>

      {/* Theme */}
      <section>
        <h3 className="text-[10px] uppercase tracking-widest font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
          Theme
          <HelpTip body="Visual mode pairs: a Core surface palette (stealth, graphite, frost, oled) plus a Personality accent (neutral, cyberpunk, terminal, threat). Changes apply instantly." />
        </h3>
        <div className="space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>Core</div>
            <div className="grid grid-cols-4 gap-2">
              {CORES.map(c => (
                <button key={c}
                  onClick={() => applyTheme(c, personality as PersonalityTheme)}
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
            <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>Personality</div>
            <div className="grid grid-cols-4 gap-2">
              {PERSONALITIES.map(p => (
                <button key={p}
                  onClick={() => applyTheme(core as CoreTheme, p)}
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
        </div>
      </section>

      {/* Editor */}
      <section>
        <h3 className="text-[10px] uppercase tracking-widest font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
          Editor
          <HelpTip body="Editor behaviour toggles. Autosave writes 2s after you stop typing; Always on Top pins the window above other apps for quick reference." />
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked={config?.autosave !== false}
              onChange={e => setAutosave(e.target.checked)} className="w-4 h-4" />
            <div>
              <div className="text-sm" style={{ color: 'var(--text)' }}>Autosave</div>
              <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>Auto-save 2s after you stop typing</div>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={alwaysOnTop} onChange={toggleAot} className="w-4 h-4" />
            <div>
              <div className="text-sm" style={{ color: 'var(--text)' }}>Always on Top</div>
              <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>Keep GhostVault above other windows</div>
            </div>
          </label>
        </div>
      </section>

      {/* AI */}
      <section>
        <h3 className="text-[10px] uppercase tracking-widest font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
          AI
          <HelpTip body="Pick the Ollama model used by the AI Assistant and the inline / commands, plus a context bias (work, cyber, personal) that primes the assistant's tone." />
        </h3>
        <div className="space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>Context Mode</div>
            <div className="flex gap-2">
              {(['work', 'cyber', 'personal'] as AiCtx[]).map(ctx => (
                <button key={ctx}
                  onClick={() => { setAiCtx(ctx); window.ghostvault.saveConfig({ aiCtx: ctx }); }}
                  className="flex-1 py-1.5 rounded-lg text-xs capitalize font-medium border transition-all"
                  style={{
                    background  : aiCtx === ctx ? 'var(--accent)' : 'var(--bg3)',
                    borderColor : aiCtx === ctx ? 'var(--accent)' : 'var(--border)',
                    color       : aiCtx === ctx ? '#fff' : 'var(--text-muted)'
                  }}>
                  {ctx}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                Ollama — {ollamaStatus?.running ? (
                  <span style={{ color: '#3fb950' }}>● Running</span>
                ) : (
                  <span style={{ color: '#8b949e' }}>● Offline</span>
                )}
              </div>
              <button onClick={onOllamaRefresh}
                className="text-[10px] px-2 py-0.5 rounded border transition-colors hover:bg-white/5"
                style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
                Refresh
              </button>
            </div>
            {ollamaModels.length > 0 && (
              <select value={ollamaModel}
                onChange={e => { setOllamaModel(e.target.value); window.ghostvault.saveConfig({ ollamaModel: e.target.value }); }}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                {ollamaModels.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>
        </div>
      </section>

      {/* Academic Mode */}
      <section>
        <h3 className="text-[10px] uppercase tracking-widest font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
          Academic Mode
          <HelpTip body="Coursework workflow: scaffolds Courses / Labs / Week XX folders and gives you a one-click new Lab Report stub stamped with today's date and your author name." />
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={academicMode}
              onChange={e => toggleAcademicMode(e.target.checked)} className="w-4 h-4" />
            <div>
              <div className="text-sm" style={{ color: 'var(--text)' }}>Enable Academic Mode</div>
              <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                Creates Courses/Labs/Week XX folder structure. Adds quick lab report creation.
              </div>
            </div>
          </label>
          {academicMode && (
            <>
              <div>
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Author Name</div>
                <input
                  value={academicAuthor}
                  onChange={e => saveAcademicAuthor(e.target.value)}
                  placeholder="Your name for lab report front matter"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
              <button
                onClick={createLabReport}
                className="text-sm px-4 py-2 rounded-lg font-medium"
                style={{ background: '#7bb8ff', color: '#0a0a0f' }}
              >
                + New Lab Report
              </button>
            </>
          )}
        </div>
      </section>

      {/* About */}
      <section>
        <h3 className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--text-dim)' }}>About</h3>
        <div className="text-sm space-y-1" style={{ color: 'var(--text-muted)' }}>
          <div>GhostVault <span style={{ color: 'var(--text-dim)' }}>v{version}</span></div>
          <div>ItsEliias // CYBERTOOLS Ecosystem</div>
        </div>
      </section>
    </div>
  );
}
