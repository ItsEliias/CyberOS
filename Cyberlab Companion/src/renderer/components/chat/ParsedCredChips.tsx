import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ParsedCred } from '../../hooks/useAiParser';

interface ParsedCredChipsProps {
  creds: ParsedCred[];
  targetName: string;
  onSaved?: (cred: ParsedCred) => void;
}

export default function ParsedCredChips({ creds, targetName, onSaved }: ParsedCredChipsProps) {
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);

  if (creds.length === 0) return null;

  async function saveCred(cred: ParsedCred) {
    const key = cred.username + (cred.password || '');
    if (saved.has(key)) return;
    setSaving(key);
    try {
      await (window.electronAPI as Record<string, Function>).pushToReconDesk({
        targetName,
        finding: {
          type: 'credential',
          data: {
            value: cred.password ? `${cred.username}:${cred.password}` : cred.username,
            username: cred.username,
            password: cred.password || '',
            hash: cred.hash || '',
          },
        },
      });
      setSaved(prev => new Set([...prev, key]));
      onSaved?.(cred);
    } catch (e) {
      console.error('saveCred error:', e);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {creds.map(cred => {
        const key = cred.username + (cred.password || '');
        const wasSaved = saved.has(key);
        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.12 }}
            className="flex items-center gap-1.5 rounded text-[10px] font-mono px-2 py-0.5"
            style={{
              background: 'rgba(248, 81, 73, 0.12)',
              border: '1px solid rgba(248, 81, 73, 0.35)',
              color: '#f85149',
            }}
          >
            <span>
              {cred.username}
              {cred.password && <span style={{ color: 'var(--text-muted)' }}>:{cred.password}</span>}
              {cred.hash && !cred.password && <span style={{ color: 'var(--text-muted)' }}>:{cred.hash.slice(0, 12)}…</span>}
            </span>
            <button
              className="rounded text-[9px] px-1 py-0.5 transition-colors"
              style={{
                border: 'none',
                background: wasSaved ? 'rgba(63, 185, 80, 0.2)' : 'rgba(248, 81, 73, 0.2)',
                color: wasSaved ? '#3fb950' : '#f85149',
                cursor: wasSaved ? 'default' : 'pointer',
              }}
              onClick={() => saveCred(cred)}
              disabled={wasSaved || saving === key}
              title={wasSaved ? 'Saved to ReconDesk' : 'Save credential to ReconDesk'}
            >
              {wasSaved ? '✓' : saving === key ? '…' : '+ ReconDesk'}
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
