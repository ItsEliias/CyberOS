import { useState, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store';
import type { SourceType, ConflictStrategy, UpdateMode, ScrapeConfig } from '@shared/types';
import ScrapeSummary from './ScrapeSummary';

const SOURCE_TYPES: Array<{ id: SourceType; label: string }> = [
  { id: 'obsidian-publish', label: 'Obsidian Publish' },
  { id: 'website',          label: 'Website' },
  { id: 'github',           label: 'GitHub' },
  { id: 'youtube',          label: 'YouTube' },
  { id: 'pdf',              label: 'PDF' },
  { id: 'reddit',           label: 'Reddit' },
  { id: 'twitter',          label: 'Twitter / X' },
  { id: 'notion',           label: 'Notion' },
  { id: 'medium',           label: 'Medium / Substack' },
  { id: 'cve',              label: 'CVE / NVD' },
  { id: 'rss',              label: 'RSS Feed' },
];

const SUBFOLDER_MAP: Record<SourceType, string> = {
  'obsidian-publish': 'ObsidianPublish',
  'website': 'Web', 'github': 'GitHub', 'youtube': 'YouTube',
  'pdf': 'PDFs', 'reddit': 'Reddit', 'twitter': 'Twitter',
  'notion': 'Notion', 'medium': 'Articles', 'cve': 'CVEs', 'rss': 'RSS'
};

export default function ScrapeView() {
  const { isScraping, isPaused, progress, logEntries, lastResult, vaultPath,
    setIsScraping, setIsPaused, setProgress, addLog, clearLog, setLastResult } = useStore();

  const [sourceType, setSourceType] = useState<SourceType>('obsidian-publish');
  const [url, setUrl]               = useState('');
  const [outputSubfolder, setOutputSubfolder] = useState('ObsidianPublish');
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('skip');
  const [updateMode, setUpdateMode] = useState<UpdateMode>('all');
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [sourceName, setSourceName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pdfFiles, setPdfFiles]     = useState<string[]>([]);
  const [showPostScrape, setShowPostScrape] = useState(false);
  // Per-source config
  const [depth, setDepth]           = useState(3);
  const [maxPages, setMaxPages]     = useState(600);
  const [delay, setDelay]           = useState(800);
  const [branch, setBranch]         = useState('main');
  const [maxVideos, setMaxVideos]   = useState(50);
  const [includeComments, setIncludeComments] = useState(false);
  const [limit, setLimit]           = useState(25);
  const [cveIds, setCveIds]         = useState('');
  const [query, setQuery]           = useState('');

  const logRef = useRef<HTMLDivElement>(null);

  function selectType(type: SourceType) {
    setSourceType(type);
    setOutputSubfolder(SUBFOLDER_MAP[type] || type);
    setUrl('');
  }

  function autoDetectType(rawUrl: string) {
    const u = rawUrl.toLowerCase();
    if (u.includes('publish.obsidian.md')) selectType('obsidian-publish');
    else if (u.includes('github.com')) selectType('github');
    else if (u.includes('youtube.com') || u.includes('youtu.be')) selectType('youtube');
    else if (u.includes('reddit.com')) selectType('reddit');
    else if (u.includes('twitter.com') || u.includes('x.com')) selectType('twitter');
    else if (u.includes('notion.so')) selectType('notion');
    else if (u.includes('medium.com') || u.includes('substack.com')) selectType('medium');
  }

  function log(type: 'info' | 'success' | 'error' | 'warn', message: string) {
    addLog({ type, message, time: new Date().toLocaleTimeString() });
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 50);
  }

  const startScrape = useCallback(async () => {
    if (!vaultPath) { log('error', 'No vault path configured'); return; }
    clearLog();
    setShowPostScrape(false);
    setLastResult(null);

    const config: ScrapeConfig = {
      sourceType, url, outputSubfolder, conflictStrategy, updateMode, saveToLibrary,
      sourceName: sourceName || url.split('/').filter(Boolean).pop() || sourceType,
      pdfFiles: sourceType === 'pdf' ? pdfFiles : undefined,
      depth, maxPages, delay, branch, maxVideos, includeComments, limit, cveIds, query
    };

    setIsScraping(true);
    setIsPaused(false);
    log('info', `Starting ${sourceType} scrape${url ? `: ${url}` : ''}…`);

    // Subscribe to push events
    const unsubProgress = window.electronAPI.onScrapeProgress((data) => {
      setProgress(data);
      if (data.message) log('info', data.message);
    });
    const unsubComplete = window.electronAPI.onScrapeComplete((data) => {
      unsubProgress(); unsubComplete(); unsubError();
      setIsScraping(false);
      setIsPaused(false);
      setProgress(null);
      if (data.result) {
        setLastResult(data.result);
        log('success', `Done — ${data.result.saved} saved, ${data.result.updated} updated, ${data.result.failed} failed`);
      }
      setShowPostScrape(true);
    });
    const unsubError = window.electronAPI.onScrapeError((data) => {
      unsubProgress(); unsubComplete(); unsubError();
      setIsScraping(false);
      setIsPaused(false);
      setProgress(null);
      log('error', `Error: ${data.error}`);
    });

    const result = await window.electronAPI.startScrape(config);
    if (result.error) {
      unsubProgress(); unsubComplete(); unsubError();
      setIsScraping(false);
      log('error', result.error);
    }
  }, [sourceType, url, outputSubfolder, conflictStrategy, updateMode, saveToLibrary,
      sourceName, pdfFiles, depth, maxPages, delay, branch, maxVideos, includeComments,
      limit, cveIds, query, vaultPath]);

  async function pauseScrape() {
    await window.electronAPI.pauseScrape();
    setIsPaused(true);
    log('warn', 'Scrape paused');
  }

  async function resumeScrape() {
    await window.electronAPI.resumeScrape();
    setIsPaused(false);
    log('info', 'Scrape resumed');
  }

  async function stopScrape() {
    await window.electronAPI.stopScrape();
    setIsScraping(false);
    setIsPaused(false);
    setProgress(null);
    log('warn', 'Scrape stopped');
  }

  async function browsePdfs() {
    const files = await window.electronAPI.selectFiles([{ name: 'PDF Files', extensions: ['pdf'] }]);
    if (files.length) setPdfFiles(prev => [...new Set([...prev, ...files])]);
  }

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm outline-none";
  const inputStyle = { background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Config panel */}
      <div className="flex flex-col w-[420px] border-r overflow-y-auto p-5 space-y-4"
        style={{ borderColor: 'var(--border)', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
        <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>Scrape</div>

        {/* Source type pills */}
        <div>
          <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>Source Type</div>
          <div className="flex flex-wrap gap-1.5">
            {SOURCE_TYPES.map(t => (
              <button key={t.id} onClick={() => selectType(t.id)}
                className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                style={sourceType === t.id
                  ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' }
                  : { background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* URL / config inputs */}
        {sourceType !== 'pdf' && sourceType !== 'cve' && (
          <div>
            <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: 'var(--text-dim)' }}>URL</label>
            <input value={url} onChange={e => setUrl(e.target.value)}
              onPaste={e => setTimeout(() => autoDetectType(e.currentTarget.value), 50)}
              placeholder={sourceType === 'rss' ? 'https://feed.example.com/rss' : 'https://…'}
              className={inputCls} style={inputStyle} />
          </div>
        )}

        {sourceType === 'pdf' && (
          <div>
            <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: 'var(--text-dim)' }}>PDF Files</label>
            <button onClick={browsePdfs}
              className="w-full py-3 rounded-lg text-sm border-2 border-dashed transition-colors hover:bg-white/5"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              + Add PDF Files
            </button>
            {pdfFiles.map(f => (
              <div key={f} className="flex items-center justify-between mt-1 px-2 py-1 rounded text-xs"
                style={{ background: 'var(--bg3)', color: 'var(--text-muted)' }}>
                <span className="truncate">{f.split('/').pop()}</span>
                <button onClick={() => setPdfFiles(p => p.filter(x => x !== f))} style={{ color: '#f85149' }}>×</button>
              </div>
            ))}
          </div>
        )}

        {sourceType === 'cve' && (
          <div>
            <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: 'var(--text-dim)' }}>CVE IDs (comma-separated)</label>
            <input value={cveIds} onChange={e => setCveIds(e.target.value)}
              placeholder="CVE-2024-1234, CVE-2024-5678"
              className={inputCls} style={inputStyle} />
          </div>
        )}

        {/* Output subfolder */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: 'var(--text-dim)' }}>Output Subfolder</label>
            <input value={outputSubfolder} onChange={e => setOutputSubfolder(e.target.value)}
              className={inputCls} style={inputStyle} />
          </div>
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: 'var(--text-dim)' }}>Source Name</label>
            <input value={sourceName} onChange={e => setSourceName(e.target.value)}
              placeholder="Auto"
              className={inputCls} style={inputStyle} />
          </div>
        </div>

        {/* Conflict + Update mode */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: 'var(--text-dim)' }}>Conflict</label>
            <select value={conflictStrategy} onChange={e => setConflictStrategy(e.target.value as ConflictStrategy)}
              className={inputCls} style={inputStyle}>
              <option value="skip">Skip</option>
              <option value="overwrite">Overwrite</option>
              <option value="keepBoth">Keep Both</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: 'var(--text-dim)' }}>Mode</label>
            <select value={updateMode} onChange={e => setUpdateMode(e.target.value as UpdateMode)}
              className={inputCls} style={inputStyle}>
              <option value="all">All Content</option>
              <option value="updates">Updates Only</option>
            </select>
          </div>
        </div>

        {/* Advanced toggle */}
        <button onClick={() => setShowAdvanced(v => !v)}
          className="text-xs text-left transition-colors"
          style={{ color: 'var(--accent)' }}>
          {showAdvanced ? '▼' : '▶'} Advanced Options
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-3">
              <div className="flex gap-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                  <input type="checkbox" checked={saveToLibrary} onChange={e => setSaveToLibrary(e.target.checked)} />
                  Save to source library
                </label>
              </div>
              {(sourceType === 'website' || sourceType === 'obsidian-publish') && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: 'var(--text-dim)' }}>Depth</label>
                    <input type="number" value={depth} onChange={e => setDepth(+e.target.value)} min={1} max={10}
                      className={inputCls} style={inputStyle} />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: 'var(--text-dim)' }}>Max Pages</label>
                    <input type="number" value={maxPages} onChange={e => setMaxPages(+e.target.value)} min={1}
                      className={inputCls} style={inputStyle} />
                  </div>
                </div>
              )}
              {sourceType === 'youtube' && (
                <div>
                  <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: 'var(--text-dim)' }}>Max Videos</label>
                  <input type="number" value={maxVideos} onChange={e => setMaxVideos(+e.target.value)} min={1}
                    className={inputCls} style={inputStyle} />
                </div>
              )}
              {(sourceType === 'reddit' || sourceType === 'medium') && (
                <div>
                  <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: 'var(--text-dim)' }}>Post Limit</label>
                  <input type="number" value={limit} onChange={e => setLimit(+e.target.value)} min={1}
                    className={inputCls} style={inputStyle} />
                </div>
              )}
              <div>
                <label className="text-[10px] uppercase tracking-widest block mb-1" style={{ color: 'var(--text-dim)' }}>
                  Request Delay (ms) — {(delay / 1000).toFixed(1)}s
                </label>
                <input type="range" min={200} max={5000} step={100} value={delay} onChange={e => setDelay(+e.target.value)}
                  className="w-full" style={{ accentColor: 'var(--accent)' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          {!isScraping ? (
            <button onClick={startScrape} disabled={!vaultPath || (sourceType !== 'pdf' && sourceType !== 'cve' && !url.trim())}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40 transition-all"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              ⚡ Start Scrape
            </button>
          ) : (
            <>
              {!isPaused ? (
                <button onClick={pauseScrape}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all"
                  style={{ borderColor: '#d29922', color: '#d29922' }}>
                  ⏸ Pause
                </button>
              ) : (
                <button onClick={resumeScrape}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all"
                  style={{ borderColor: '#3fb950', color: '#3fb950' }}>
                  ▶ Resume
                </button>
              )}
              <button onClick={stopScrape}
                className="py-2.5 px-4 rounded-lg text-sm font-medium border transition-all"
                style={{ borderColor: '#f85149', color: '#f85149' }}>
                ■ Stop
              </button>
            </>
          )}
        </div>
      </div>

      {/* Right panel: progress + log */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Progress bar */}
        <AnimatePresence>
          {isScraping && progress && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="border-b p-4 space-y-2"
              style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>{progress.message}</span>
                <span className="font-mono">{Math.round(progress.percent)}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div className="progress-bar-fill" style={{ width: `${progress.percent}%` }} />
              </div>
              {progress.saved !== undefined && (
                <div className="flex gap-4 text-[10px]" style={{ color: 'var(--text-dim)' }}>
                  <span style={{ color: '#3fb950' }}>✓ {progress.saved ?? 0} saved</span>
                  <span style={{ color: '#7bb8ff' }}>↑ {progress.updated ?? 0} updated</span>
                  <span style={{ color: '#f85149' }}>✗ {progress.failed ?? 0} failed</span>
                </div>
              )}
              {isPaused && <div className="text-xs" style={{ color: '#d29922' }}>⏸ Paused</div>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Post-scrape summary */}
        <AnimatePresence>
          {showPostScrape && lastResult && (
            <ScrapeSummary
              result={lastResult}
              onOpenObsidian={() => window.electronAPI.openVaultInObsidian()}
              onViewSources={() => useStore.getState().setActiveView('sources')}
              onNewScrape={() => { setShowPostScrape(false); setLastResult(null); clearLog(); setUrl(''); }}
            />
          )}
        </AnimatePresence>

        {/* Log */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b text-xs"
            style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}>
            <span style={{ color: 'var(--text-dim)' }}>Log</span>
            <button onClick={clearLog} style={{ color: 'var(--text-dim)' }}>Clear</button>
          </div>
          <div ref={logRef}
            className="flex-1 overflow-y-auto p-3 space-y-0.5 font-mono"
            style={{ fontSize: 11, scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
            {logEntries.length === 0 && (
              <div style={{ color: 'var(--text-dim)' }}>No output yet. Start a scrape to see logs here.</div>
            )}
            {logEntries.map((entry, i) => (
              <div key={i} className={`log-entry-${entry.type}`}>
                <span style={{ color: 'var(--text-dim)' }}>[{entry.time}] </span>
                {entry.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
