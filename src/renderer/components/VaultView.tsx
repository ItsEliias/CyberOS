import { useStore } from '../store';

export default function VaultView() {
  const { vaultPath, notes, folders } = useStore();

  async function changeVault() {
    const p = await window.ghostvault.pickVaultDir();
    if (p) {
      await window.ghostvault.saveConfig({ vaultPath: p });
      window.location.reload();
    }
  }

  function revealInFinder() {
    if (vaultPath) window.ghostvault.revealInFinder(vaultPath);
  }

  return (
    <div className="flex flex-col h-full p-6 gap-6 max-w-2xl mx-auto w-full">
      <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>Vault</div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Notes',   value: notes.length },
          { label: 'Folders', value: folders.length },
          { label: 'Pinned',  value: useStore.getState().pinnedPaths.size },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 border text-center"
            style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
            <div className="text-2xl font-bold font-mono" style={{ color: 'var(--accent)' }}>{s.value}</div>
            <div className="text-[11px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-dim)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Vault path */}
      <div>
        <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>Vault Location</div>
        <div className="px-3 py-2.5 rounded-lg border text-sm font-mono truncate"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          {vaultPath || 'No vault configured'}
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={revealInFinder}
            disabled={!vaultPath}
            className="text-sm px-4 py-1.5 rounded-lg border transition-colors hover:bg-white/5 disabled:opacity-40"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            Reveal in Finder
          </button>
          <button onClick={changeVault}
            className="text-sm px-4 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            Change Vault…
          </button>
        </div>
      </div>

      {/* Folder list */}
      {folders.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>Folders</div>
          <div className="flex flex-wrap gap-2">
            {folders.map(f => (
              <div key={f} className="px-3 py-1.5 rounded-lg text-xs border"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                📁 {f} <span style={{ color: 'var(--text-dim)' }}>
                  ({useStore.getState().notes.filter(n => n.folder === f).length})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
