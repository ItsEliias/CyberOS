import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { AppStatus } from '@shared/types';

// ─── Category colors per app ──────────────────────────────────────────────────

const APP_CATEGORY: Record<string, { border: string; avatar: string; label: string }> = {
  'CredVault'          : { border: '#d29922', avatar: 'rgba(210,153,34,0.15)',  label: 'CV' },
  'VAULTCORE'          : { border: '#22d3ee', avatar: 'rgba(34,211,238,0.15)',  label: 'VC' },
  'VaultCore'          : { border: '#22d3ee', avatar: 'rgba(34,211,238,0.15)',  label: 'VC' },
  'GhostVault'         : { border: '#6366f1', avatar: 'rgba(99,102,241,0.15)',  label: 'GV' },
  'SignalBoard'        : { border: '#4a9eff', avatar: 'rgba(74,158,255,0.15)',  label: 'SB' },
  'NetworkMap'         : { border: '#3fb950', avatar: 'rgba(63,185,80,0.15)',   label: 'NM' },
  'PlaybookStudio'     : { border: '#a371f7', avatar: 'rgba(163,113,247,0.15)', label: 'PS' },
  'TerminalLink'       : { border: '#f97316', avatar: 'rgba(249,115,22,0.15)',  label: 'TL' },
  'NetLab'             : { border: '#06b6d4', avatar: 'rgba(6,182,212,0.15)',   label: 'NL' },
  'ReconDesk'          : { border: '#f85149', avatar: 'rgba(248,81,73,0.15)',   label: 'RD' },
  'ReportForge'        : { border: '#ec4899', avatar: 'rgba(236,72,153,0.15)',  label: 'RF' },
  'Cyberlab Companion' : { border: '#10b981', avatar: 'rgba(16,185,129,0.15)',  label: 'CL' },
  'CYBERLAB COMPANION' : { border: '#10b981', avatar: 'rgba(16,185,129,0.15)',  label: 'CL' },
};

function getCategory(name: string) {
  return APP_CATEGORY[name] ?? { border: '#4a5568', avatar: 'rgba(74,85,104,0.15)', label: name.slice(0, 2).toUpperCase() };
}

// ─── Status dot ──────────────────────────────────────────────────────────────

function StatusDot({ installed, built }: { installed: boolean; built: boolean }) {
  const color = installed ? '#3fb950' : built ? '#d29922' : '#4a5568';
  const glow  = installed ? '0 0 6px rgba(63,185,80,0.5)' : built ? '0 0 6px rgba(210,153,34,0.4)' : undefined;
  return (
    <div className="w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: color, boxShadow: glow }} />
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
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
          style={{ borderColor: '#d29922', borderTopColor: 'transparent' }} />
        <span className="text-[9px] font-mono" style={{ color: '#d29922' }}>building...</span>
      </div>
    );
  }

  if (app.installed) {
    return (
      <div className="flex gap-1 flex-wrap">
        <button onClick={onOpen}
          className="text-[10px] px-2 py-0.5 rounded font-medium transition-all hover:opacity-90"
          style={{ background: 'rgba(63,185,80,0.15)', color: '#3fb950', border: '1px solid rgba(63,185,80,0.3)' }}>
          Open
        </button>
        <button onClick={onUninstall}
          className="text-[10px] px-2 py-0.5 rounded font-medium transition-all hover:opacity-90"
          style={{ background: 'rgba(248,81,73,0.1)', color: '#f85149', border: '1px solid rgba(248,81,73,0.25)' }}>
          Remove
        </button>
      </div>
    );
  }

  if (app.built) {
    return (
      <div className="flex gap-1 flex-wrap">
        <button onClick={onInstall}
          className="text-[10px] px-2 py-0.5 rounded font-medium transition-all hover:opacity-90"
          style={{ background: 'rgba(210,153,34,0.15)', color: '#d29922', border: '1px solid rgba(210,153,34,0.3)' }}>
          Install →/Apps
        </button>
        <button onClick={onUninstall}
          className="text-[10px] px-2 py-0.5 rounded font-medium transition-all hover:opacity-90"
          style={{ background: 'rgba(248,81,73,0.1)', color: '#f85149', border: '1px solid rgba(248,81,73,0.25)' }}>
          Remove Build
        </button>
      </div>
    );
  }

  return (
    <button onClick={onInstall}
      className="text-[10px] px-2 py-0.5 rounded font-medium transition-all hover:opacity-90"
      style={{ background: 'rgba(74,158,255,0.15)', color: '#4a9eff', border: '1px solid rgba(74,158,255,0.3)' }}>
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
  const cat = getCategory(app.name);
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="rounded-lg p-3 border flex flex-col gap-2 relative overflow-hidden"
      style={{
        background  : 'rgba(22,27,39,0.75)',
        backdropFilter: 'blur(8px)',
        borderColor : isInstalling ? '#d29922' : 'rgba(42,51,71,0.6)',
        borderLeft  : `3px solid ${cat.border}`,
        boxShadow   : isInstalling ? '0 0 12px rgba(210,153,34,0.2)' : undefined,
      }}
    >
      {/* Top row: avatar + name + status dot */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-bold font-mono"
          style={{ background: cat.avatar, color: cat.border }}>
          {cat.label}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <StatusDot installed={app.installed} built={app.built} />
            <span className="text-xs font-bold font-mono truncate" style={{ color: '#e2e8f0' }}>
              {app.name}
            </span>
          </div>
          <div className="text-[10px] truncate mt-0.5" style={{ color: '#8b949e' }}>
            {app.description}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <ActionButtons
        app={app}
        isInstalling={isInstalling}
        onInstall={() => onInstall(app.id)}
        onUninstall={() => onUninstall(app.id, app.name)}
        onOpen={() => onOpen(app.name)}
      />

      {/* Progress message */}
      {progress && (
        <div className="text-[9px] font-mono truncate" style={{ color: '#d29922' }}>
          {progress}
        </div>
      )}
    </motion.div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function FullSpinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#d29922', borderTopColor: 'transparent' }} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AppManager() {
  const [apps, setApps]             = useState<AppStatus[]>([]);
  const [installing, setInstalling] = useState<Set<string>>(new Set());
  const [progress, setProgress]     = useState<Record<string, string>>({});
  const [loading, setLoading]       = useState(true);
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

  const installedCount = apps.filter(a => a.installed).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#4a5568' }}>
            CyberOS Ecosystem
          </div>
          {!loading && (
            <div className="text-[9px] font-mono mt-0.5" style={{ color: '#8b949e' }}>
              {installedCount} / {apps.length} installed
            </div>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-[10px] px-2.5 py-1 rounded transition-all hover:opacity-80 disabled:opacity-40 font-mono"
          style={{ color: '#8b949e', border: '1px solid rgba(42,51,71,0.6)', background: 'rgba(22,27,39,0.5)' }}
        >
          Refresh
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <FullSpinner />
      ) : (
        <div className="grid grid-cols-3 gap-2">
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
