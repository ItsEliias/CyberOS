import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import TitleBar       from './components/layout/TitleBar';
import TabBar         from './components/layout/TabBar';
import StatusBar      from './components/layout/StatusBar';
import ContextBar     from './components/terminal/ContextBar';
import TerminalSplit  from './components/terminal/TerminalSplit';
import HistoryPanel   from './components/HistoryPanel';
import SessionsView   from './components/SessionsView';
import SettingsView   from './components/settings/SettingsView';
import SnippetPanel   from './components/SnippetPanel';
import CommandPalette from './components/CommandPalette';
import ToolLauncher   from './components/ToolLauncher';
import AlertToast     from './components/AlertToast';
import AiPanel        from './components/AiPanel';
import KeyboardShortcutsPanel from './components/KeyboardShortcutsPanel';
import { useTerminalLinkStore } from './stores/useTerminalLinkStore';
import type { CommandEntry } from '@shared/types';
import OnboardingModal, { useOnboarding } from './components/OnboardingModal';
import type { PaletteItem } from './components/CommandPalette';

const PANE_LEFT_ID  = `pane-left-${Date.now()}`;
const PANE_RIGHT_ID = `pane-right-${Date.now() + 1}`;

export default function App() {
  const onboarding = useOnboarding();
  const {
    sessions, activeSessionId, commandHistory, sharedContext,
    activeView, historyPanelOpen, splitModeEnabled, settings,
    broadcastMode, snippets, sshProfiles, snippetsPanelOpen,
    activeAlerts, commandPaletteOpen, toolLauncherOpen,
    createSession, setActiveSession, removeSession,
    renameSession, setSessionColor,
    addCommand, toggleHistoryPanel, toggleSplitMode,
    setActiveView, updateSettings, loadSharedContext,
    toggleBroadcastMode, toggleSnippetsPanel,
    addSnippet, removeSnippet,
    addSshProfile, removeSshProfile,
    setCommandPaletteOpen, setToolLauncherOpen,
    pushAlert, dismissAlert,
  } = useTerminalLinkStore();

  const versionRef = useRef('');
  const [activePane,  setActivePane]  = useState<'left' | 'right'>('left');
  const [lastCommand, setLastCommand] = useState('');
  const [lastOutput,  setLastOutput]  = useState('');
  const [statusCwd,   setStatusCwd]   = useState('');
  const [statusExit,  setStatusExit]  = useState<number | null>(null);
  const [kbPanelOpen, setKbPanelOpen] = useState(false);
  const [connecting,  setConnecting]  = useState(false);
  // Ref to write into active terminal (used by snippets/palette/ssh)
  const writeToTermRef = useRef<((data: string) => void) | null>(null);

  // Apply per-app theme CSS vars to :root
  useEffect(() => {
    const theme = settings.appTheme;
    if (!theme) return;
    const root = document.documentElement;
    root.style.setProperty('--app-accent', theme.accentColor);
    root.style.setProperty('--app-bg', theme.bgColor);
    root.style.setProperty('--app-text', theme.textColor);
    // Also drive the shared vars so existing components pick up changes
    root.style.setProperty('--accent', theme.accentColor);
    root.style.setProperty('--bg', theme.bgColor);
    root.style.setProperty('--text', theme.textColor);
  }, [settings.appTheme]);

  useEffect(() => {
    (async () => {
      await loadSharedContext();
      try {
        const ver = await window.electronAPI.getVersion();
        versionRef.current = ver;
      } catch { /* ignore */ }
    })();
    if (sessions.length === 0) createSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handle = setInterval(() => { loadSharedContext().catch(() => undefined); }, 10_000);
    return () => clearInterval(handle);
  }, [loadSharedContext]);

  // Global keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && e.key === 'p') { e.preventDefault(); setCommandPaletteOpen(true); }
      if (mod && e.shiftKey && e.key === 'b') { e.preventDefault(); handleBroadcastToggle(); }
      if (mod && e.key === 'l') { e.preventDefault(); setToolLauncherOpen(true); }
      if (mod && e.key === 't') { e.preventDefault(); handleNewSession(); }
      // ⌘? (Cmd+Shift+/ or Cmd+?) → keyboard shortcuts panel
      if (mod && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault();
        setKbPanelOpen(o => !o);
      }
      if (e.key === 'Escape') {
        if (commandPaletteOpen) setCommandPaletteOpen(false);
        if (toolLauncherOpen)   setToolLauncherOpen(false);
        if (kbPanelOpen)        setKbPanelOpen(false);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastMode, commandPaletteOpen, toolLauncherOpen, kbPanelOpen]);

  const handleCommand = useCallback((entry: CommandEntry) => {
    addCommand({ command: entry.command, pane: entry.pane, outputSnippet: entry.outputSnippet });
    setLastCommand(entry.command);
  }, [addCommand]);

  const handleOutputData = useCallback((data: string) => {
    setLastOutput(prev => (prev + data).slice(-500));
  }, []);

  const handleNewSession = useCallback(() => { createSession(); }, [createSession]);

  const handleBroadcastToggle = useCallback(() => {
    if (!broadcastMode) {
      if (!confirm('Enable broadcast mode? All keystrokes will go to ALL open sessions.')) return;
    }
    toggleBroadcastMode();
  }, [broadcastMode, toggleBroadcastMode]);

  const handlePasteToTerminal = useCallback((cmd: string) => {
    writeToTermRef.current?.(cmd);
  }, []);

  const handleSshConnect = useCallback((cmd: string) => {
    handleNewSession();
    setConnecting(true);
    setTimeout(() => {
      writeToTermRef.current?.(`${cmd}\r`);
      setConnecting(false);
    }, 2000);
  }, [handleNewSession]);

  const handleExportSession = useCallback(async (rec: import('./types/terminallink').RecordedSession, fmt: 'cast' | 'txt') => {
    let content: string;
    if (fmt === 'cast') {
      const header = { version: 2, width: 220, height: 50, timestamp: Math.floor(new Date(rec.startedAt).getTime() / 1000), title: rec.sessionName };
      const events = rec.events.map(e => [e.ts / 1000, 'o', e.data]);
      content = JSON.stringify(header) + '\n' + events.map(e => JSON.stringify(e)).join('\n');
    } else {
      content = rec.events.map(e => e.data).join('');
    }
    try {
      await window.electronAPI.exportSession({ content, defaultName: `${rec.sessionName}-${Date.now()}.${fmt}`, ext: fmt });
    } catch (e) { console.error('[App] exportSession error:', e); }
  }, []);

  // Build command palette items
  const paletteItems: PaletteItem[] = [
    { id: 'split',     label: 'Toggle Split View',    category: 'Action',  action: toggleSplitMode },
    { id: 'history',   label: 'Toggle History Panel', category: 'Action',  action: toggleHistoryPanel },
    { id: 'broadcast', label: broadcastMode ? 'Disable Broadcast' : 'Enable Broadcast', category: 'Action', action: handleBroadcastToggle },
    { id: 'snippets',  label: 'Toggle Snippets Panel', category: 'Action', action: toggleSnippetsPanel },
    { id: 'sessions',  label: 'View Sessions',         category: 'Nav',    action: () => setActiveView('sessions') },
    { id: 'settings',  label: 'Open Settings',         category: 'Nav',    action: () => setActiveView('settings') },
    { id: 'terminal',  label: 'Back to Terminal',      category: 'Nav',    action: () => setActiveView('terminal') },
    { id: 'newterm',   label: 'New Session',           category: 'Action', action: handleNewSession },
    { id: 'launcher',  label: 'Open Tool Launcher',    category: 'Action', action: () => setToolLauncherOpen(true) },
    ...snippets.map(s => ({
      id:          `snip-${s.id}`,
      label:       s.title,
      description: s.command,
      category:    s.category,
      action:      () => handlePasteToTerminal(s.command),
    })),
    ...sshProfiles.map(p => ({
      id:          `ssh-${p.id}`,
      label:       p.name,
      description: `${p.username}@${p.host}:${p.port}`,
      category:    'SSH',
      action:      () => handleSshConnect(`ssh ${p.identityFile ? `-i ${p.identityFile} ` : ''}-p ${p.port} ${p.username}@${p.host}`),
    })),
  ];

  const activeSession = sessions.find(s => s.id === activeSessionId) ?? null;
  const sessionName   = activeSession?.name ?? 'Session 1';
  const sessionCtx = {
    activeLab:    sharedContext?.activeLab,
    activeTarget: sharedContext?.activeTarget,
    activeIP:     sharedContext?.activeIP,
    sessions:     sharedContext?.sessions,
  };
  const allPaneIds = [PANE_LEFT_ID, ...(splitModeEnabled ? [PANE_RIGHT_ID] : [])];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden', background: 'var(--bg)', color: 'var(--text)' }}>

      <TitleBar
        sessionCtx={sessionCtx}
        commandCount={commandHistory.length}
        splitMode={splitModeEnabled}
        historyOpen={historyPanelOpen}
        activeView={activeView}
        broadcastMode={broadcastMode}
        snippetsOpen={snippetsPanelOpen}
        onToggleSplit={toggleSplitMode}
        onToggleHistory={toggleHistoryPanel}
        onSetView={setActiveView}
        onToggleBroadcast={handleBroadcastToggle}
        onToggleSnippets={toggleSnippetsPanel}
        onOpenPalette={() => setCommandPaletteOpen(true)}
        onOpenLauncher={() => setToolLauncherOpen(true)}
        version={versionRef.current}
        onHelp={onboarding.open}
      />

      {/* Tab bar */}
      {activeView === 'terminal' && (
        <TabBar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={setActiveSession}
          onNew={handleNewSession}
          onClose={removeSession}
          onRename={renameSession}
          onColorChange={(id, color) => setSessionColor(id, color as Parameters<typeof setSessionColor>[1])}
        />
      )}

      {activeView === 'terminal' && settings.showContextBar && (
        <ContextBar sessionCtx={sessionCtx} sessionName={sessionName} />
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Snippets panel */}
        <AnimatePresence>
          {snippetsPanelOpen && activeView === 'terminal' && (
            <motion.div
              key="snippets"
              initial={{ x: -280, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ display: 'flex', flexShrink: 0, overflow: 'hidden' }}
            >
              <SnippetPanel
                snippets={snippets}
                onPaste={handlePasteToTerminal}
                onClose={toggleSnippetsPanel}
                onAdd={s => addSnippet(s)}
                onRemove={removeSnippet}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {activeView === 'terminal' && (
            <TerminalSplit
              paneLeftId={PANE_LEFT_ID}
              paneRightId={PANE_RIGHT_ID}
              splitMode={splitModeEnabled}
              activePane={activePane}
              activeSessionId={activeSessionId}
              broadcastMode={broadcastMode}
              allPaneIds={allPaneIds}
              alertRules={settings.outputAlerts}
              sessionColor={activeSession?.color}
              themeName={activeSession?.theme}
              onCommand={handleCommand}
              onFocusPane={setActivePane}
              onAlert={msg => pushAlert(msg)}
              onOutputData={handleOutputData}
              onCwdChange={setStatusCwd}
              onExitCode={setStatusExit}
              writeToTermRef={writeToTermRef}
            />
          )}

          {activeView === 'sessions' && (
            <SessionsView
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSelectSession={setActiveSession}
              onNewSession={createSession}
              sshProfiles={sshProfiles}
              onAddSsh={addSshProfile}
              onRemoveSsh={removeSshProfile}
              onSshConnect={handleSshConnect}
              recordedSessions={useTerminalLinkStore.getState().recordedSessions}
              onExportSession={handleExportSession}
            />
          )}

          {activeView === 'settings' && (
            <SettingsView settings={settings} onUpdate={updateSettings} />
          )}
        </div>

        <AnimatePresence>
          {historyPanelOpen && (
            <motion.div
              key="history-panel"
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ display: 'flex', flexShrink: 0, overflow: 'hidden' }}
            >
              <HistoryPanel
                commands={commandHistory}
                onClear={() => useTerminalLinkStore.getState().clearHistory()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI panel */}
      {activeView === 'terminal' && settings.ollamaEnabled && (
        <AiPanel
          ollamaUrl={settings.ollamaUrl}
          lastCommand={lastCommand}
          lastOutput={lastOutput}
          onUse={cmd => handlePasteToTerminal(cmd)}
        />
      )}

      <StatusBar
        sessionCtx={sessionCtx}
        commandCount={commandHistory.length}
        sessionName={sessionName}
        cwd={statusCwd}
        exitCode={statusExit}
        connecting={connecting}
      />

      {/* Overlays */}
      {commandPaletteOpen && (
        <CommandPalette
          items={paletteItems}
          onClose={() => setCommandPaletteOpen(false)}
        />
      )}

      {toolLauncherOpen && (
        <ToolLauncher
          target={sharedContext?.activeTarget || sharedContext?.activeIP}
          onLaunch={cmd => { handlePasteToTerminal(`${cmd}\r`); }}
          onClose={() => setToolLauncherOpen(false)}
        />
      )}

      {/* Alert toast for the most recent active alert */}
      <AlertToast
        message={activeAlerts[activeAlerts.length - 1] ?? null}
        onDismiss={() => {
          const msg = activeAlerts[activeAlerts.length - 1];
          if (msg) dismissAlert(msg);
        }}
      />

      {onboarding.show && <OnboardingModal onClose={onboarding.close} />}

      {/* Keyboard shortcuts panel — ⌘? */}
      <AnimatePresence>
        {kbPanelOpen && (
          <motion.div
            key="kb-panel"
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 10000, display: 'flex' }}
          >
            <KeyboardShortcutsPanel onClose={() => setKbPanelOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
