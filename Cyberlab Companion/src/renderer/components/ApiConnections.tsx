import { useEffect, useState, useCallback } from 'react';
import type { HtbStats, ThmStats } from '@shared/types';
import HelpIcon from './ui/HelpIcon';

type Status = 'idle' | 'testing' | 'ok' | 'fail';

interface ConnState<T> { connected: boolean; stats: T | null; error: string | null; }

const HTB_HELP =
  'Paste your HackTheBox API v4 token (https://app.hackthebox.com/profile/settings → Create App Token). ' +
  'Stored encrypted via Electron safeStorage. Used to pull rank, owns, and active machines every 5 minutes.';

const THM_HELP =
  'TryHackMe has no official public API. Paste either your username (limited public stats) or your full ' +
  'session cookie (e.g. "connect.sid=...") for richer data. Stored encrypted via Electron safeStorage.';

// ── HTB Card ─────────────────────────────────────────────────────────────────

function HtbCard({ onChange }: { onChange?: () => void }) {
  const [state, setState] = useState<ConnState<HtbStats>>({ connected: false, stats: null, error: null });
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const api = window.electronAPI as Record<string, Function>;
      const has = await api.hasHtbToken?.();
      if (!has) { setState({ connected: false, stats: null, error: null }); return; }
      const r = await api.fetchHtbStats() as { success: boolean; data?: HtbStats; error?: string };
      setState({
        connected: true,
        stats: r?.success ? r.data || null : null,
        error: r?.success ? null : (r?.error || 'Sync failed'),
      });
    } catch (e) {
      setState({ connected: false, stats: null, error: (e as Error).message });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function save() {
    if (!token.trim()) return;
    setBusy(true); setStatus('testing');
    try {
      const api = window.electronAPI as Record<string, Function>;
      const r = await api.saveHtbToken(token.trim()) as { success: boolean; error?: string; data?: HtbStats };
      if (r?.success) {
        setStatus('ok');
        setToken('');
        setState({ connected: true, stats: r.data || null, error: null });
        onChange?.();
      } else {
        setStatus('fail');
        setState(s => ({ ...s, error: r?.error || 'Save failed' }));
      }
    } catch (e) {
      setStatus('fail');
      setState(s => ({ ...s, error: (e as Error).message }));
    } finally {
      setBusy(false);
      setTimeout(() => setStatus('idle'), 2500);
    }
  }

  async function test() {
    setBusy(true); setStatus('testing');
    try {
      const api = window.electronAPI as Record<string, Function>;
      const r = await api.testHtbToken(token.trim() || undefined) as { success: boolean; data?: HtbStats; error?: string };
      if (r?.success) {
        setStatus('ok');
        if (r.data) setState(s => ({ ...s, stats: r.data!, error: null }));
      } else {
        setStatus('fail');
        setState(s => ({ ...s, error: r?.error || 'Test failed' }));
      }
    } catch (e) {
      setStatus('fail');
      setState(s => ({ ...s, error: (e as Error).message }));
    } finally {
      setBusy(false);
      setTimeout(() => setStatus('idle'), 2500);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      const api = window.electronAPI as Record<string, Function>;
      await api.clearHtbToken();
      setState({ connected: false, stats: null, error: null });
      setToken('');
      onChange?.();
    } finally { setBusy(false); }
  }

  return (
    <section className="card space-y-3" style={{ position: 'relative' }}>
      <div className="flex items-center gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9fef00' }}>
          HackTheBox
        </div>
        <HelpIcon text={HTB_HELP} label="About HTB integration" />
        <span style={{ marginLeft: 'auto' }}>
          <StatusDot connected={state.connected} error={!!state.error} />
        </span>
      </div>

      {state.connected && state.stats && (
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="py-1.5 rounded" style={{ background: 'var(--bg3, rgba(13,14,24,0.6))', border: '1px solid var(--border)' }}>
            <div className="font-mono font-bold" style={{ color: '#9fef00' }}>{state.stats.points}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Points</div>
          </div>
          <div className="py-1.5 rounded" style={{ background: 'var(--bg3, rgba(13,14,24,0.6))', border: '1px solid var(--border)' }}>
            <div className="font-mono font-bold" style={{ color: '#4a9eff' }}>{state.stats.userOwns}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>User Owns</div>
          </div>
          <div className="py-1.5 rounded" style={{ background: 'var(--bg3, rgba(13,14,24,0.6))', border: '1px solid var(--border)' }}>
            <div className="font-mono font-bold" style={{ color: '#f85149' }}>{state.stats.rootOwns}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Root Owns</div>
          </div>
        </div>
      )}

      {state.connected && state.stats?.activeMachines?.[0] && (
        <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
          Active machine: <span className="font-mono" style={{ color: 'var(--accent)' }}>{state.stats.activeMachines[0].name}</span>
        </div>
      )}

      {!state.connected && (
        <div className="input-group">
          <label>API Token</label>
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            className="w-full font-mono text-xs"
            placeholder="eyJ0eXAiOiJKV1QiLCJh..."
          />
          <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            From <code className="font-mono">app.hackthebox.com/profile/settings</code> → App Tokens
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {!state.connected ? (
          <button className="btn-accent px-3 py-1.5 text-xs" onClick={save} disabled={busy || !token.trim()}>
            {status === 'testing' ? 'Saving...' : status === 'ok' ? 'Saved ✓' : status === 'fail' ? 'Failed ✗' : 'Save & Connect'}
          </button>
        ) : (
          <>
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={test} disabled={busy}>
              {status === 'testing' ? 'Testing...' : status === 'ok' ? 'OK ✓' : status === 'fail' ? 'Failed ✗' : 'Test'}
            </button>
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={refresh} disabled={busy}>Refresh</button>
            <button
              className="btn-ghost px-3 py-1.5 text-xs"
              onClick={disconnect}
              disabled={busy}
              style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
            >
              Disconnect
            </button>
          </>
        )}
      </div>

      {state.error && (
        <div className="text-[11px] font-mono" style={{ color: 'var(--error)' }}>{state.error}</div>
      )}
    </section>
  );
}

// ── THM Card ─────────────────────────────────────────────────────────────────

function ThmCard({ onChange }: { onChange?: () => void }) {
  const [state, setState] = useState<ConnState<ThmStats>>({ connected: false, stats: null, error: null });
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const api = window.electronAPI as Record<string, Function>;
      const has = await api.hasThmToken?.();
      if (!has) { setState({ connected: false, stats: null, error: null }); return; }
      const r = await api.fetchThmStats() as { success: boolean; data?: ThmStats; error?: string };
      setState({
        connected: true,
        stats: r?.success ? r.data || null : null,
        error: r?.success ? null : (r?.error || 'Sync failed'),
      });
    } catch (e) {
      setState({ connected: false, stats: null, error: (e as Error).message });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function save() {
    if (!token.trim()) return;
    setBusy(true); setStatus('testing');
    try {
      const api = window.electronAPI as Record<string, Function>;
      const r = await api.saveThmToken({ token: token.trim(), username: username.trim() || undefined }) as
        { success: boolean; error?: string; data?: ThmStats };
      if (r?.success) {
        setStatus('ok');
        setToken('');
        setState({ connected: true, stats: r.data || null, error: null });
        onChange?.();
      } else {
        setStatus('fail');
        setState(s => ({ ...s, error: r?.error || 'Save failed' }));
      }
    } catch (e) {
      setStatus('fail');
      setState(s => ({ ...s, error: (e as Error).message }));
    } finally {
      setBusy(false);
      setTimeout(() => setStatus('idle'), 2500);
    }
  }

  async function test() {
    setBusy(true); setStatus('testing');
    try {
      const api = window.electronAPI as Record<string, Function>;
      const r = await api.testThmToken({ token: token.trim() || undefined, username: username.trim() || undefined }) as
        { success: boolean; data?: ThmStats; error?: string };
      if (r?.success) {
        setStatus('ok');
        if (r.data) setState(s => ({ ...s, stats: r.data!, error: null }));
      } else {
        setStatus('fail');
        setState(s => ({ ...s, error: r?.error || 'Test failed' }));
      }
    } catch (e) {
      setStatus('fail');
      setState(s => ({ ...s, error: (e as Error).message }));
    } finally {
      setBusy(false);
      setTimeout(() => setStatus('idle'), 2500);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      const api = window.electronAPI as Record<string, Function>;
      await api.clearThmToken();
      setState({ connected: false, stats: null, error: null });
      setToken('');
      onChange?.();
    } finally { setBusy(false); }
  }

  return (
    <section className="card space-y-3">
      <div className="flex items-center gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#88cc14' }}>
          TryHackMe
        </div>
        <HelpIcon text={THM_HELP} label="About THM integration" />
        <span style={{ marginLeft: 'auto' }}>
          <StatusDot connected={state.connected} error={!!state.error} />
        </span>
      </div>

      {state.connected && state.stats && (
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="py-1.5 rounded" style={{ background: 'var(--bg3, rgba(13,14,24,0.6))', border: '1px solid var(--border)' }}>
            <div className="font-mono font-bold" style={{ color: '#3fb950' }}>{state.stats.completedRooms}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Completed</div>
          </div>
          <div className="py-1.5 rounded" style={{ background: 'var(--bg3, rgba(13,14,24,0.6))', border: '1px solid var(--border)' }}>
            <div className="font-mono font-bold" style={{ color: '#d29922' }}>{state.stats.inProgressRooms}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>In Progress</div>
          </div>
        </div>
      )}

      {state.connected && state.stats?.partial && (
        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{state.stats.partial}</div>
      )}

      {!state.connected && (
        <>
          <div className="input-group">
            <label>Username (optional)</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full font-mono text-xs"
              placeholder="your-thm-username"
            />
          </div>
          <div className="input-group">
            <label>Session Cookie or Token</label>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              className="w-full font-mono text-xs"
              placeholder="connect.sid=s%3A..."
            />
            <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              THM has no official API. Paste your <code className="font-mono">connect.sid</code> cookie value from
              {' '}<code className="font-mono">tryhackme.com</code> DevTools → Application → Cookies.
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2 flex-wrap">
        {!state.connected ? (
          <button className="btn-accent px-3 py-1.5 text-xs" onClick={save} disabled={busy || !token.trim()}>
            {status === 'testing' ? 'Saving...' : status === 'ok' ? 'Saved ✓' : status === 'fail' ? 'Failed ✗' : 'Save & Connect'}
          </button>
        ) : (
          <>
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={test} disabled={busy}>
              {status === 'testing' ? 'Testing...' : status === 'ok' ? 'OK ✓' : status === 'fail' ? 'Failed ✗' : 'Test'}
            </button>
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={refresh} disabled={busy}>Refresh</button>
            <button
              className="btn-ghost px-3 py-1.5 text-xs"
              onClick={disconnect}
              disabled={busy}
              style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
            >
              Disconnect
            </button>
          </>
        )}
      </div>

      {state.error && (
        <div className="text-[11px] font-mono" style={{ color: 'var(--error)' }}>{state.error}</div>
      )}
    </section>
  );
}

function StatusDot({ connected, error }: { connected: boolean; error: boolean }) {
  const color = error ? 'var(--error)' : connected ? 'var(--success, #3fb950)' : 'var(--text-muted)';
  const label = error ? 'Error' : connected ? 'Connected' : 'Disconnected';
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: color, boxShadow: connected && !error ? `0 0 6px ${color}` : 'none',
      }} />
      {label}
    </span>
  );
}

// ── Wrapper ──────────────────────────────────────────────────────────────────

export default function ApiConnections({ onChange }: { onChange?: () => void }) {
  return (
    <div id="api-connections" className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
          API Connections
        </h3>
        <HelpIcon text="Connect to HackTheBox and TryHackMe to auto-sync your stats, active machines, and recent activity. All tokens are encrypted at rest with Electron safeStorage and never leave this machine." label="About API Connections" />
      </div>
      <div id="api-connections-htb"><HtbCard onChange={onChange} /></div>
      <div id="api-connections-thm"><ThmCard onChange={onChange} /></div>
    </div>
  );
}
