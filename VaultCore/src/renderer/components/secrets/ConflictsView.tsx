// Feature 15: Conflict resolution UI
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSecretStore } from '../../stores/useSecretStore';
import type { ConflictBlock } from '../../types/vaultcore';

function parseConflicts(content: string): ConflictBlock[] {
  const blocks: ConflictBlock[] = [];
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith('<<<<<<<')) {
      const marker = lines[i];
      const oursLines: string[] = [];
      const theirsLines: string[] = [];
      let state: 'ours' | 'sep' | 'theirs' = 'ours';
      const startLine = i;
      i++;
      while (i < lines.length && !lines[i].startsWith('>>>>>>>')) {
        if (lines[i].startsWith('=======')) { state = 'theirs'; i++; continue; }
        if (state === 'ours') oursLines.push(lines[i]);
        else theirsLines.push(lines[i]);
        i++;
      }
      blocks.push({ marker, oursLines, theirsLines, startLine });
      i++;
    } else { i++; }
  }
  return blocks;
}

function resolveContent(original: string, blocks: ConflictBlock[]): string {
  let content = original;
  // Process in reverse so line positions don't shift
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    const resolved = b.resolved === 'ours' ? b.oursLines.join('\n')
      : b.resolved === 'theirs' ? b.theirsLines.join('\n')
      : b.resolved === 'manual' ? (b.manualContent ?? '')
      : null;
    if (resolved === null) continue;
    // Replace conflict block in content
    const conflictRe = new RegExp(
      '<<<<<<<[^\n]*\n[\\s\\S]*?=======\n[\\s\\S]*?>>>>>>>[^\n]*\n?',
    );
    content = content.replace(conflictRe, resolved + '\n');
  }
  return content;
}

interface BlockEditorProps {
  block: ConflictBlock;
  index: number;
  onResolve: (idx: number, choice: 'ours' | 'theirs' | 'manual', manual?: string) => void;
}

function BlockEditor({ block, index, onResolve }: BlockEditorProps) {
  const [manualEdit, setManualEdit] = useState(false);
  const [manualContent, setManualContent] = useState([...block.oursLines, ...block.theirsLines].join('\n'));

  return (
    <div className="rounded-lg border overflow-hidden"
      style={{ borderColor: block.resolved ? '#3fb950' : '#d29922' }}>
      <div className="flex items-center gap-3 px-3 py-2 border-b"
        style={{ background: '#161b27', borderColor: '#2a3347' }}>
        <span className="text-[10px] font-mono font-bold"
          style={{ color: '#d29922' }}>CONFLICT #{index + 1}</span>
        {block.resolved && (
          <span className="text-[9px] px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(63,185,80,0.15)', color: '#3fb950' }}>
            RESOLVED · {block.resolved}
          </span>
        )}
        <div className="ml-auto flex gap-1.5">
          <button onClick={() => onResolve(index, 'ours')}
            className="px-2.5 py-1 text-[10px] rounded font-medium transition-all"
            style={{ background: block.resolved === 'ours' ? '#3fb950' : 'transparent', color: block.resolved === 'ours' ? '#fff' : '#3fb950', border: '1px solid #3fb950' }}>
            Accept Ours
          </button>
          <button onClick={() => onResolve(index, 'theirs')}
            className="px-2.5 py-1 text-[10px] rounded font-medium transition-all"
            style={{ background: block.resolved === 'theirs' ? '#7bb8ff' : 'transparent', color: block.resolved === 'theirs' ? '#fff' : '#7bb8ff', border: '1px solid #7bb8ff' }}>
            Accept Theirs
          </button>
          <button onClick={() => setManualEdit(!manualEdit)}
            className="px-2.5 py-1 text-[10px] rounded font-medium transition-all"
            style={{ background: manualEdit ? '#d29922' : 'transparent', color: manualEdit ? '#fff' : '#d29922', border: '1px solid #d29922' }}>
            Edit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x" style={{ divideColor: '#2a3347' }}>
        <div>
          <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider border-b"
            style={{ background: 'rgba(63,185,80,0.06)', borderColor: '#2a3347', color: '#3fb950' }}>
            Ours
          </div>
          <pre className="px-3 py-2 text-[11px] font-mono overflow-auto max-h-32"
            style={{ color: '#e6edf3', scrollbarWidth: 'thin' }}>
            {block.oursLines.join('\n') || '(empty)'}
          </pre>
        </div>
        <div>
          <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider border-b"
            style={{ background: 'rgba(123,184,255,0.06)', borderColor: '#2a3347', color: '#7bb8ff' }}>
            Theirs
          </div>
          <pre className="px-3 py-2 text-[11px] font-mono overflow-auto max-h-32"
            style={{ color: '#e6edf3', scrollbarWidth: 'thin' }}>
            {block.theirsLines.join('\n') || '(empty)'}
          </pre>
        </div>
      </div>

      {manualEdit && (
        <div className="border-t p-3 space-y-2" style={{ borderColor: '#2a3347' }}>
          <div className="text-[10px]" style={{ color: '#d29922' }}>Manual resolution:</div>
          <textarea
            value={manualContent}
            onChange={e => setManualContent(e.target.value)}
            rows={4}
            className="w-full text-xs font-mono px-2 py-1.5 rounded border outline-none resize-none"
            style={{ background: '#0a0a0f', borderColor: '#2a3347', color: '#e6edf3' }} />
          <button onClick={() => { onResolve(index, 'manual', manualContent); setManualEdit(false); }}
            className="px-3 py-1 text-[10px] rounded font-semibold"
            style={{ background: '#d29922', color: '#fff' }}>
            Apply Manual
          </button>
        </div>
      )}
    </div>
  );
}

