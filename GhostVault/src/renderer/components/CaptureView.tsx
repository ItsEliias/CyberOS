import { useState } from 'react';
import { useStore } from '../store';
import HelpTip from './ui/HelpTip';

interface Props {
  onSaved: () => void;
}

export default function CaptureView({ onSaved }: Props) {
  const { folders, vaultPath } = useStore();
  const [folder, setFolder] = useState(folders[0] || 'Notes');
  const [title, setTitle]   = useState('');
  const [text, setText]     = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const result = await window.ghostvault.saveCaptureNote({ folder, title, text });
      if (result.ok) {
        setTitle('');
        setText('');
        onSaved();
      } else {
        // Without this, a failed save (no vault, perms, disk full) left
        // the textarea full of unsaved text and no signal to the user.
        setSaveError(result.error || 'Failed to save');
        setTimeout(() => setSaveError(null), 6000);
      }
    } catch (e) {
      setSaveError((e as Error).message || 'Failed to save');
      setTimeout(() => setSaveError(null), 6000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full p-6 gap-4 max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-2">
        <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>Quick Capture</div>
        <HelpTip
          title="Quick Capture"
          body="Drop a fast note into your vault without opening the full editor. Pick a folder, optionally name it, type, then press Capture — also triggered by your global hotkey from anywhere."
        />
      </div>

      {!vaultPath && (
        <div className="p-4 rounded-lg border text-sm" style={{ borderColor: 'var(--warning, #d29922)', color: 'var(--warning, #d29922)', background: 'rgba(210,153,34,.08)' }}>
          No vault configured. Set up a vault in Settings first.
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-dim)' }}>Folder</label>
          <select value={folder} onChange={e => setFolder(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {folders.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-dim)' }}>Title (optional)</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Leave blank for auto-title"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-dim)' }}>Content</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Start typing…"
          className="flex-1 px-3 py-2.5 rounded-lg text-sm font-mono resize-none outline-none"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', lineHeight: '1.7', minHeight: 200 }}
        />
      </div>

      {saveError && (
        <div className="px-3 py-2 rounded-lg border text-xs"
          style={{ borderColor: 'rgba(248,81,73,0.4)', background: 'rgba(248,81,73,0.1)', color: '#f85149' }}>
          {saveError}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button onClick={() => { setTitle(''); setText(''); }}
          disabled={!text && !title}
          className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-white/5 disabled:opacity-40"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          Clear
        </button>
        <button onClick={handleSave}
          disabled={!text.trim() || saving || !vaultPath}
          className="px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#fff' }}>
          {saving ? 'Saving…' : '⚡ Capture'}
        </button>
      </div>
    </div>
  );
}
