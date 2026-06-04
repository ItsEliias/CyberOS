// Feature 15: Conflict resolution UI for secrets files
import { useState, useEffect } from 'react';
import type { ConflictBlock } from '../../types/vaultcore';

function parseConflicts(content: string): ConflictBlock[] {
  const blocks: ConflictBlock[] = [];
  const lines = content.split('\n');
  let i = 0, lineIdx = 0;
  while (i < lines.length) {
    if (lines[i].startsWith('<<<<<<<')) {
      const startLine = lineIdx;
      const ours: string[] = [];
      const theirs: string[] = [];
      const marker = lines[i];
      i++;
      while (i < lines.length && !lines[i].startsWith('=======')) { ours.push(lines[i]); i++; }
      i++; // skip =======
      while (i < lines.length && !lines[i].startsWith('>>>>>>>')) { theirs.push(lines[i]); i++; }
      i++; // skip >>>>>>>
      blocks.push({ marker, oursLines: ours, theirsLines: theirs, startLine });
    } else { i++; }
    lineIdx++;
  }
  return blocks;
}

function applyResolutions(original: string, blocks: ConflictBlock[]): string {
  let result = original;
  for (const block of [...blocks].reverse()) {
    let chosen = '';
    if (block.resolved === 'ours') chosen = block.oursLines.join('\n');
    else if (block.resolved === 'theirs') chosen = block.theirsLines.join('\n');
    else if (block.resolved === 'manual') chosen = block.manualContent ?? '';
    const conflictText = `${block.marker}\n${block.oursLines.join('\n')}\n=======\n${block.theirsLines.join('\n')}\n>>>>>>>`;
    result = result.replace(conflictText, chosen);
  }
  return result;
}

interface Props {
  filePath: string;
  onDone: () => void;
}

export default function ConflictResolution({ filePath, onDone }: Props) {
  const [blocks, setBlocks] = useState<ConflictBlock[]>([]);
  const [original, setOriginal] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    window.electronAPI.readFile(filePath).then((content) => {
      if (!content) return;
      setOriginal(content);
      setBlocks(parseConflicts(content));
    });
  }, [filePath]);

  function setResolution(idx: number, resolution: ConflictBlock['resolved'], manual?: string) {
    setBlocks((prev) => prev.map((b, i) =>
      i === idx ? { ...b, resolved: resolution, manualContent: manual ?? b.manualContent } : b
    ));
  }

  async function save() {
    if (blocks.some((b) => !b.resolved)) { setError('Resolve all conflicts first'); return; }
    setSaving(true);
    const resolved = applyResolutions(original, blocks);
    const res = await window.electronAPI.resolveConflictFile(filePath, resolved);
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    onDone();
  }

  const allResolved = blocks.length > 0 && blocks.every((b) => b.resolved);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0"
        style={{ borderColor: '#2a3347' }}>
        <span className="text-sm font-semibold" style={{ color: '#e6edf3' }}>Conflict Resolution</span>
        <span className="font-mono text-xs truncate" style={{ color: '#8b949e' }}>
          {filePath.split('/').pop()}
        </span>
        <span className="text-[11px]" style={{ color: '#d29922' }}>{blocks.length} conflict{blocks.length !== 1 ? 's' : ''}</span>
        <div className="flex-1" />
        {error && <span className="text-xs" style={{ color: '#f85149' }}>{error}</span>}
        <button onClick={save} disabled={saving || !allResolved}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
          style={{ background: allResolved ? '#3fb950' : '#2a3347', color: '#fff' }}>
          {saving ? 'Saving…' : 'Save & Stage'}
        </button>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 space-y-6" style={{ scrollbarWidth: 'thin' }}>
        {blocks.map((block, idx) => (
          <div key={idx} className="border rounded-lg overflow-hidden" style={{ borderColor: '#2a3347' }}>
            <div className="px-3 py-2 flex items-center gap-3 border-b" style={{ background: '#0a0a0f', borderColor: '#2a3347' }}>
              <span className="text-[10px] font-mono" style={{ color: '#d29922' }}>Conflict #{idx + 1}</span>
              {block.resolved && (
                <span className="text-[9px] px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(63,185,80,0.15)', color: '#3fb950' }}>
                  RESOLVED: {block.resolved}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2">
              {/* Ours */}
              <div className="border-r" style={{ borderColor: '#2a3347' }}>
                <div className="px-3 py-1.5 flex items-center justify-between border-b"
                  style={{ background: 'rgba(63,185,80,0.06)', borderColor: '#2a3347' }}>
                  <span className="text-[10px] font-semibold" style={{ color: '#3fb950' }}>OURS</span>
                  <button onClick={() => setResolution(idx, 'ours')}
                    className="text-[10px] px-2 py-0.5 rounded transition-all"
                    style={{ background: block.resolved === 'ours' ? '#3fb950' : 'transparent', color: block.resolved === 'ours' ? '#fff' : '#3fb950', border: '1px solid #3fb950' }}>
                    Accept
                  </button>
                </div>
                <pre className="px-3 py-2 text-[11px] font-mono overflow-auto max-h-40 whitespace-pre-wrap"
                  style={{ color: '#e6edf3', background: 'rgba(63,185,80,0.04)' }}>
                  {block.oursLines.join('\n') || '(empty)'}
                </pre>
              </div>

              {/* Theirs */}
              <div>
                <div className="px-3 py-1.5 flex items-center justify-between border-b"
                  style={{ background: 'rgba(248,81,73,0.06)', borderColor: '#2a3347' }}>
                  <span className="text-[10px] font-semibold" style={{ color: '#f85149' }}>THEIRS</span>
                  <button onClick={() => setResolution(idx, 'theirs')}
                    className="text-[10px] px-2 py-0.5 rounded transition-all"
                    style={{ background: block.resolved === 'theirs' ? '#f85149' : 'transparent', color: block.resolved === 'theirs' ? '#fff' : '#f85149', border: '1px solid #f85149' }}>
                    Accept
                  </button>
                </div>
                <pre className="px-3 py-2 text-[11px] font-mono overflow-auto max-h-40 whitespace-pre-wrap"
                  style={{ color: '#e6edf3', background: 'rgba(248,81,73,0.04)' }}>
                  {block.theirsLines.join('\n') || '(empty)'}
                </pre>
              </div>
            </div>

            {/* Manual edit */}
            <div className="border-t px-3 py-2" style={{ borderColor: '#2a3347', background: '#0a0a0f' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px]" style={{ color: '#8b949e' }}>Manual Edit</span>
                <button onClick={() => setResolution(idx, 'manual')}
                  className="text-[10px] px-2 py-0.5 rounded"
                  style={{ background: block.resolved === 'manual' ? '#7bb8ff' : 'transparent', color: block.resolved === 'manual' ? '#fff' : '#7bb8ff', border: '1px solid #7bb8ff' }}>
                  Use Manual
                </button>
              </div>
              <textarea
                rows={3}
                value={block.manualContent ?? ''}
                onChange={(e) => setResolution(idx, block.resolved === 'manual' ? 'manual' : block.resolved, e.target.value)}
                className="w-full font-mono text-xs px-2 py-1.5 rounded border outline-none resize-none"
                style={{ background: '#161b27', borderColor: '#2a3347', color: '#e6edf3' }}
                placeholder="Type custom resolution..."
              />
            </div>
          </div>
        ))}

        {blocks.length === 0 && (
          <div className="flex items-center justify-center h-24">
            <span className="text-sm" style={{ color: '#8b949e' }}>No conflicts detected in this file</span>
          </div>
        )}
      </div>
    </div>
  );
}
