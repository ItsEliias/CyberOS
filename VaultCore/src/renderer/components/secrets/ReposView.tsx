// Features 9 (multi-repo tabs), 14 (git pull), 18 (config file scanner)
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSecretStore } from '../../stores/useSecretStore';
import { useVaultCoreStore } from '../../stores/useVaultCoreStore';
import type { Repository } from '../../types/vaultcore';

const CONFIG_PATTERNS = [
  /docker-compose\.ya?ml$/i,
  /^\.env(\..+)?$/i,
  /nginx\.conf$/i,
  /apache2?\.conf$/i,
  /^config\.json$/i,
  /settings\.py$/i,
];

function isConfigFile(name: string): boolean {
  return CONFIG_PATTERNS.some(p => p.test(name));
}

interface RepoTabProps {
  repo: Repository;
  active: boolean;
  onClick: () => void;
  onRemove: () => void;
}

function RepoTab({ repo, active, onClick, onRemove }: RepoTabProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 cursor-pointer border-b-2 transition-all"
      style={{
        borderColor: active ? 'var(--accent)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        background: active ? 'color-mix(in srgb, var(--accent) 5%, transparent)' : 'transparent',
      }}
    >
      <span className="text-xs font-medium truncate max-w-[120px]">{repo.name}</span>
      <span className="text-[9px] font-mono px-1 py-0.5 rounded shrink-0"
        style={{ background: '#161b27', color: '#8b949e' }}>
        {repo.currentBranch || 'main'}
      </span>
      {repo.secretCount > 0 && (
        <span className="text-[9px] font-mono px-1 py-0.5 rounded shrink-0"
          style={{ background: 'rgba(248,81,73,0.15)', color: '#f85149' }}>
          {repo.secretCount}
        </span>
      )}
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className="text-[10px] w-4 h-4 flex items-center justify-center rounded hover:bg-white/10 shrink-0"
        style={{ color: '#4a5568' }}
      >
        ×
      </button>
    </div>
  );
}

