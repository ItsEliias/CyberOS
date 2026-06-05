import { useEffect, useRef, useState } from 'react';
import type { AppStatus } from '@shared/types';

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div
      className="inline-block w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
      style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
    />
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ installed, built }: { installed: boolean; built: boolean }) {
  if (installed) {
    return (
      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider"
        style={{ background: 'rgba(63,185,80,0.15)', color: '#3fb950', border: '1px solid rgba(63,185,80,0.3)' }}>
        Installed
      </span>
    );
  }
  if (built) {
    return (
      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider"
        style={{ background: 'rgba(210,153,34,0.15)', color: '#d29922', border: '1px solid rgba(210,153,34,0.3)' }}>
        Built
      </span>
    );
  }
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider"
      style={{ background: 'rgba(107,122,153,0.15)', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
      Not installed
    </span>
  );
}

// ─── Action buttons ───────────────────────────────────────────────────────────

interface ActionProps {
  app: AppStatus;
  isInstalling: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  onOpen: () => void;
}

function ActionButtons({ app, isInstalling, onInstall, onUninstall, onOpen }: ActionProps) {
  if (isInstalling) {
    return <Spinner />;
  }

  if (app.installed) {
    return (
      <div className="flex gap-1">
        <button
          onClick={onOpen}
          className="text-[10px] px-2 py-0.5 rounded font-medium transition-colors"
          style={{ background: 'rgba(63,185,80,0.15)', color: '#3fb950', border: '1px solid rgba(63,185,80,0.3)' }}
        >
          Open
        </button>
        <button
          onClick={onUninstall}
          className="text-[10px] px-2 py-0.5 rounded font-medium transition-colors"
          style={{ background: 'rgba(248,81,73,0.1)', color: '#f85149', border: '1px solid rgba(248,81,73,0.25)' }}
        >
          Uninstall
        </button>
      </div>
    );
  }

  if (app.built) {
    return (
      <div className="flex gap-1">
        <button
          onClick={onInstall}
          className="text-[10px] px-2 py-0.5 rounded font-medium transition-colors"
          style={{ background: 'rgba(210,153,34,0.15)', color: '#d29922', border: '1px solid rgba(210,153,34,0.3)' }}
        >
          Install to /Applications
        </button>
        <button
          onClick={onUninstall}
          className="text-[10px] px-2 py-0.5 rounded font-medium transition-colors"
          style={{ background: 'rgba(248,81,73,0.1)', color: '#f85149', border: '1px solid rgba(248,81,73,0.25)' }}
        >
          Uninstall
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onInstall}
      className="text-[10px] px-2 py-0.5 rounded font-medium transition-colors"
      style={{ background: 'rgba(74,158,255,0.15)', color: '#4a9eff', border: '1px solid rgba(74,158,255,0.3)' }}
    >
      Install
    </button>
  );
}

// ─── App card ─────────────────────────────────────────────────────────────────

interface CardProps {
  app: AppStatus;
  isInstalling: boolean;
  progress: string;
  onInstall: (id: string) => void;
  onUninstall: (id: string, productName: string) => void;
  onOpen: (productName: string) => void;
}

function AppManagerCard({ app, isInstalling, progress, onInstall, onUninstall, onOpen }: CardProps) {
  return (
    <div
      className="rounded-lg p-2.5 border flex flex-col gap-1.5"
      style={{
        background: 'var(--card-bg)',
        borderColor: isInstalling ? 'var(--accent)' : 'var(--border)',
        boxShadow: isInstalling ? '0 0 8px rgba(74,158,255,0.15)' : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0">
          <div className="text-xs font-bold font-mono truncate" style={{ color: 'var(--text)' }}>
            {app.name}
          </div>
          <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {app.description}
          </div>
        </div>
        <StatusPill installed={app.installed} built={app.built} />
      </div>

      <ActionButtons
        app={app}
        isInstalling={isInstalling}
        onInstall={() => onInstall(app.id)}
        onUninstall={() => onUninstall(app.id, app.name)}
        onOpen={() => onOpen(app.name)}
      />

      {progress && (
        <div className="text-[9px] font-mono truncate" style={{ color: 'var(--text-dim)' }}>
          {progress}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AppManager() {
  const [apps, setApps]           = useState<AppStatus[]>([]);
  const [installing, setInstalling] = useState<Set<string>>(new Set());
  const [progress, setProgress]   = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refresh() {
    try {
      const statuses = await window.api.appManager.getStatus();
      setApps(statuses);
    } catch (err) {
      console.error('[AppManager] refresh failed:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 30_000);

    const unsub = window.api.appManager.onProgress((data) => {
      setProgress(prev => ({ ...prev, [data.id]: data.message }));
    });

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      unsub();
    };
  }, []);

  async function handleInstall(id: string) {
    setInstalling(prev => new Set(prev).add(id));
    setProgress(prev => ({ ...prev, [id]: 'Starting...' }));
    try {
      const result = await window.api.appManager.install(id);
      if (!result.success) {
        setProgress(prev => ({ ...prev, [id]: `Error: ${result.error ?? 'unknown'}` }));
      } else {
        setProgress(prev => ({ ...prev, [id]: '' }));
      }
    } finally {
      setInstalling(prev => { const next = new Set(prev); next.delete(id); return next; });
      await refresh();
    }
  }

  async function handleUninstall(id: string, productName: string) {
    setInstalling(prev => new Set(prev).add(id));
    try {
      await window.api.appManager.uninstall(id, productName);
    } finally {
      setInstalling(prev => { const next = new Set(prev); next.delete(id); return next; });
      await refresh();
    }
  }

  async function handleOpen(productName: string) {
    await window.api.appManager.open(productName);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-dim)' }}>
          App Manager
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-[10px] px-2 py-0.5 rounded transition-colors disabled:opacity-40"
          style={{ color: 'var(--text-dim)', border: '1px solid var(--border)' }}
        >
          Refresh
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {apps.map(app => (
            <AppManagerCard
              key={app.id}
              app={app}
              isInstalling={installing.has(app.id)}
              progress={progress[app.id] ?? ''}
              onInstall={handleInstall}
              onUninstall={handleUninstall}
              onOpen={handleOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}
