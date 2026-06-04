import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store';
import { createSession } from '../../lib/session';
import type { Platform, Difficulty } from '@shared/types';

interface HtbMachineInfo {
  name: string;
  os: string;
  difficulty: string;
  points: number;
  userOwns: number;
  rootOwns: number;
}

interface NewSessionModalProps {
  onClose: () => void;
}

export default function NewSessionModal({ onClose }: NewSessionModalProps) {
  const { addTab, config } = useStore();
  const [labName, setLabName] = useState('');
  const [platform, setPlatform] = useState<Platform>('HTB');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [labType, setLabType] = useState('HTB/THM Linux');
  const [ip, setIp] = useState('');
  const [timerMode, setTimerMode] = useState<'stopwatch' | 'countdown'>('stopwatch');
  const [countdownMins, setCountdownMins] = useState(120);
  const [initialContext, setInitialContext] = useState('');
  const [reconTargets, setReconTargets] = useState<string[]>([]);
  const [linkedTarget, setLinkedTarget] = useState('');
  const [htbMachine, setHtbMachine] = useState<HtbMachineInfo | null>(null);
  const [htbLookup, setHtbLookup] = useState('');
  const [htbLoading, setHtbLoading] = useState(false);
  const [htbError, setHtbError] = useState('');

  async function lookupHtbMachine() {
    if (!htbLookup.trim()) return;
    setHtbLoading(true);
    setHtbError('');
    try {
      const cfg = await window.electronAPI.getConfig() as Record<string, unknown>;
      const key = cfg?.htbApiKey as string;
      if (!key) { setHtbError('No HTB API key in Settings'); setHtbLoading(false); return; }
      const res = await window.electronAPI.syncHTB(key) as { success: boolean; labs?: Array<Record<string, unknown>>; error?: string };
      if (!res.success) { setHtbError(res.error || 'HTB lookup failed'); setHtbLoading(false); return; }
      const found = res.labs?.find(m =>
        String(m.name || '').toLowerCase() === htbLookup.toLowerCase()
      );
      if (found) {
        setHtbMachine({
          name: String(found.name || ''),
          os: String(found.os || ''),
          difficulty: String(found.difficulty || ''),
          points: Number(found.points || 0),
          userOwns: Number(found.userOwns || 0),
          rootOwns: Number(found.rootOwns || 0),
        });
        if (found.name) setLabName(String(found.name));
        if (found.os) setLabType(
          String(found.os).toLowerCase().includes('windows') ? 'HTB/THM Windows' : 'HTB/THM Linux'
        );
        if (found.difficulty) setDifficulty(String(found.difficulty) as Difficulty);
      } else {
        setHtbError(`Machine "${htbLookup}" not found in your owned machines`);
      }
    } catch (e: unknown) {
      setHtbError(e instanceof Error ? e.message : 'Lookup failed');
    } finally {
      setHtbLoading(false);
    }
  }

  // Auto-fill IP from shared_context.activeIP
  useEffect(() => {
    async function loadContext() {
      try {
        const cfg = await window.electronAPI.getConfig() as Record<string, unknown>;
        const ctx = cfg?.shared_context as Record<string, unknown> | undefined;
        if (ctx?.activeIP) setIp(String(ctx.activeIP));

        // Load ReconDesk targets
        const targets = cfg?.targets as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(targets)) {
          setReconTargets(targets.map(t => String(t.name || '')).filter(Boolean));
        }
      } catch {}
    }
    loadContext();
  }, []);

  function handleCreate() {
    if (!labName.trim()) return;

    const timerEnabled = timerMode === 'countdown';
    const session = createSession({
      name: labName.trim(),
      labName: labName.trim(),
      platform,
      difficulty,
      labType: labType as never,
      ip: ip.trim(),
      timerEnabled,
      timerMins: timerEnabled ? countdownMins : 120,
    });

    // Store initial context and linked target on session
    if (initialContext.trim()) {
      session.findings.notes = initialContext.trim();
    }

    addTab(session);

    // Write cyberlab_status and shared_context
    try {
      (window.electronAPI as Record<string, Function>).startLab({
        name: labName.trim(),
        platform,
        targetIP: ip.trim() || undefined,
        findingsCount: 0,
      });
    } catch {}

    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        className="panel w-[520px] max-w-[94vw] max-h-[90vh] overflow-y-auto"
        style={{ border: '1px solid var(--border)', borderRadius: 10 }}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>
              New Session
            </div>
            <div className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
              Start Lab
            </div>
          </div>
          <button
            className="w-6 h-6 flex items-center justify-center rounded"
            style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 18 }}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Session Name */}
          <div className="input-group">
            <label>Session Name</label>
            <input
              type="text"
              value={labName}
              onChange={e => setLabName(e.target.value)}
              placeholder="Pickle Rick, Blue, etc."
              className="w-full"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>

          {/* Platform + Difficulty */}
          <div className="grid grid-cols-2 gap-3">
            <div className="input-group">
              <label>Platform</label>
              <select value={platform} onChange={e => setPlatform(e.target.value as Platform)} className="w-full">
                {(['HTB', 'THM', 'CTF', 'Other'] as Platform[]).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} className="w-full">
                {(['Easy', 'Medium', 'Hard', 'Insane'] as Difficulty[]).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lab Type */}
          <div className="input-group">
            <label>Lab Type</label>
            <select value={labType} onChange={e => setLabType(e.target.value)} className="w-full">
              {['HTB/THM Linux', 'HTB/THM Windows', 'CTF', 'Cisco/Networking', 'Web App', 'OSINT/CTF', 'Other'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Target IP */}
          <div className="input-group">
            <label>Target IP</label>
            <input
              type="text"
              value={ip}
              onChange={e => setIp(e.target.value)}
              placeholder="10.10.10.x"
              className="w-full font-mono"
            />
          </div>

          {/* Timer Mode */}
          <div className="input-group">
            <label>Timer Mode</label>
            <div className="flex gap-3">
              {([['stopwatch', 'Stopwatch'], ['countdown', 'Countdown']] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="timerMode"
                    value={val}
                    checked={timerMode === val}
                    onChange={() => setTimerMode(val)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-dim)' }}>{label}</span>
                </label>
              ))}
            </div>
            {timerMode === 'countdown' && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  value={countdownMins}
                  onChange={e => setCountdownMins(Math.max(1, parseInt(e.target.value) || 120))}
                  className="w-24 font-mono text-sm"
                  min={1}
                  max={600}
                />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>minutes</span>
              </div>
            )}
          </div>

          {/* Link ReconDesk target */}
          {reconTargets.length > 0 && (
            <div className="input-group">
              <label>Link to ReconDesk Target (optional)</label>
              <select value={linkedTarget} onChange={e => setLinkedTarget(e.target.value)} className="w-full">
                <option value="">None</option>
                {reconTargets.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {/* HTB Machine Lookup */}
          {platform === 'HTB' && (
            <div className="input-group">
              <label>HTB Machine (optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={htbLookup}
                  onChange={e => setHtbLookup(e.target.value)}
                  placeholder="Machine name (e.g. Lame)"
                  className="flex-1 text-xs font-mono"
                  onKeyDown={e => e.key === 'Enter' && lookupHtbMachine()}
                />
                <button
                  className="btn-ghost text-xs px-3 py-1.5 flex-shrink-0"
                  onClick={lookupHtbMachine}
                  disabled={htbLoading || !htbLookup.trim()}
                >
                  {htbLoading ? '...' : 'Lookup'}
                </button>
              </div>
              {htbError && <div className="text-[10px] mt-1" style={{ color: 'var(--error)' }}>{htbError}</div>}
              {htbMachine && (
                <div
                  className="mt-2 px-3 py-2 rounded text-xs grid grid-cols-3 gap-2"
                  style={{ background: 'rgba(159,239,0,0.07)', border: '1px solid rgba(159,239,0,0.2)' }}
                >
                  <div><span style={{ color: 'var(--text-muted)' }}>OS: </span><span style={{ color: '#9fef00' }}>{htbMachine.os || '—'}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Diff: </span><span style={{ color: '#d29922' }}>{htbMachine.difficulty}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Pts: </span><span style={{ color: '#9fef00' }}>{htbMachine.points}</span></div>
                </div>
              )}
            </div>
          )}

          {/* Initial AI context */}
          <div className="input-group">
            <label>Initial AI Context (optional)</label>
            <textarea
              value={initialContext}
              onChange={e => setInitialContext(e.target.value)}
              placeholder="Pre-prime the AI with context about this lab..."
              className="w-full font-mono text-xs resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg2)' }}
        >
          <button className="btn-ghost px-5 py-2 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-accent px-5 py-2 text-sm"
            onClick={handleCreate}
            disabled={!labName.trim()}
          >
            Create Session
          </button>
        </div>
      </motion.div>
    </div>
  );
}
