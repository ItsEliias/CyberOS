import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ParsedPort } from '../../hooks/useAiParser';

interface ParsedPortChipsProps {
  ports: ParsedPort[];
  targetName: string;
  onSaved?: (port: ParsedPort) => void;
}

export default function ParsedPortChips({ ports, targetName, onSaved }: ParsedPortChipsProps) {
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);

  if (ports.length === 0) return null;

  async function savePort(port: ParsedPort) {
    const key = `${port.port}/${port.protocol}`;
    if (saved.has(key)) return;
    setSaving(key);
    try {
      await (window.electronAPI as Record<string, Function>).pushToReconDesk({
        targetName,
        finding: {
          type: 'port',
          data: {
            value: `${port.port}/${port.protocol}${port.service ? ` (${port.service})` : ''}`,
            port: port.port,
            protocol: port.protocol,
            service: port.service || '',
          },
        },
      });
      setSaved(prev => new Set([...prev, key]));
      onSaved?.(port);
    } catch (e) {
      console.error('savePort error:', e);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {ports.map(port => {
        const key = `${port.port}/${port.protocol}`;
        const wasSaved = saved.has(key);
        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.12 }}
            className="flex items-center gap-1.5 rounded text-[10px] font-mono px-2 py-0.5"
            style={{
              background: 'rgba(74, 158, 255, 0.12)',
              border: '1px solid rgba(74, 158, 255, 0.35)',
              color: '#4a9eff',
            }}
          >
            <span>{port.port}/{port.protocol}{port.service ? ` ${port.service}` : ''}</span>
            <button
              className="rounded text-[9px] px-1 py-0.5 transition-colors"
              style={{
                border: 'none',
                background: wasSaved ? 'rgba(63, 185, 80, 0.2)' : 'rgba(74, 158, 255, 0.2)',
                color: wasSaved ? '#3fb950' : '#4a9eff',
                cursor: wasSaved ? 'default' : 'pointer',
              }}
              onClick={() => savePort(port)}
              disabled={wasSaved || saving === key}
              title={wasSaved ? 'Saved to ReconDesk' : 'Save to ReconDesk'}
            >
              {wasSaved ? '✓' : saving === key ? '…' : '+ ReconDesk'}
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
