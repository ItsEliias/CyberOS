import { useStore } from '../store';
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

  async function changeVault() {
    const p = await window.ghostvault.pickVaultDir();
    if (p) {
      await window.ghostvault.saveConfig({ vaultPath: p });
      window.location.reload();
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-8 max-w-2xl mx-auto w-full"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
      <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>Settings</div>

      {/* Vault */}
      <section>
        <h3 className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--text-dim)' }}>Vault</h3>
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

      {/* Theme */}
      <section>
        <h3 className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--text-dim)' }}>Theme</h3>
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
        <h3 className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--text-dim)' }}>Editor</h3>
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
        <h3 className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--text-dim)' }}>AI</h3>
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
