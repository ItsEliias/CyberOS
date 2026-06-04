import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import type { Session } from '@shared/types';
import { formatElapsed } from '../../lib/session';

interface WriteupEditorProps {
  session: Session;
  onClose: () => void;
}

function buildWriteup(session: Session): string {
  const elapsed = session.timer?.elapsed ?? 0;
  const duration = elapsed > 0 ? formatElapsed(elapsed) : 'Unknown';
  const date = new Date().toISOString().slice(0, 10);

  const flags = session.findings.flags.map(f => `- ${f.value}`).join('\n') || '- (none)';
  const ports = session.findings.ports.map(p => `- ${p.value}`).join('\n') || '- (none)';
  const creds = session.findings.credentials.map(c => `- ${c.value}`).join('\n') || '- (none)';
  const notes = (session.findings.notes || '').trim() || '(no notes)';

  return `# ${session.labName} — ${session.platform} Writeup
**Date:** ${date}
**Platform:** ${session.platform}
**Difficulty:** ${session.difficulty || 'Unknown'}
**Duration:** ${duration}
**Flags:** ${session.findings.flags.length}
**Hints Used:** ${session.hintsUsed || 0}

## Target
- IP: ${session.target?.ip || 'Unknown'}
- OS: ${session.target?.os || 'Unknown'}
- Hostname: ${session.target?.hostname || 'Unknown'}

## Enumeration

### Open Ports
${ports}

### Services Found
(fill in service details)

## Exploitation

(fill in exploitation steps)

## Privilege Escalation

(fill in privilege escalation steps)

## Flags
${flags}

## Credentials Found
${creds}

## Notes
${notes}

## Lessons Learned

(fill in what you learned)

## Tools Used
${session.toolsUsed?.join(', ') || '(none recorded)'}
`;
}

export default function WriteupEditor({ session, onClose }: WriteupEditorProps) {
  const { config } = useStore();
  const [content, setContent] = useState(() => buildWriteup(session));
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  // Re-generate if session changes (shouldn't happen often, but just in case)
  useEffect(() => {
    setContent(buildWriteup(session));
  }, [session.id]);

  async function saveToVault() {
    setSaving(true);
    setSaveError('');
    try {
      const result = await window.electronAPI.saveWriteup({
        content,
        labName: session.labName,
        platform: session.platform,
        vaultPath: config?.obsidianVault || '',
      }) as { success: boolean; path?: string; error?: string };

      if (result.success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } else {
        setSaveStatus('error');
        setSaveError(result.error || 'Save failed');
      }
    } catch (e: unknown) {
      setSaveStatus('error');
      setSaveError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  async function openInGhostVault() {
    // First save, then open the vault path
    await saveToVault();
    if (config?.obsidianVault) {
      try {
        await window.electronAPI.openExternal(`obsidian://open?vault=${encodeURIComponent(config.obsidianVault)}`);
      } catch {}
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}
      >
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>Writeup Editor</span>
          <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>— {session.labName}</span>
        </div>

        {saveStatus === 'error' && (
          <span className="text-xs" style={{ color: 'var(--error)' }}>{saveError}</span>
        )}

        <button className="btn-ghost text-xs px-3 py-1.5" onClick={openInGhostVault} disabled={saving}>
          Open in GhostVault
        </button>
        <button className="btn-accent text-xs px-3 py-1.5" onClick={saveToVault} disabled={saving}>
          {saving ? 'Saving...' : saveStatus === 'saved' ? 'Saved ✓' : 'Save to Vault'}
        </button>
        <button
          className="btn-ghost text-xs px-2 py-1.5"
          style={{ color: 'var(--text-muted)' }}
          onClick={onClose}
        >
          Close
        </button>
      </div>

      {/* Editor */}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        className="flex-1 resize-none p-4 font-mono text-xs leading-relaxed"
        style={{
          background: 'var(--bg)',
          border: 'none',
          outline: 'none',
          color: 'var(--text)',
          userSelect: 'text',
          WebkitUserSelect: 'text',
        }}
        spellCheck={false}
      />

      {/* Footer stats */}
      <div
        className="flex items-center gap-4 px-4 py-1.5 flex-shrink-0 text-xs"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text-muted)' }}
      >
        <span>{content.split('\n').length} lines</span>
        <span>{content.length} chars</span>
        {session.findings.flags.length > 0 && (
          <span style={{ color: '#3fb950' }}>
            {session.findings.flags.length} flag{session.findings.flags.length !== 1 ? 's' : ''}
          </span>
        )}
        {(session.hintsUsed || 0) > 0 && (
          <span style={{ color: '#d29922' }}>Hints: {session.hintsUsed}</span>
        )}
      </div>
    </div>
  );
}
