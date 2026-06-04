import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../store';
import TimerCard from './TimerCard';
import SessionMeta from './SessionMeta';
import FindingsPanel from './FindingsPanel';
import QuickActions from './QuickActions';
import ToolLauncher from './ToolLauncher';
import MethodologyGuide from './MethodologyGuide';
import SessionCompleteModal from '../writeup/SessionCompleteModal';
import WriteupEditor from '../writeup/WriteupEditor';
import FlagLogger from '../flags/FlagLogger';
import FlagTracker from '../flags/FlagTracker';
import HintsPanel from './HintsPanel';
import { CaptureAnnotateButton } from '../ScreenshotAnnotator';
import type { Session } from '@shared/types';

export default function SessionPanel() {
  const { tabs, activeTabId, updateSession, updateTab, setActivePanel } = useStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const session = activeTab?.session;

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showWriteup, setShowWriteup] = useState(false);
  const [showFlagLogger, setShowFlagLogger] = useState(false);
  const [showFlagTracker, setShowFlagTracker] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const prevFindingsCountRef = useRef<number>(-1);

  // Load notes from session findings.notes
  useEffect(() => {
    if (session?.findings?.notes !== undefined) {
      setNotesValue(session.findings.notes);
    }
  }, [activeTabId]);

  // Auto-save notes every 30 seconds
  useEffect(() => {
    if (!showNotes) return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    const t = setTimeout(() => saveNotes(), 30000);
    setAutoSaveTimer(t);
    return () => clearTimeout(t);
  }, [notesValue, showNotes]);

  // Sync findingsCount to cyberlab_status whenever findings change
  useEffect(() => {
    if (!session || session.labName === 'New Session') return;
    const f = session.findings;
    const count = f.ports.length + f.credentials.length + f.flags.length + f.users.length + f.cves.length + f.hashes.length + f.files.length + f.services.length;
    if (count !== prevFindingsCountRef.current) {
      prevFindingsCountRef.current = count;
      try {
        (window.electronAPI as Record<string, Function>).updateLabFindings?.({ findingsCount: count }).catch(() => {});
      } catch {}
    }
  }, [session?.findings]);

  function saveNotes() {
    if (!activeTabId || !session) return;
    updateSession(activeTabId, {
      findings: { ...session.findings, notes: notesValue },
    });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  function handleStop() {
    setShowCompleteModal(true);
  }

  function handleComplete(opts: { addToHistory: boolean; updateStreak: boolean; generateWriteup: boolean }) {
    setShowCompleteModal(false);
    if (!session || !activeTabId) return;

    // Mark session complete
    updateSession(activeTabId, { complete: true });

    // Update ecosystem config
    try {
      (window.electronAPI as Record<string, Function>).endLab();
      if (opts.updateStreak) {
        (window.electronAPI as Record<string, Function>).completeLab({
          platform: session.platform,
          labType: session.labType,
        });
      }
    } catch {}

    if (opts.generateWriteup) {
      setShowWriteup(true);
    }
  }

  async function saveNotesToVault() {
    saveNotes();
    const { config } = useStore.getState();
    if (!config?.obsidianVault || !session) return;
    try {
      await window.electronAPI.saveWriteup({
        content: notesValue,
        labName: `${session.labName}-notes`,
        platform: session.platform,
        vaultPath: config.obsidianVault,
      });
    } catch {}
  }

  function handleViewAllFindings() {
    if (activeTabId) setActivePanel(activeTabId, 'findings');
  }

  if (!session || session.labName === 'New Session') {
    return (
      <div
        className="flex flex-col items-center justify-center h-full"
        style={{ width: 320, flexShrink: 0, background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)' }}
      >
        <div className="text-xs text-center px-4" style={{ color: 'var(--text-muted)' }}>
          Start a session to see info here
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="flex flex-col overflow-y-auto overflow-x-hidden"
        style={{
          width: 320,
          flexShrink: 0,
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Session name header */}
        <div
          className="px-3 py-2 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}
        >
          <div className="font-mono text-sm font-semibold truncate" style={{ color: 'var(--accent)' }}>
            {session.labName}
          </div>
        </div>

        <div className="flex flex-col gap-4 p-3 flex-1">
          {/* Timer */}
          <TimerCard onStop={handleStop} />

          {/* Session metadata */}
          <div
            className="rounded-lg p-3"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
          >
            <SessionMeta session={session} />
          </div>

          {/* Findings panel */}
          <FindingsPanel onViewAll={handleViewAllFindings} />

          {/* CTF Flag Tracker (collapsible) */}
          <div>
            <button
              className="w-full text-xs py-1.5 rounded btn-ghost flex items-center justify-between px-3"
              onClick={() => setShowFlagTracker(true)}
            >
              <span className="flex items-center gap-1.5">
                <span>🚩</span>
                <span>Flag Tracker</span>
                {(session.ctfFlags?.length ?? 0) > 0 && (
                  <span className="text-[10px] font-mono" style={{ color: '#3fb950' }}>
                    {session.ctfFlags!.length}
                  </span>
                )}
              </span>
              <span style={{ opacity: 0.5 }}>→</span>
            </button>
          </div>

          {/* Hints (collapsible) */}
          <div>
            <button
              className="w-full text-xs py-1.5 rounded btn-ghost flex items-center justify-between px-3"
              onClick={() => setShowHints(h => !h)}
            >
              <span className="flex items-center gap-1.5">
                <span>💡</span>
                <span>Hints</span>
                {(session.sessionHints?.length ?? 0) > 0 && (
                  <span className="text-[10px]" style={{ color: 'var(--accent)' }}>
                    {session.sessionHints!.filter(h => h.revealed).length}/{session.sessionHints!.length}
                  </span>
                )}
              </span>
              <span style={{ opacity: 0.5 }}>{showHints ? '▲' : '▼'}</span>
            </button>
            <AnimatePresence>
              {showHints && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="mt-1.5">
                    <HintsPanel />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notes (expandable) */}
          <div>
            <button
              className="w-full text-xs py-1.5 rounded btn-ghost flex items-center justify-between px-3"
              onClick={() => setShowNotes(n => !n)}
            >
              <span className="flex items-center gap-1.5">
                <span>📝</span>
                <span>Notes</span>
                {notesValue && <span className="text-[10px]" style={{ color: 'var(--accent)' }}>●</span>}
              </span>
              <span style={{ opacity: 0.5 }}>{showNotes ? '▲' : '▼'}</span>
            </button>

            <AnimatePresence>
              {showNotes && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="mt-1.5 flex flex-col gap-1.5">
                    <textarea
                      value={notesValue}
                      onChange={e => setNotesValue(e.target.value)}
                      placeholder="Session notes (Markdown supported)..."
                      className="w-full font-mono text-xs resize-none"
                      style={{
                        height: 140,
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '6px 8px',
                        color: 'var(--text)',
                        outline: 'none',
                      }}
                    />
                    <div className="flex gap-1.5">
                      <button
                        className="flex-1 btn-ghost text-xs py-1 rounded"
                        onClick={saveNotes}
                      >
                        {notesSaved ? 'Saved ✓' : 'Save'}
                      </button>
                      <button
                        className="flex-1 btn-ghost text-xs py-1 rounded"
                        onClick={saveNotesToVault}
                        title="Save to GhostVault"
                      >
                        → GhostVault
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Flag HUD — count + flags/hr */}
          {session.findings.flags.length > 0 && (
            <div
              className="flex items-center justify-between px-3 py-2 rounded"
              style={{ background: 'rgba(63,185,80,0.08)', border: '1px solid rgba(63,185,80,0.3)' }}
            >
              <span className="text-xs font-mono" style={{ color: '#3fb950' }}>
                {session.findings.flags.length} flag{session.findings.flags.length !== 1 ? 's' : ''}
              </span>
              {(session.timer?.elapsed ?? 0) > 0 && (
                <span className="text-[10px]" style={{ color: '#3fb950', opacity: 0.7 }}>
                  {((session.findings.flags.length / Math.max(1, (session.timer?.elapsed ?? 1) / 3600))).toFixed(1)}/hr
                </span>
              )}
            </div>
          )}

          {/* Tool Launcher (collapsible) */}
          <div>
            <button
              className="w-full text-xs py-1.5 rounded btn-ghost flex items-center justify-between px-3"
              onClick={() => setShowTools(t => !t)}
            >
              <span className="flex items-center gap-1.5">
                <span>🔧</span>
                <span>Launch Tool</span>
              </span>
              <span style={{ opacity: 0.5 }}>{showTools ? '▲' : '▼'}</span>
            </button>
            <AnimatePresence>
              {showTools && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <ToolLauncher />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Methodology Guide (collapsible) */}
          <div>
            <button
              className="w-full text-xs py-1.5 rounded btn-ghost flex items-center justify-between px-3"
              onClick={() => setShowMethodology(m => !m)}
            >
              <span className="flex items-center gap-1.5">
                <span>📋</span>
                <span>Methodology</span>
              </span>
              <span style={{ opacity: 0.5 }}>{showMethodology ? '▲' : '▼'}</span>
            </button>
            <AnimatePresence>
              {showMethodology && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <MethodologyGuide />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Screenshot capture */}
          <CaptureAnnotateButton sessionId={session.id} labName={session.labName} />

          {/* Quick actions */}
          <QuickActions
            onFlagLogger={() => setShowFlagLogger(true)}
            onNotes={() => setShowNotes(n => !n)}
          />
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCompleteModal && (
          <SessionCompleteModal
            session={session}
            onComplete={handleComplete}
            onCancel={() => setShowCompleteModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWriteup && (
          <div className="fixed inset-0 z-50" style={{ background: 'var(--bg)' }}>
            <WriteupEditor session={session} onClose={() => setShowWriteup(false)} />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFlagLogger && (
          <FlagLogger onClose={() => setShowFlagLogger(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFlagTracker && (
          <FlagTracker onClose={() => setShowFlagTracker(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