export default function ConflictsView() {
  const { repos, activeRepoId } = useSecretStore();
  const activeRepo = repos.find(r => r.id === activeRepoId);

  const [conflictFiles, setConflictFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [blocks, setBlocks] = useState<ConflictBlock[]>([]);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (activeRepo) scanForConflicts();
  }, [activeRepo?.id]);

  async function scanForConflicts() {
    if (!activeRepo) return;
    setScanning(true);
    const res = await window.electronAPI.gitFindConflicts(activeRepo.path);
    setConflictFiles(res.conflictFiles ?? []);
    setScanning(false);
  }

  async function loadFile(fp: string) {
    const content = await window.electronAPI.readFile(fp);
    if (!content) return;
    setSelectedFile(fp);
    setFileContent(content);
    setBlocks(parseConflicts(content));
  }

  function resolveBlock(idx: number, choice: 'ours' | 'theirs' | 'manual', manual?: string) {
    setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, resolved: choice, manualContent: manual } : b));
  }

  async function saveResolved() {
    if (!selectedFile) return;
    const unresolvedCount = blocks.filter(b => !b.resolved).length;
    if (unresolvedCount > 0) {
      if (!confirm(`${unresolvedCount} conflict(s) still unresolved. Save anyway?`)) return;
    }
    setSaving(true);
    const resolved = resolveContent(fileContent, blocks);
    const res = await window.electronAPI.resolveConflictFile(selectedFile, resolved);
    setSaving(false);
    if (res.success) {
      setSavedMsg('Saved and staged');
      setConflictFiles(prev => prev.filter(f => f !== selectedFile));
      setSelectedFile(null);
      setBlocks([]);
      setTimeout(() => setSavedMsg(''), 3000);
    }
  }

  if (!activeRepo) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm" style={{ color: '#8b949e' }}>Select a repository to check conflicts</p>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* File list */}
      <div className="flex flex-col border-r shrink-0"
        style={{ width: 240, borderColor: '#2a3347', background: '#0f1117' }}>
        <div className="px-3 py-3 border-b flex items-center justify-between"
          style={{ borderColor: '#2a3347' }}>
          <span className="text-xs font-semibold" style={{ color: '#e6edf3' }}>Conflict Files</span>
          <button onClick={scanForConflicts} disabled={scanning}
            className="text-[10px] px-2 py-1 rounded border transition-all"
            style={{ borderColor: '#2a3347', color: '#8b949e' }}>
            {scanning ? '…' : '↺'}
          </button>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1" style={{ scrollbarWidth: 'thin' }}>
          {conflictFiles.length === 0 && (
            <div className="text-center py-8 text-[11px]" style={{ color: '#4a5568' }}>
              {scanning ? 'Scanning…' : 'No conflicts detected'}
            </div>
          )}
          {conflictFiles.map(fp => (
            <button key={fp} onClick={() => loadFile(fp)}
              className="w-full text-left px-2 py-2 rounded text-[11px] font-mono truncate transition-all"
              style={{
                background: selectedFile === fp ? 'color-mix(in srgb, #d29922 10%, transparent)' : 'transparent',
                color: selectedFile === fp ? '#d29922' : '#8b949e',
                borderLeft: selectedFile === fp ? '2px solid #d29922' : '2px solid transparent',
              }}>
              {fp.split('/').pop()}
            </button>
          ))}
        </div>
      </div>

      {/* Block editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedFile ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm" style={{ color: '#8b949e' }}>
              {conflictFiles.length === 0 ? 'No conflicts — working tree is clean' : 'Select a file to resolve conflicts'}
            </p>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0"
              style={{ borderColor: '#2a3347' }}>
              <span className="text-xs font-mono flex-1 truncate" style={{ color: '#e6edf3' }}>
                {selectedFile.split('/').pop()}
              </span>
              <span className="text-[10px]" style={{ color: blocks.filter(b => b.resolved).length === blocks.length ? '#3fb950' : '#d29922' }}>
                {blocks.filter(b => b.resolved).length}/{blocks.length} resolved
              </span>
              {savedMsg && <span className="text-[10px]" style={{ color: '#3fb950' }}>{savedMsg}</span>}
              <button onClick={saveResolved} disabled={saving}
                className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-40"
                style={{ background: '#3fb950', color: '#fff' }}>
                {saving ? 'Saving…' : 'Save & Stage'}
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4" style={{ scrollbarWidth: 'thin' }}>
              {blocks.map((block, i) => (
                <BlockEditor key={i} block={block} index={i} onResolve={resolveBlock} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
