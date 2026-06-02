import { useState } from 'react';
import { useStore } from '../store';

const TEMPLATE = `# {LAB_NAME} — {PLATFORM} ({DIFFICULTY})

**Date:** {DATE}
**Duration:** {DURATION}
**Hints Used:** {HINTS}
**Flags:**

---

## Enumeration

### Port Scan

\`\`\`
\`\`\`

### Service Enumeration



## Foothold



## Privilege Escalation



## Post-Exploitation



## Flags

| Flag | Value |
|------|-------|
| User | |
| Root | |

---

## Lessons Learned



## Tools Used

`;

export default function WriteupPanel() {
  const { tabs, activeTabId, config } = useStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const session = activeTab?.session;

  const [content, setContent] = useState(() => {
    if (!session) return TEMPLATE;
    const elapsedSecs = session.timer?.elapsed ?? 0;
    const h = Math.floor(elapsedSecs / 3600);
    const m = Math.floor((elapsedSecs % 3600) / 60);
    const duration = elapsedSecs > 0 ? `${h}h ${m}m` : '';
    return TEMPLATE
      .replace('{LAB_NAME}', session.labName || 'Lab')
      .replace('{PLATFORM}', session.platform || 'HTB')
      .replace('{DIFFICULTY}', session.difficulty || 'Medium')
      .replace('{DATE}', new Date().toLocaleDateString())
      .replace('{DURATION}', duration)
      .replace('{HINTS}', String(session.hintsUsed || 0));
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveWriteup() {
    if (!session) return;
    setSaving(true);
    try {
      const result = await window.electronAPI.saveWriteup({
        content,
        labName: session.labName,
        platform: session.platform,
        vaultPath: config?.obsidianVault || '',
      }) as { success: boolean; error?: string };
      if (result?.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        console.error('saveWriteup failed:', result?.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function exportPdf() {
    if (!session) return;
    try {
      await window.electronAPI.exportPDF({
        labName: session.labName,
        content,
      });
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg2)]">
        <span className="text-xs font-semibold text-[var(--text-dim)]">Writeup</span>
        {session && <span className="text-xs text-[var(--text-muted)]">— {session.labName}</span>}
        <div className="flex-1" />
        <button className="btn-ghost text-xs px-3 py-1.5" onClick={exportPdf}>Export PDF</button>
        <button className="btn-accent text-xs px-3 py-1.5" onClick={saveWriteup} disabled={saving}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* Editor */}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        className="flex-1 resize-none p-4 font-mono text-xs leading-relaxed selectable"
        style={{ background: 'var(--bg)', border: 'none', outline: 'none', color: 'var(--text)' }}
        spellCheck={false}
      />
      {/* Session footer stats */}
      {session && (
        <div className="flex items-center gap-4 px-4 py-1.5 border-t border-[var(--border)] bg-[var(--bg2)] flex-shrink-0">
          {session.timer?.elapsed ? (
            <span className="text-xs text-[var(--text-muted)] font-mono">
              Time: {Math.floor(session.timer.elapsed / 3600)}h {Math.floor((session.timer.elapsed % 3600) / 60)}m
            </span>
          ) : null}
          {(session.hintsUsed || 0) > 0 && (
            <span className="text-xs" style={{ color: 'var(--warning)' }}>
              Hints used: {session.hintsUsed}
            </span>
          )}
          {session.findings.flags.length > 0 && (
            <span className="text-xs" style={{ color: 'var(--success)' }}>
              Flags: {session.findings.flags.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
