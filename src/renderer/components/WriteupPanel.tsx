import { useState } from 'react';
import { useStore } from '../store';

const TEMPLATE = `# {LAB_NAME} — {PLATFORM} ({DIFFICULTY})

**Date:** {DATE}
**Duration:**
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
  const { tabs, activeTabId } = useStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const session = activeTab?.session;

  const [content, setContent] = useState(() => {
    if (!session) return TEMPLATE;
    return TEMPLATE
      .replace('{LAB_NAME}', session.labName || 'Lab')
      .replace('{PLATFORM}', session.platform || 'HTB')
      .replace('{DIFFICULTY}', session.difficulty || 'Medium')
      .replace('{DATE}', new Date().toLocaleDateString());
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveWriteup() {
    if (!session) return;
    setSaving(true);
    try {
      await window.electronAPI.saveWriteup({
        sessionId: session.id,
        labName: session.labName,
        content,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function exportPdf() {
    if (!session) return;
    try {
      await window.electronAPI.exportPdf({
        sessionId: session.id,
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
    </div>
  );
}
