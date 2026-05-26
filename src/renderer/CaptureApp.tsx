import { useState, useEffect } from 'react';

export default function CaptureApp() {
  const [folders, setFolders]   = useState<string[]>(['Notes']);
  const [folder, setFolder]     = useState('Notes');
  const [title, setTitle]       = useState('');
  const [text, setText]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    async function init() {
      const cfg = await window.ghostvault.getConfig();
      // Apply theme
      const theme = cfg.theme as { core?: string; personality?: string } | undefined;
      if (theme?.core) document.documentElement.setAttribute('data-core', theme.core);
      if (theme?.personality) document.documentElement.setAttribute('data-personality', theme.personality);

      // Load vault folders
      if (cfg.vaultPath) {
        const { folders: f } = await window.ghostvault.loadVault(cfg.vaultPath);
        if (f.length > 0) { setFolders(f); setFolder(f[0]); }
      }
    }
    init();

    // Listen for theme changes
    const unsub = window.ghostvault.onThemeChange((t) => {
      document.documentElement.setAttribute('data-core', t.core);
      document.documentElement.setAttribute('data-personality', t.personality);
    });

    // Close on Escape
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') window.ghostvault.closeCapture();
    }
    window.addEventListener('keydown', onKey);
    return () => { unsub(); window.removeEventListener('keydown', onKey); };
  }, []);

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const result = await window.ghostvault.saveCaptureNote({ folder, title, text });
      if (result.ok) {
        setSaved(true);
        setTimeout(() => window.ghostvault.closeCapture(), 800);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Titlebar */}
      <div className="drag-region flex items-center gap-2 px-3 py-2 border-b"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)', height: 40 }}>
        <button className="no-drag w-3 h-3 rounded-full bg-[#ff5f57] hover:opacity-80 transition-opacity"
          onClick={() => window.ghostvault.closeCapture()} />
        <div className="w-3 h-3 rounded-full bg-[#febc2e] opacity-40" />
        <div className="w-3 h-3 rounded-full bg-[#28c840] opacity-40" />
        <div className="flex-1 text-center text-xs font-medium" style={{ color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
          QUICK CAPTURE
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex gap-2">
          <select value={folder} onChange={e => setFolder(e.target.value)}
            className="no-drag flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {folders.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="no-drag flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.metaKey && e.key === 'Enter') handleSave(); }}
          placeholder="Start typing… (⌘↵ to save)"
          autoFocus
          className="no-drag w-full px-3 py-2.5 rounded-lg text-sm font-mono resize-none outline-none"
          style={{
            background: 'var(--bg3)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            lineHeight: '1.7',
            minHeight: 180,
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t"
        style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
        <button onClick={() => window.ghostvault.closeCapture()}
          className="no-drag text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          Cancel
        </button>
        <button onClick={handleSave}
          disabled={!text.trim() || saving}
          className="no-drag text-xs px-5 py-1.5 rounded-lg font-medium disabled:opacity-40 transition-all"
          style={{ background: saved ? '#22c55e' : 'var(--accent)', color: '#fff' }}>
          {saved ? '✓ Saved' : saving ? 'Saving…' : '⚡ Capture'}
        </button>
      </div>
    </div>
  );
}
