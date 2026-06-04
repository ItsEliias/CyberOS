// Feature 2: diff viewer with syntax highlighting, Feature 3: branch comparison
import { useState } from 'react';
import type { GitFileDiff, GitDiffHunk, GitDiffLine } from '../../types/vaultcore';
import { fileTypeIcon } from '../../utils/secretScanner';

const SECRET_RE = /AKIA[0-9A-Z]{16}|eyJ[A-Za-z0-9_-]+\.eyJ|-----BEGIN[\w\s]*PRIVATE KEY-----|[a-zA-Z0-9_]{32,64}/;

function parseDiff(raw: string): GitFileDiff[] {
  const files: GitFileDiff[] = [];
  let current: GitFileDiff | null = null;
  let currentHunk: GitDiffHunk | null = null;
  let addLine = 0, delLine = 0;

  for (const line of raw.split('\n')) {
    if (line.startsWith('diff --git')) {
      const match = line.match(/b\/(.+)$/);
      current = { filePath: match?.[1] ?? 'unknown', hunks: [] };
      files.push(current);
    } else if (line.startsWith('@@') && current) {
      const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      delLine = parseInt(m?.[1] ?? '1', 10);
      addLine = parseInt(m?.[2] ?? '1', 10);
      currentHunk = { header: line, lines: [] };
      current.hunks.push(currentHunk);
    } else if (currentHunk) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        currentHunk.lines.push({ lineNumber: addLine++, content: line.slice(1), type: 'added', hasSecret: SECRET_RE.test(line) });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        currentHunk.lines.push({ lineNumber: delLine++, content: line.slice(1), type: 'removed', hasSecret: SECRET_RE.test(line) });
      } else if (!line.startsWith('+++') && !line.startsWith('---') && !line.startsWith('\\')) {
        currentHunk.lines.push({ lineNumber: addLine++, content: line.slice(1), type: 'context', hasSecret: false });
        delLine++;
      }
    }
  }
  return files;
}

function DiffLineRow({ dl }: { dl: GitDiffLine }) {
  const bg = dl.type === 'added' ? 'rgba(63,185,80,0.12)'
    : dl.type === 'removed' ? 'rgba(248,81,73,0.12)'
    : 'transparent';
  const col = dl.type === 'added' ? '#3fb950' : dl.type === 'removed' ? '#f85149' : '#8b949e';
  const prefix = dl.type === 'added' ? '+' : dl.type === 'removed' ? '-' : ' ';

  return (
    <div className="flex items-start font-mono text-[11px] leading-5"
      style={{ background: dl.hasSecret ? 'rgba(248,81,73,0.18)' : bg }}>
      <span className="w-10 shrink-0 text-right pr-2 select-none text-[10px]"
        style={{ color: '#4a5568', borderRight: '1px solid #2a3347', lineHeight: '20px' }}>
        {dl.lineNumber}
      </span>
      <span className="w-4 shrink-0 text-center select-none" style={{ color: col }}>{prefix}</span>
      <span className="flex-1 whitespace-pre-wrap break-all px-1" style={{ color: dl.hasSecret ? '#f85149' : '#e6edf3' }}>
        {dl.content}
      </span>
      {dl.hasSecret && (
        <span className="shrink-0 text-[9px] px-1.5 mr-1 rounded self-center"
          style={{ background: 'rgba(248,81,73,0.2)', color: '#f85149' }}>SECRET</span>
      )}
    </div>
  );
}

interface BranchDiffProps {
  repoPath: string;
  branches: string[];
}

export function BranchDiff({ repoPath, branches }: BranchDiffProps) {
  const [b1, setB1] = useState(branches[0] ?? '');
  const [b2, setB2] = useState(branches[1] ?? '');
  const [files, setFiles] = useState<GitFileDiff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function compare() {
    if (!b1 || !b2) return;
    setLoading(true); setError('');
    const res = await window.electronAPI.gitDiffBranches(repoPath, b1, b2);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setFiles(parseDiff(res.diff ?? ''));
    setExpanded(new Set());
  }

  function toggle(fp: string) {
    setExpanded((prev) => { const n = new Set(prev); n.has(fp) ? n.delete(fp) : n.add(fp); return n; });
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0"
        style={{ borderColor: '#2a3347' }}>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: '#8b949e' }}>Compare</span>
        <select value={b1} onChange={(e) => setB1(e.target.value)}
          className="px-2 py-1.5 rounded text-xs border outline-none"
          style={{ background: '#161b27', borderColor: '#2a3347', color: '#e6edf3' }}>
          {branches.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <span style={{ color: '#8b949e' }}>→</span>
        <select value={b2} onChange={(e) => setB2(e.target.value)}
          className="px-2 py-1.5 rounded text-xs border outline-none"
          style={{ background: '#161b27', borderColor: '#2a3347', color: '#e6edf3' }}>
          {branches.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <button onClick={compare} disabled={loading || b1 === b2}
          className="px-4 py-1.5 rounded text-xs font-semibold disabled:opacity-40"
          style={{ background: '#3fb950', color: '#fff' }}>
          {loading ? 'Loading…' : 'Diff'}
        </button>
        {files.length > 0 && (
          <span className="ml-auto text-[11px]" style={{ color: '#8b949e' }}>{files.length} files</span>
        )}
      </div>

      {error && <div className="px-4 py-2 text-xs" style={{ color: '#f85149' }}>{error}</div>}

      <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
        {files.length === 0 && !loading && (
          <div className="flex items-center justify-center h-32">
            <span className="text-sm" style={{ color: '#8b949e' }}>Select two branches and click Diff</span>
          </div>
        )}
        {files.map((file) => (
          <div key={file.filePath} className="border-b" style={{ borderColor: '#2a3347' }}>
            <button
              onClick={() => toggle(file.filePath)}
              className="w-full flex items-center gap-2 px-4 py-2 text-left transition-all hover:bg-white/5">
              <span>{fileTypeIcon(file.filePath)}</span>
              <span className="font-mono text-xs flex-1 truncate" style={{ color: '#e6edf3' }}>{file.filePath}</span>
              <span className="text-[10px]" style={{ color: '#8b949e' }}>
                {file.hunks.reduce((a, h) => a + h.lines.filter((l) => l.type === 'added').length, 0)} added /
                {file.hunks.reduce((a, h) => a + h.lines.filter((l) => l.type === 'removed').length, 0)} removed
              </span>
              {file.hunks.some((h) => h.lines.some((l) => l.hasSecret)) && (
                <span className="text-[9px] px-1.5 rounded" style={{ background: 'rgba(248,81,73,0.15)', color: '#f85149' }}>
                  SECRETS
                </span>
              )}
              <span style={{ color: '#8b949e' }}>{expanded.has(file.filePath) ? '▲' : '▼'}</span>
            </button>
            {expanded.has(file.filePath) && (
              <div className="border-t" style={{ borderColor: '#2a3347' }}>
                {file.hunks.map((hunk, hi) => (
                  <div key={hi}>
                    <div className="px-4 py-1 text-[10px] font-mono"
                      style={{ background: '#0a0a0f', color: '#8b949e' }}>{hunk.header}</div>
                    {hunk.lines.map((dl, li) => <DiffLineRow key={li} dl={dl} />)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
