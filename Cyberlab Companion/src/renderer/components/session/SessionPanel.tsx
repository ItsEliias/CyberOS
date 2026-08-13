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
        style={{
          width: 304,
          flexShrink: 0,
          background: 'var(--surface-0)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        <div className="empty-state" style={{ padding: 'var(--space-6) var(--space-4)' }}>
          <div className="empty-icon">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="2" x2="4" y2="18" />
              <path d="M4 4 L16 4 L13 8 L16 12 L4 12" fill="rgba(180,79,255,0.12)" />
            </svg>
          </div>
          <div className="empty-title">No active session</div>
          <div className="empty-sub">
            Start a lab session to see your timer, findings, and session context here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="flex flex-col overflow-y-auto overflow-x-hidden"
        style={{
          width: 304,
          flexShrink: 0,
          background: 'var(--surface-0)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        {/* Session name header — instrument panel style */}
        <div
          className="flex-shrink-0 px-4 py-3"
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--surface-0)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--type-body)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {session.labName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <span className="platform-badge" data-platform={session.platform}>
              {session.platform}
            </span>
            {session.difficulty && (
              <span className="diff-pill" data-diff={session.difficulty}>
                {session.difficulty}
              </span>
            )}
            {session.labType && (
              <span
                style={{
                  fontSize: 'var(--type-caption)',
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                }}
              >
                {session.labType}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col flex-1">
          {/* Timer — primary instrument */}
          <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--border-subtle)' }}>
            <TimerCard onStop={handleStop} />
          </div>

          {/* Session metadata — compact metric rows */}
          <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--border-subtle)' }}>
            <SessionMeta session={session} />
          </div>

          {/* Findings panel */}
          <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--border-subtle)' }}>
            <FindingsPanel onViewAll={handleViewAllFindings} />
          </div>

          {/* Flag HUD strip */}
          {session.findings.flags.length > 0 && (
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--space-2) var(--space-3)',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'rgba(63,185,80,0.04)',
              }}
            >
              <span
                style={{ fontSize: 'var(--type-caption)', fontFamily: 'var(--font-mono)', color: '#3fb950', fontWeight: 500 }}
              >
                {session.findings.flags.length} flag{session.findings.flags.length !== 1 ? 's' : ''}
              </span>
              {(session.timer?.elapsed ?? 0) > 0 && (
                <span style={{ fontSize: 'var(--type-caption)', fontFamily: 'var(--font-mono)', color: '#3fb950', opacity: 0.65 }}>
                  {((session.findings.flags.length / Math.max(1, (session.timer?.elapsed ?? 1) / 3600))).toFixed(1)}/hr
                </span>
              )}
            </div>
          )}

          {/* Collapsible sections */}
          <div style={{ padding: 'var(--space-2) var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>

            {/* CTF Flag Tracker */}
            <button
              className="w-full rounded flex items-center justify-between"
              onClick={() => setShowFlagTracker(true)}
              style={{
                padding: '6px 8px',
                fontSize: 'var(--type-body)',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="2" x2="3" y2="14" />
                  <path d="M3 3 L13 3 L11 7 L13 11 L3 11" />
                </svg>
                <span>Flag Tracker</span>
                {(session.ctfFlags?.length ?? 0) > 0 && (
                  <span style={{ fontSize: 'var(--type-caption)', fontFamily: 'var(--font-mono)', color: '#3fb950' }}>
                    {session.ctfFlags!.length}
                  </span>
                )}
              </span>
              <span style={{ opacity: 0.4, fontSize: 11 }}>→</span>
            </button>

            {/* Hints */}
            <button
              className="w-full rounded flex items-center justify-between"
              onClick={() => setShowHints(h => !h)}
              style={{
                padding: '6px 8px',
                fontSize: 'var(--type-body)',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="8" cy="8" r="6.5" />
                  <path d="M8 11v1M6 6.5a2 2 0 014 0c0 1-2 1.5-2 2.5" strokeLinejoin="round" />
                </svg>
                <span>Hints</span>
                {(session.sessionHints?.length ?? 0) > 0 && (
                  <span style={{ fontSize: 'var(--type-caption)', color: 'var(--accent)' }}>
                    {session.sessionHints!.filter(h => h.revealed).length}/{session.sessionHints!.length}
                  </span>
                )}
              </span>
              <span style={{ opacity: 0.4, fontSize: 10 }}>{showHints ? '▲' : '▼'}</span>
            </button>
            <AnimatePresence>
              {showHints && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div style={{ paddingTop: '4px' }}>
                    <HintsPanel />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notes */}
            <button
              className="w-full rounded flex items-center justify-between"
              onClick={() => setShowNotes(n => !n)}
              style={{
                padding: '6px 8px',
                fontSize: 'var(--type-body)',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V5z" />
                  <polyline points="11 2 11 5 14 5" />
                  <line x1="5" y1="8" x2="11" y2="8" /><line x1="5" y1="11" x2="8" y2="11" />
                </svg>
                <span>Notes</span>
                {notesValue && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#b44fff', display: 'inline-block' }} />}
              </span>
              <span style={{ opacity: 0.4, fontSize: 10 }}>{showNotes ? '▲' : '▼'}</span>
            </button>
            <AnimatePresence>
              {showNotes && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div style={{ paddingTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <textarea
                      value={notesValue}
                      onChange={e => setNotesValue(e.target.value)}
                      placeholder="Session notes (Markdown supported)…"
                      className="w-full font-mono selectable resize-none"
                      style={{
                        height: 120,
                        background: 'var(--surface-1)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 8px',
                        color: 'var(--text-primary)',
                        fontSize: 'var(--type-label)',
                        outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="flex-1 btn-ghost" style={{ fontSize: 'var(--type-caption)', padding: '4px 8px', borderRadius: '4px' }} onClick={saveNotes}>
                        {notesSaved ? 'Saved ✓' : 'Save'}
                      </button>
                      <button className="flex-1 btn-ghost" style={{ fontSize: 'var(--type-caption)', padding: '4px 8px', borderRadius: '4px' }} onClick={saveNotesToVault} title="Save to GhostVault">
                        → Vault
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tool Launcher */}
            <button
              className="w-full rounded flex items-center justify-between"
              onClick={() => setShowTools(t => !t)}
              style={{
                padding: '6px 8px',
                fontSize: 'var(--type-body)',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2l-5 5M3 12l4-4" /><circle cx="11" cy="4" r="2" /><circle cx="5" cy="11" r="2" />
                </svg>
                <span>Tools</span>
              </span>
              <span style={{ opacity: 0.4, fontSize: 10 }}>{showTools ? '▲' : '▼'}</span>
            </button>
            <AnimatePresence>
              {showTools && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <ToolLauncher />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Methodology */}
            <button
              className="w-full rounded flex items-center justify-between"
              onClick={() => setShowMethodology(m => !m)}
              style={{
                padding: '6px 8px',
                fontSize: 'var(--type-body)',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="5" x2="13" y2="5" /><line x1="3" y1="8" x2="10" y2="8" /><line x1="3" y1="11" x2="8" y2="11" />
                </svg>
                <span>Methodology</span>
              </span>
              <span style={{ opacity: 0.4, fontSize: 10 }}>{showMethodology ? '▲' : '▼'}</span>
            </button>
            <AnimatePresence>
              {showMethodology && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <MethodologyGuide />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Screenshot capture */}
          <div style={{ padding: '0 var(--space-3) var(--space-2)' }}>
            <CaptureAnnotateButton sessionId={session.id} labName={session.labName} />
          </div>

          {/* Quick actions */}
          <div style={{ padding: '0 var(--space-3) var(--space-3)' }}>
            <QuickActions
              onFlagLogger={() => setShowFlagLogger(true)}
              onNotes={() => setShowNotes(n => !n)}
            />
          </div>
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
