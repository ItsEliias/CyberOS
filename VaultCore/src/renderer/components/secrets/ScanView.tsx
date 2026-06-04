// Features 1,6,7,10,11,12,13: scan, entropy, reveal, icons, search, tags, expiry
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSecretStore } from '../../stores/useSecretStore';
import type { DetectedSecret, SecretEnv, SecretType } from '../../types/vaultcore';
import {
  maskValue, inferSecretType, inferEnvironment, shannonEntropy, fileTypeIcon
} from '../../utils/secretScanner';
import SecretRow from './SecretRow';
import RotationModal from './RotationModal';

function genId() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

const ENV_OPTS: SecretEnv[] = ['development', 'staging', 'production', 'unknown'];
const TYPE_OPTS: SecretType[] = ['api_key', 'password', 'certificate', 'token', 'private_key', 'other'];

export default function ScanView() {
  const {
    repos, activeRepoId, secrets, setSecrets, setScanResult,
    updateRepo, searchQuery, setSearchQuery, filterEnv, setFilterEnv,
    filterType, setFilterType, addAuditEntry, currentUser,
  } = useSecretStore();

  const activeRepo = repos.find((r) => r.id === activeRepoId);
  const [scanning, setScanning] = useState(false);
  const [scanStats, setScanStats] = useState<{ files: number; duration: number } | null>(null);
  const [rotatingSecret, setRotatingSecret] = useState<DetectedSecret | null>(null);
  const [revealAll, setRevealAll] = useState(false);
  const [confirmRevealAll, setConfirmRevealAll] = useState(false);

  const repoSecrets = secrets.filter((s) => s.repoId === (activeRepoId ?? ''));

  const filtered = useMemo(() => {
    let list = repoSecrets;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) =>
        s.filePath.toLowerCase().includes(q) ||
        s.patternType.toLowerCase().includes(q) ||
        s.environment.toLowerCase().includes(q) ||
        s.secretType.toLowerCase().includes(q) ||
        (s.comment ?? '').toLowerCase().includes(q)
      );
    }
    if (filterEnv) list = list.filter((s) => s.environment === filterEnv);
    if (filterType) list = list.filter((s) => s.secretType === filterType);
    return list;
  }, [repoSecrets, searchQuery, filterEnv, filterType]);

  async function runScan() {
    if (!activeRepo) return;
    setScanning(true);
    try {
      const res = await window.electronAPI.scanDirectory(activeRepo.path);
      if (res.error || !res.results) { setScanning(false); return; }

      const detected: DetectedSecret[] = res.results.map((r) => ({
        id: genId(),
        repoId: activeRepoId!,
        filePath: r.filePath.replace(activeRepo.path, '').replace(/^[/\\]/, ''),
        lineNumber: r.lineNumber,
        patternType: r.patternType as DetectedSecret['patternType'],
        maskedValue: maskValue(r.rawValue),
        entropy: shannonEntropy(r.rawValue),
        environment: inferEnvironment(r.filePath),
        secretType: inferSecretType(r.patternType as DetectedSecret['patternType'], r.filePath),
        rotationHistory: [],
        tags: [],
      }));

      setSecrets(activeRepoId!, detected);
      setScanStats({ files: res.filesScanned ?? 0, duration: res.duration ?? 0 });
      setScanResult(activeRepoId!, {
        repoId: activeRepoId!, scannedAt: new Date().toISOString(),
        secrets: detected, filesScanned: res.filesScanned ?? 0, duration: res.duration ?? 0,
      });
      updateRepo(activeRepoId!, { lastScanAt: new Date().toISOString(), secretCount: detected.length });
      addAuditEntry({ timestamp: new Date().toISOString(), action: 'scan', user: currentUser,
        detail: `Scanned ${res.filesScanned} files, found ${detected.length} secrets` });
    } finally { setScanning(false); }
  }

  function handleRevealAll() {
    if (!confirmRevealAll) { setConfirmRevealAll(true); return; }
    setRevealAll(true);
    setConfirmRevealAll(false);
    addAuditEntry({ timestamp: new Date().toISOString(), action: 'reveal', user: currentUser, detail: 'Reveal All triggered' });
    setTimeout(() => setRevealAll(false), 10000);
  }

  if (!activeRepo) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm" style={{ color: '#8b949e' }}>Select a repository to scan</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b flex items-center gap-3 flex-wrap shrink-0"
        style={{ background: '#0f1117', borderColor: '#2a3347' }}>
        <div className="text-sm font-semibold" style={{ color: '#e6edf3' }}>
          {activeRepo.name}
        </div>
        <span className="text-[10px] font-mono truncate" style={{ color: '#8b949e' }}>
          {activeRepo.path}
        </span>
        <div className="flex-1" />

        {/* Search (Feature 11) */}
        <input
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search secrets..."
          className="px-3 py-1.5 rounded-lg text-xs border outline-none w-44"
          style={{ background: '#161b27', borderColor: '#2a3347', color: '#e6edf3' }}
        />

        {/* Filter env */}
        <select value={filterEnv ?? ''} onChange={(e) => setFilterEnv(e.target.value || null)}
          className="px-2 py-1.5 rounded-lg text-xs border outline-none"
          style={{ background: '#161b27', borderColor: '#2a3347', color: '#e6edf3' }}>
          <option value="">All Envs</option>
          {ENV_OPTS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>

        {/* Filter type */}
        <select value={filterType ?? ''} onChange={(e) => setFilterType(e.target.value || null)}
          className="px-2 py-1.5 rounded-lg text-xs border outline-none"
          style={{ background: '#161b27', borderColor: '#2a3347', color: '#e6edf3' }}>
          <option value="">All Types</option>
          {TYPE_OPTS.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>

        {repoSecrets.length > 0 && (
          <button onClick={handleRevealAll}
            className="px-3 py-1.5 rounded-lg text-xs border transition-all hover:bg-white/5"
            style={{ borderColor: confirmRevealAll ? '#f85149' : '#2a3347', color: confirmRevealAll ? '#f85149' : '#8b949e' }}>
            {confirmRevealAll ? 'Confirm Reveal All?' : 'Reveal All'}
          </button>
        )}

        <button onClick={runScan} disabled={scanning}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
          style={{ background: '#3fb950', color: '#fff' }}>
          {scanning ? 'Scanning…' : 'Scan'}
        </button>
      </div>

      {/* Stats bar */}
      {scanStats && (
        <div className="px-4 py-2 flex items-center gap-4 text-[11px] border-b shrink-0"
          style={{ background: 'rgba(63,185,80,0.06)', borderColor: '#2a3347' }}>
          <span style={{ color: '#3fb950' }}>{repoSecrets.length} secrets found</span>
          <span style={{ color: '#8b949e' }}>{scanStats.files} files scanned</span>
          <span style={{ color: '#8b949e' }}>{scanStats.duration}ms</span>
          {filtered.length !== repoSecrets.length && (
            <span style={{ color: '#d29922' }}>{filtered.length} shown (filtered)</span>
          )}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-auto px-4 py-3 space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
        {scanning && (
          <div className="flex items-center gap-3 py-8 justify-center">
            <motion.div className="w-2 h-2 rounded-full" style={{ background: '#3fb950' }}
              animate={{ scale: [1, 1.4, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} />
            <span className="text-sm" style={{ color: '#3fb950' }}>Scanning repository…</span>
          </div>
        )}

        {!scanning && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-2xl">{repoSecrets.length > 0 ? '🔍' : '🛡'}</span>
            <span className="text-sm" style={{ color: '#8b949e' }}>
              {repoSecrets.length > 0 ? 'No secrets match filters' : 'No secrets detected — run a scan'}
            </span>
          </div>
        )}

        {!scanning && filtered.map((secret) => (
          <div key={secret.id} className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <SecretRow
                secret={revealAll ? { ...secret, revealedAt: Date.now() } : secret}
                onRevealAudit={(id) => addAuditEntry({
                  timestamp: new Date().toISOString(), action: 'view',
                  secretId: id, secretFile: secret.filePath, user: currentUser,
                })}
              />
            </div>
            <button onClick={() => setRotatingSecret(secret)}
              className="shrink-0 px-2.5 py-2 text-[10px] rounded border transition-all hover:bg-yellow-500/10 mt-0.5"
              style={{ borderColor: '#2a3347', color: '#d29922' }}
              title="Rotate secret">
              Rotate
            </button>
          </div>
        ))}
      </div>

      {rotatingSecret && (
        <RotationModal secret={rotatingSecret} onClose={() => setRotatingSecret(null)} />
      )}
    </div>
  );
}