export default function ReposView() {
  const { repos, addRepo, removeRepo, setActiveRepo, activeRepoId, updateRepo } = useSecretStore();
  const { setActiveView } = useVaultCoreStore();
  const [pulling, setPulling] = useState<string | null>(null);
  const [pullOutput, setPullOutput] = useState<Record<string, string>>({});
  const [scanning, setScanning] = useState<string | null>(null);

  const activeRepo = repos.find(r => r.id === activeRepoId) ?? repos[0] ?? null;

  async function handleAddRepo() {
    const p = await window.electronAPI.selectFolder();
    if (!p) return;
    const name = p.split('/').pop() ?? p;
    const branchRes = await window.electronAPI.gitCurrentBranch(p).catch(() => ({ branch: 'main' }));
    const branchesRes = await window.electronAPI.gitBranches(p).catch(() => ({ branches: [] }));
    const r = addRepo({
      name,
      path: p,
      currentBranch: branchRes.branch ?? 'main',
      branches: branchesRes.branches ?? [],
      secretCount: 0,
    });
    setActiveRepo(r.id);
  }

  async function handlePull(repo: Repository) {
    setPulling(repo.id);
    try {
      const res = await window.electronAPI.gitPull(repo.path);
      setPullOutput(prev => ({ ...prev, [repo.id]: res.error ?? res.output ?? 'Done' }));
      if (res.success) {
        const branchRes = await window.electronAPI.gitCurrentBranch(repo.path).catch(() => ({}));
        if (branchRes.branch) updateRepo(repo.id, { currentBranch: branchRes.branch });
      }
    } finally {
      setPulling(null);
    }
  }

  async function handleScan(repo: Repository) {
    setScanning(repo.id);
    setActiveRepo(repo.id);
    setActiveView('scan');
    setScanning(null);
  }

  async function handleConflictCheck(repo: Repository) {
    setActiveRepo(repo.id);
    setActiveView('conflicts');
  }

  if (repos.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8">
        <div className="text-5xl mb-4" style={{ opacity: 0.2 }}>⬡</div>
        <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>No repositories added</div>
        <div className="text-[11px] mb-4" style={{ color: 'var(--text-dim)' }}>Add a git repository to begin secret scanning</div>
        <button onClick={handleAddRepo}
          className="px-4 py-2 rounded-lg text-xs font-semibold"
          style={{ background: 'var(--accent)', color: '#fff' }}>
          + Add Repository
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b overflow-x-auto shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--bg2)', scrollbarWidth: 'none' }}>
        {repos.slice(0, 8).map(repo => (
          <RepoTab
            key={repo.id}
            repo={repo}
            active={activeRepo?.id === repo.id}
            onClick={() => setActiveRepo(repo.id)}
            onRemove={() => { removeRepo(repo.id); setActiveRepo(repos.find(r => r.id !== repo.id)?.id ?? null); }}
          />
        ))}
        {repos.length < 8 && (
          <button onClick={handleAddRepo}
            className="px-3 py-2 text-xs shrink-0 transition-all hover:bg-white/5"
            style={{ color: 'var(--text-dim)' }}>
            + Add Repo
          </button>
        )}
      </div>

      {/* Repo detail */}
      {activeRepo && (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRepo.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-auto p-5"
          >
            <div className="max-w-2xl space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{activeRepo.name}</div>
                  <div className="text-[10px] font-mono mt-0.5 truncate" style={{ color: 'var(--text-dim)' }}>{activeRepo.path}</div>
                  <div className="text-[10px] mt-1" style={{ color: '#7bb8ff' }}>
                    Branch: <span className="font-mono">{activeRepo.currentBranch}</span>
                    {activeRepo.lastScanAt && <span className="ml-3" style={{ color: 'var(--text-dim)' }}>Last scan: {new Date(activeRepo.lastScanAt).toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => window.electronAPI.openFolder(activeRepo.path)}
                    className="px-3 py-1.5 rounded-lg text-xs border hover:bg-white/5 transition-all"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                    Open Folder
                  </button>
                  <button
                    onClick={() => handlePull(activeRepo)}
                    disabled={pulling === activeRepo.id}
                    className="px-3 py-1.5 rounded-lg text-xs border transition-all disabled:opacity-40"
                    style={{ borderColor: '#7bb8ff', color: '#7bb8ff' }}>
                    {pulling === activeRepo.id ? '↓ Pulling…' : '↓ Pull'}
                  </button>
                  <button
                    onClick={() => handleConflictCheck(activeRepo)}
                    className="px-3 py-1.5 rounded-lg text-xs border transition-all"
                    style={{ borderColor: '#d29922', color: '#d29922' }}>
                    ⚡ Conflicts
                  </button>
                  <button
                    onClick={() => handleScan(activeRepo)}
                    disabled={scanning === activeRepo.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                    style={{ background: 'var(--accent)', color: '#fff' }}>
                    {scanning === activeRepo.id ? 'Scanning…' : '⬢ Scan'}
                  </button>
                </div>
              </div>

              {/* Pull output */}
              {pullOutput[activeRepo.id] && (
                <div className="rounded-lg border p-3 font-mono text-[11px] whitespace-pre-wrap"
                  style={{ background: '#0a0a0f', borderColor: '#2a3347', color: '#8b949e', maxHeight: 120, overflow: 'auto' }}>
                  {pullOutput[activeRepo.id]}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Secrets Found', value: activeRepo.secretCount, color: activeRepo.secretCount > 0 ? '#f85149' : '#3fb950' },
                  { label: 'Branches', value: activeRepo.branches.length, color: 'var(--text-muted)' },
                  { label: 'Status', value: activeRepo.secretCount > 0 ? 'At Risk' : 'Clean', color: activeRepo.secretCount > 0 ? '#f85149' : '#3fb950' },
                ].map(card => (
                  <div key={card.label} className="rounded-lg border p-3"
                    style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                    <div className="text-[10px] mb-1" style={{ color: 'var(--text-dim)' }}>{card.label}</div>
                    <div className="text-lg font-mono font-bold" style={{ color: card.color }}>{card.value}</div>
                  </div>
                ))}
              </div>

              {/* Branch list */}
              {activeRepo.branches.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                    Branches ({activeRepo.branches.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeRepo.branches.map(b => (
                      <span key={b}
                        className="text-[10px] font-mono px-2 py-0.5 rounded border"
                        style={{
                          background: b === activeRepo.currentBranch ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : '#0f1117',
                          borderColor: b === activeRepo.currentBranch ? 'var(--accent)' : '#2a3347',
                          color: b === activeRepo.currentBranch ? 'var(--accent)' : '#8b949e',
                        }}>
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
