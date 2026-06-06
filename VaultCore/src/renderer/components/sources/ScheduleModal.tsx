import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Source, SourceSchedule, ConflictStrategy } from '@shared/types';
import Button from '../ui/Button';
import HelpTip from '../ui/Tooltip';
import { computeNextRunLocal, formatRelative } from '../../utils/cron';

interface ScheduleModalProps {
  source: Source;
  onClose: () => void;
  onSaved: (updated: Source) => void;
  onRunNow: () => void;
  runningNow: boolean;
}

interface Preset { id: string; label: string; cron: string }

const PRESETS: Preset[] = [
  { id: '15min',  label: 'Every 15 min',     cron: '*/15 * * * *' },
  { id: 'hour',   label: 'Hourly',           cron: '0 * * * *' },
  { id: 'day9',   label: 'Daily 9am',        cron: '0 9 * * *' },
  { id: 'mid',    label: 'Daily midnight',   cron: '0 0 * * *' },
  { id: 'monday', label: 'Weekly Mon 9am',   cron: '0 9 * * 1' },
];

const CONFLICTS: Array<{ value: ConflictStrategy; label: string }> = [
  { value: 'skip',      label: 'Skip existing' },
  { value: 'overwrite', label: 'Overwrite' },
  { value: 'keepBoth',  label: 'Append (keep both)' },
];

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
};

export default function ScheduleModal({ source, onClose, onSaved, onRunNow, runningNow }: ScheduleModalProps) {
  const initial = source.schedule ?? {};
  const [enabled, setEnabled]   = useState<boolean>(!!initial.enabled);
  const [cronExpr, setCronExpr] = useState<string>(initial.cronExpression ?? '');
  const [strategy, setStrategy] = useState<ConflictStrategy>((initial.conflictStrategy as ConflictStrategy) ?? 'skip');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Match the current cron to a preset (purely cosmetic — drives the radio group).
  const activePreset = useMemo(
    () => PRESETS.find(p => p.cron === cronExpr.trim())?.id ?? 'custom',
    [cronExpr],
  );

  // Live next-run preview as user types — uses cron-parser via main, with a
  // local fallback so we don't roundtrip on every keystroke.
  const [nextRun, setNextRun] = useState<string | null>(null);
  useEffect(() => {
    if (!cronExpr.trim()) { setNextRun(null); return; }
    const local = computeNextRunLocal(cronExpr.trim());
    setNextRun(local);
    // Authoritative answer from main process (handles edge cases consistently)
    let cancelled = false;
    window.electronAPI.computeNextRun(cronExpr.trim()).then(v => {
      if (!cancelled && v) setNextRun(v);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [cronExpr]);

  function pickPreset(id: string) {
    const p = PRESETS.find(x => x.id === id);
    if (p) setCronExpr(p.cron);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload: SourceSchedule = {
        enabled,
        cronExpression: cronExpr.trim() || undefined,
        conflictStrategy: strategy,
      };
      const result = await window.electronAPI.updateSourceSchedule(source.id, payload as Record<string, unknown>);
      if (result && typeof result === 'object' && 'error' in result) {
        setError((result as { error: string }).error);
        return;
      }
      onSaved(result as Source);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const lastRun = source.lastScraped;
  const cronInvalid = !!cronExpr.trim() && !nextRun;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-lg rounded-xl overflow-hidden"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: 'var(--border-default)' }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-xs uppercase tracking-wider font-semibold"
                style={{ color: 'var(--accent)' }}>Schedule</div>
              <HelpTip text="Schedule when this source is automatically scraped. Cron runs in the background even when the window is closed (the app must be running)." />
            </div>
            <div className="text-sm font-medium truncate mt-0.5"
              style={{ color: 'var(--text-primary)' }}>{source.name}</div>
          </div>
          <Button variant="ghost" size="xs" onClick={onClose}>Close</Button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-primary)' }}>Schedule enabled</span>
              <HelpTip text="Turn off to keep the cron config saved without firing automatic runs." />
            </div>
            <button
              onClick={() => setEnabled(v => !v)}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              style={{ background: enabled ? 'var(--accent, #3fb950)' : 'var(--border-default)' }}
              aria-pressed={enabled}
            >
              <span
                className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                style={{ transform: enabled ? 'translateX(18px)' : 'translateX(2px)' }} />
            </button>
          </div>

          {/* Presets */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-[10px] uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}>Preset</label>
              <HelpTip text="Common cron shortcuts. Pick one or write a custom expression below." />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => pickPreset(p.id)}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-left transition-all border"
                  style={{
                    background: activePreset === p.id ? 'rgba(63,185,80,0.12)' : 'var(--surface-2)',
                    borderColor: activePreset === p.id ? 'rgba(63,185,80,0.4)' : 'var(--border-default)',
                    color: activePreset === p.id ? '#3fb950' : 'var(--text-secondary)',
                  }}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => { /* custom = just type below */ }}
                className="px-2.5 py-1.5 rounded-lg text-xs text-left transition-all border"
                style={{
                  background: activePreset === 'custom' ? 'rgba(63,185,80,0.12)' : 'var(--surface-2)',
                  borderColor: activePreset === 'custom' ? 'rgba(63,185,80,0.4)' : 'var(--border-default)',
                  color: activePreset === 'custom' ? '#3fb950' : 'var(--text-secondary)',
                }}
              >
                Custom…
              </button>
            </div>
          </div>

          {/* Cron input */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1"
              style={{ color: 'var(--text-muted)' }}>Cron expression</label>
            <input
              className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
              style={{ ...inputStyle, borderColor: cronInvalid ? '#f85149' : (inputStyle.border as string) }}
              value={cronExpr}
              onChange={e => setCronExpr(e.target.value)}
              placeholder="*/15 * * * *"
              spellCheck={false}
            />
            <div className="flex items-center justify-between mt-1.5 text-[10px]">
              <span style={{ color: 'var(--text-muted)' }}>
                Last run: {lastRun ? new Date(lastRun).toLocaleString() : 'Never'}
              </span>
              <span style={{ color: cronInvalid ? '#f85149' : 'var(--text-muted)' }}>
                {cronInvalid
                  ? 'Invalid cron'
                  : nextRun
                    ? `Next: ${formatRelative(nextRun)} (${new Date(nextRun).toLocaleString()})`
                    : 'Next: —'}
              </span>
            </div>
          </div>

          {/* Conflict strategy */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="block text-[10px] uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}>Conflict strategy</label>
              <HelpTip text="What to do when a scraped note already exists. Skip keeps the local copy, Overwrite replaces it, Append keeps both." />
            </div>
            <select
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={inputStyle}
              value={strategy}
              onChange={e => setStrategy(e.target.value as ConflictStrategy)}
            >
              {CONFLICTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {error && (
            <div className="text-[11px] px-3 py-2 rounded-lg"
              style={{ background: 'rgba(248,81,73,0.10)', color: '#f85149', border: '1px solid rgba(248,81,73,0.3)' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t"
          style={{ borderColor: 'var(--border-default)', background: 'var(--surface-2)' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRunNow}
            disabled={runningNow}
            loading={runningNow}
          >
            ▶ Run now
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={save}
              disabled={saving || (enabled && cronInvalid)}
              loading={saving}
            >
              Save schedule
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
