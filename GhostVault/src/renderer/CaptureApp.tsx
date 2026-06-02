import { useState, useEffect, useRef, useCallback } from 'react';

interface SessionCtx {
  currentLab:   string | null;
  activeTarget: string | null;
  activeIP:     string | null;
}

export default function CaptureApp() {
  const [folders, setFolders]             = useState<string[]>(['Notes']);
  const [folder, setFolder]               = useState('Notes');
  const [title, setTitle]                 = useState('');
  const [text, setText]                   = useState('');
  const [saving, setSaving]               = useState(false);
  const [saved, setSaved]                 = useState(false);
  const [watchClip, setWatchClip]         = useState(false);
  const [clipLabel, setClipLabel]         = useState(false);
  const [session, setSession]             = useState<SessionCtx | null>(null);
  const lastClipRef = useRef<string>('');
  const clipIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const cfg = await window.ghostvault.getConfig();
      const theme = cfg.theme as { core?: string; personality?: string } | undefined;
      if (theme?.core) document.documentElement.setAttribute('data-core', theme.core);
      if (theme?.personality) document.documentElement.setAttribute('data-personality', theme.personality);

      if (cfg.vaultPath) {
        const { folders: f } = await window.ghostvault.loadVault(cfg.vaultPath);
        if (f.length > 0) { setFolders(f); setFolder(f[0]); }
      }

      // Check for active session context
      const ctx = await window.ghostvault.getSessionContext();
      if (ctx) setSession(ctx);
    }
    init();

    const unsub = window.ghostvault.onThemeChange((t) => {
      document.documentElement.setAttribute('data-core', t.core);
      document.documentElement.setAttribute('data-personality', t.personality);
    });

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') window.ghostvault.closeCapture();
    }
    window.addEventListener('keydown', onKey);
    return () => { unsub(); window.removeEventListener('keydown', onKey); };
  }, []);

  // ── Clipboard watch ─────────────────────────────────────────────────────────
  const startClipWatch = useCallback(async () => {
    // Seed initial value so first poll doesn't trigger a false paste
    try {
      const initial = await window.ghostvault.readClipboard();
      lastClipRef.current = initial;
    } catch { /* ignore */ }

    clipIntervalRef.current = setInterval(async () => {
      try {
        const current = await window.ghostvault.readClipboard();
        if (current && current !== lastClipRef.current) {
          lastClipRef.current = current;
          setText(current);
          setClipLabel(true);
          setTimeout(() => setClipLabel(false), 2000);
        }
      } catch { /* ignore */ }
    }, 1000);
  }, []);

  const stopClipWatch = useCallback(() => {
    if (clipIntervalRef.current) {
      clearInterval(clipIntervalRef.current);
      clipIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (watchClip) {
      startClipWatch();
    } else {
      stopClipWatch();
    }
    return () => stopClipWatch();
  }, [watchClip, startClipWatch, stopClipWatch]);

  // ── Session template ────────────────────────────────────────────────────────
  function applySessionTemplate() {
    if (!session) return;
    const labLine    = session.currentLab   ? `**Lab:** ${session.currentLab}` : '';
    const targetLine = session.activeTarget
      ? `**Target:** ${session.activeTarget}${session.activeIP ? ` (${session.activeIP})` : ''}`
      : '';
    const body = [labLine, targetLine, '**Finding:** '].filter(Boolean).join('\n') + '\n';
    setText(body);
    if (session.currentLab) {
      const labSlug = session.currentLab.replace(/[/\\?%*:|"<>]/g, '-');
      const labFolder = folders.find(f => f.toLowerCase().includes('cyberlab') || f.toLowerCase() === labSlug);
      if (labFolder) setFolder(labFolder);
    }
  }

  // ── Save ────────────────────────────────────────────────────────────────────
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

  const sessionLabel = session
    ? [session.currentLab, session.activeTarget].filter(Boolean).join(' / ')
    : '';

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
        {/* Clipboard watch toggle */}
        <button
          onClick={() => setWatchClip(v => !v)}
          title={watchClip ? 'Stop watching clipboard' : 'Watch clipboard'}
          className="no-drag w-6 h-6 flex items-center justify-center rounded transition-all"
          style={{
            background  : watchClip ? 'var(--accent)' : 'transparent',
            color       : watchClip ? '#fff' : 'var(--text-dim)',
            border      : `1px solid ${watchClip ? 'var(--accent)' : 'var(--border)'}`,
          }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/>
          </svg>
        </button>
      </div>

      {/* Session banner */}
      {session && (
        <div className="no-drag px-3 py-2 flex items-center justify-between gap-2"
          style={{ background: 'rgba(var(--accent-rgb,99,102,241),.12)', borderBottom: '1px solid var(--border)' }}>
          <span className="text-xs truncate" style={{ color: 'var(--text-dim)' }}>
            Active session: <span style={{ color: 'var(--accent)' }}>{sessionLabel}</span>
          </span>
          <button
            onClick={applySessionTemplate}
            className="text-[10px] px-2 py-0.5 rounded whitespace-nowrap font-medium transition-all hover:opacity-80"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            Use template
          </button>
        </div>
      )}

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

        <div className="relative">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.metaKey && e.key === 'Enter') handleSave(); }}
            placeholder="Start typing… (⌘↵ to save)"
            autoFocus
            className="no-drag w-full px-3 py-2.5 rounded-lg text-sm font-mono resize-none outline-none"
            style={{
              background : 'var(--bg3)',
              border     : '1px solid var(--border)',
              color      : 'var(--text)',
              lineHeight : '1.7',
              minHeight  : 180,
            }}
          />
          {clipLabel && (
            <div
              className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded pointer-events-none"
              style={{
                background  : 'var(--success,#22c55e)',
                color       : '#fff',
                opacity     : clipLabel ? 1 : 0,
                transition  : 'opacity 0.3s',
              }}>
              Pasted from clipboard
            </div>
          )}
        </div>
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
