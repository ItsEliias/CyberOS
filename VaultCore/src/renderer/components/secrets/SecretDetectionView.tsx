// Main view for all secret detection features — tabs: Repos / Scan / Diff / Audit / Sync / Conflicts
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import RepoTabBar from './RepoTabBar';
import ScanView from './ScanView';
import { BranchDiff } from './GitDiffViewer';
import AuditLogView from './AuditLogView';
import CredVaultSync from './CredVaultSync';
import ConflictResolution from './ConflictResolution';
import { useSecretStore } from '../../stores/useSecretStore';
import { useVaultCoreStore } from '../../stores/useVaultCoreStore';

type Panel = 'repos' | 'scan' | 'diff' | 'audit' | 'sync' | 'conflicts';

const PANELS: Array<{ id: Panel; label: string }> = [
  { id: 'repos',     label: 'Repositories' },
  { id: 'scan',      label: 'Secrets' },
  { id: 'diff',      label: 'Branch Diff' },
  { id: 'conflicts', label: 'Conflicts' },
  { id: 'audit',     label: 'Audit Log' },
  { id: 'sync',      label: 'CredVault Sync' },
];

// Map sidebar activeView to panel
const VIEW_TO_PANEL: Record<string, Panel> = {
  repos: 'repos', scan: 'scan', branches: 'diff',
  conflicts: 'conflicts', audit: 'audit', credvault: 'sync',
};

export default function SecretDetectionView() {
  const { repos, activeRepoId } = useSecretStore();
  const { activeView } = useVaultCoreStore();
  const [panel, setPanel] = useState<Panel>(() => VIEW_TO_PANEL[activeView] ?? 'scan');
  const [conflictFile, setConflictFile] = useState('');
  const [pullStatus, setPullStatus] = useState<'idle' | 'pulling' | 'done' | 'error'>('idle');
  const [pullMsg, setPullMsg] = useState('');

  // Sync panel when sidebar navigation changes
  useEffect(() => {
    const mapped = VIEW_TO_PANEL[activeView];
    if (mapped) setPanel(mapped);
  }, [activeView]);

  const activeRepo = repos.find((r) => r.id === activeRepoId);

  async function handlePull() {
    if (!activeRepo) return;
    setPullStatus('pulling'); setPullMsg('');
    const res = await window.electronAPI.gitPull(activeRepo.path);
    if (res.error) { setPullStatus('error'); setPullMsg(res.error); }
    else {
      setPullStatus('done');
      const lines = (res.output ?? '').split('\n').filter(Boolean);
      setPullMsg(lines[lines.length - 1] ?? 'Up to date');
      setTimeout(() => setPullStatus('idle'), 4000);
    }
  }

  async function findConflicts() {
    if (!activeRepo) return;
    const res = await window.electronAPI.gitFindConflicts(activeRepo.path);
    if (res.conflictFiles && res.conflictFiles.length > 0) {
      setConflictFile(res.conflictFiles[0]);
      setPanel('conflicts');
    } else {
      setPullMsg('No conflict files found');
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* Repo tabs */}
      <RepoTabBar />

      {/* Sub-panel nav + git actions */}
      <div className="flex items-center border-b shrink-0 px-2"
        style={{ background: '#0f1117', borderColor: '#2a3347' }}>
        <div className="flex items-center gap-0 flex-1">
          {PANELS.map((p) => (
            <button key={p.id}
              onClick={() => setPanel(p.id)}
              className="px-4 py-2 text-xs transition-all border-b-2"
              style={{
                borderBottomColor: panel === p.id ? '#3fb950' : 'transparent',
                color: panel === p.id ? '#e6edf3' : '#8b949e',
                background: 'transparent',
              }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Git pull (Feature 14) */}
        {activeRepo && (
          <div className="flex items-center gap-2 px-3">
            {pullStatus === 'done' && (
              <span className="text-[11px]" style={{ color: '#3fb950' }}>{pullMsg}</span>
            )}
            {pullStatus === 'error' && (
              <span className="text-[11px]" style={{ color: '#f85149' }}>{pullMsg}</span>
            )}
            <button onClick={findConflicts}
              className="px-3 py-1.5 rounded text-xs border transition-all hover:bg-white/5"
              style={{ borderColor: '#2a3347', color: '#d29922' }}>
              Find Conflicts
            </button>
            <button onClick={handlePull} disabled={pullStatus === 'pulling'}
              className="px-3 py-1.5 rounded text-xs border transition-all hover:bg-white/5 disabled:opacity-40"
              style={{ borderColor: '#2a3347', color: '#8b949e' }}>
              {pullStatus === 'pulling' ? 'Pulling…' : 'Pull'}
            </button>
          </div>
        )}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={panel} className="h-full"
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}>
            {panel === 'scan' && <ScanView />}
            {panel === 'diff' && activeRepo && (
              <BranchDiff repoPath={activeRepo.path} branches={activeRepo.branches} />
            )}
            {panel === 'diff' && !activeRepo && (
              <div className="flex items-center justify-center h-full">
                <span className="text-sm" style={{ color: '#8b949e' }}>No repository selected</span>
              </div>
            )}
            {panel === 'audit' && <AuditLogView />}
            {panel === 'sync' && <CredVaultSync />}
            {panel === 'conflicts' && conflictFile ? (
              <ConflictResolution filePath={conflictFile} onDone={() => setPanel('scan')} />
            ) : panel === 'conflicts' ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <p className="text-sm" style={{ color: '#8b949e' }}>No conflict file selected</p>
                <button onClick={findConflicts}
                  className="px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: '#d29922', color: '#fff' }}>
                  Scan for Conflicts
                </button>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
