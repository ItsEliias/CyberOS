import { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store';
import { useToast, ToastContainer } from './components/Toast';
import ReportLibrary from './components/ReportLibrary';
import NewReportWizard from './components/NewReportWizard';
import ReportEditor from './components/ReportEditor';
import PrintView from './components/PrintView';
import ExportModal, { type ExportOptions } from './components/export/ExportModal';
import TitleBar from './components/layout/TitleBar';
import type { Report } from '@shared/types';
import OnboardingModal, { useOnboarding } from './components/OnboardingModal';
import CommandPalette from './components/CommandPalette';
import SSOLockScreen from './components/SSOLockScreen';

const AUTO_SAVE_MS = 30_000;

export default function App() {
  const {
    view, activeReport,
    setView, setReports, setActiveReport, upsertReport, removeReport, setDirty
  } = useStore();

  const { toasts, addToast, removeToast } = useToast();
  const onboarding = useOnboarding();
  const [exporting, setExporting] = useState(false);
  const [printReport, setPrintReport] = useState<Report | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [ssoUnlocked, setSsoUnlocked] = useState<boolean | null>(null);
  const [requireSSO,  setRequireSSO]  = useState(false);

  // Read the "Require CredVault session" preference from localStorage.
  useEffect(() => {
    try { setRequireSSO(localStorage.getItem('rf:requireCredVaultSession') === '1'); } catch { /* ignore */ }
  }, []);

  // Safety: editor view requires an activeReport. If somehow (deletion race,
  // bad deep-link, future bug) we land in 'editor' without one, the renderer
  // shows a blank pane — bounce back to the library instead.
  useEffect(() => {
    if (view === 'editor' && !activeReport) setView('library');
  }, [view, activeReport, setView]);

  // Poll the SSO state every 5 s.
  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const r = await window.reportforge.getSSO();
        if (!cancelled) setSsoUnlocked(!!r.unlocked);
      } catch { if (!cancelled) setSsoUnlocked(true); }
    }
    void check();
    const t = setInterval(check, 5000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    window.reportforge.loadReports().then(r => setReports(r || []));

    const unsubPrint = window.reportforge.onTriggerPrintView(r => setPrintReport(r));
    const unsubDone  = window.reportforge.onPrintDone(() => setPrintReport(null));

    const unsubPending = window.reportforge.onPendingAction((action) => {
      if (action === 'new-report') {
        // Mirrors CommandPalette's "New report" command
        setView('wizard');
      }
    });

    return () => { unsubPrint(); unsubDone(); unsubPending(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── ⌘K command palette + ⌘N new report ─────────────────────────────────────
  // Both suppressed while the SSO soft-lock is active so the user can't open
  // the palette / wizard from the locked screen.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (requireSSO && ssoUnlocked === false) return;
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      } else if (k === 'n' && view === 'library') {
        // ⌘N → new report wizard. Scoped to the library view so the editor
        // doesn't lose work mid-edit to an accidental Cmd+N.
        e.preventDefault();
        setView('wizard');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requireSSO, ssoUnlocked, view, setView]);

  // ── Auto-save every 30s when in editor and dirty ───────────────────────────
  // Skipped while the SSO soft-lock is active: the editor is masked, so any
  // dirty state is stale by definition and writing it back is wasted work
  // (and would race the user's eventual unlock-then-edit flow).
  useEffect(() => {
    const blocked = requireSSO && ssoUnlocked === false;
    if (view !== 'editor' || blocked) {
      if (autoSaveRef.current) { clearInterval(autoSaveRef.current); autoSaveRef.current = null; }
      return;
    }
    autoSaveRef.current = setInterval(async () => {
      const { activeReport: r, dirty: d } = useStore.getState();
      if (!d || !r) return;
      const ok = await window.reportforge.saveReport(r);
      if (ok) {
        upsertReport(r);
        setDirty(false);
        setLastSavedAt(new Date());
      }
    }, AUTO_SAVE_MS);
    return () => {
      if (autoSaveRef.current) { clearInterval(autoSaveRef.current); autoSaveRef.current = null; }
    };
  }, [view, requireSSO, ssoUnlocked, upsertReport, setDirty]);

  // ── Open report ────────────────────────────────────────────────────────────
  const openReport = useCallback((r: Report) => {
    setActiveReport(r);
    setView('editor');
    setLastSavedAt(null);
  }, [setActiveReport, setView]);

  // ── Save active report ─────────────────────────────────────────────────────
  const saveReport = useCallback(async () => {
    const { activeReport: r } = useStore.getState();
    if (!r) return;
    const ok = await window.reportforge.saveReport(r);
    if (ok) {
      upsertReport(r);
      setDirty(false);
      setLastSavedAt(new Date());
      addToast('Report saved', 'success');
    } else {
      addToast('Save failed', 'error');
    }
  }, [upsertReport, setDirty, addToast]);

  // ── ⌘S save (editor only) ──────────────────────────────────────────────────
  // Pre-empts the browser-default "save page as" prompt and gives users the
  // native macOS save reflex. Library view leaves the default alone since
  // there's nothing to save there.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() !== 's') return;
      if (view !== 'editor') return;
      if (requireSSO && ssoUnlocked === false) return;
      e.preventDefault();
      void saveReport();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, requireSSO, ssoUnlocked, saveReport]);

  // ── Wizard complete ────────────────────────────────────────────────────────
  const handleWizardComplete = useCallback(async (r: Report) => {
    const ok = await window.reportforge.saveReport(r);
    if (ok) {
      upsertReport(r);
      setActiveReport(r);
      setView('editor');
      setLastSavedAt(new Date());
      window.electronAPI.ecosystemEmit('ReportForge', 'report:created', { title: r.title, target: r.targetName });
      addToast('Report created', 'success');
    } else {
      addToast('Failed to create report', 'error');
    }
  }, [upsertReport, setActiveReport, setView, addToast]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    const ok = await window.reportforge.deleteReport(id);
    if (ok) {
      removeReport(id);
      addToast('Report deleted', 'info');
    } else {
      addToast('Delete failed', 'error');
    }
  }, [removeReport, addToast]);

  // ── Duplicate ──────────────────────────────────────────────────────────────
  const handleDuplicate = useCallback(async (id: string) => {
    const copy = await window.reportforge.duplicateReport(id);
    if (copy) {
      upsertReport(copy);
      addToast('Report duplicated', 'success');
    } else {
      addToast('Duplicate failed', 'error');
    }
  }, [upsertReport, addToast]);

  // ── Back to library ────────────────────────────────────────────────────────
  const handleBack = useCallback(async () => {
    // Auto-save on back if dirty
    const { activeReport: r, dirty: d } = useStore.getState();
    if (d && r) {
      await window.reportforge.saveReport(r);
      upsertReport(r);
      setLastSavedAt(new Date());
    }
    setView('library');
    setActiveReport(null);
  }, [setView, setActiveReport, upsertReport]);

  // ── Export: open modal (with format pre-selected) ─────────────────────────
  const handleOpenExportModal = useCallback((format?: 'markdown' | 'pdf') => {
    setExportFormat(format ?? 'markdown');
    setShowExportModal(true);
  }, []);

  const [exportFormat, setExportFormat] = useState<'markdown' | 'pdf'>('markdown');

  // ── Export: execute ────────────────────────────────────────────────────────
  const handleExport = useCallback(async (opts: ExportOptions) => {
    const { activeReport: r } = useStore.getState();
    if (!r) return;
    setExporting(true);
    setShowExportModal(false);

    if (opts.format === 'pdf') {
      const result = await window.reportforge.exportPDF(r);
      setExporting(false);
      if (result.ok) addToast(`PDF saved to ${result.path?.split('/').pop()}`, 'success');
      else if (result.error) addToast(`PDF export failed: ${result.error}`, 'error');
    } else {
      const result = await window.reportforge.exportMarkdown(r, {
        includeToc: opts.includeToc,
        includeFindingsTable: opts.includeFindingsTable,
        includeCredentials: opts.includeCredentials,
        redactCredentials: opts.redactCredentials,
        includeRawNmap: opts.includeRawNmap,
      });
      setExporting(false);
      if (result.ok) addToast(`Exported to ${result.path?.split('/').pop()}`, 'success');
      else if (result.error) addToast(`Export failed: ${result.error}`, 'error');
    }
  }, [addToast]);

  // ── Print-ready signal ─────────────────────────────────────────────────────
  const handlePrintReady = useCallback(() => {
    window.reportforge.signalPrintReady();
  }, []);

  // If in print mode, render PrintView (for PDF generation)
  if (printReport) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 9999, overflow: 'auto' }}>
        <PrintView report={printReport} onReady={handlePrintReady} />
      </div>
    );
  }

  const ssoBlocked = requireSSO && ssoUnlocked === false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg)', color: 'var(--text)', position: 'relative' }}>
      {ssoBlocked && (
        <SSOLockScreen onCheck={async () => {
          const r = await window.reportforge.getSSO();
          setSsoUnlocked(!!r.unlocked);
        }} />
      )}
      <TitleBar
        onNew={view === 'library' ? () => setView('wizard') : undefined}
        onHelp={onboarding.open}
      />
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
      <AnimatePresence mode="wait">
        {view === 'library' && (
          <motion.div
            key="library"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ width: '100%', height: '100%' }}
          >
            <ReportLibrary
              onNew={() => setView('wizard')}
              onOpen={openReport}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          </motion.div>
        )}

        {view === 'editor' && activeReport && (
          <motion.div
            key="editor"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ width: '100%', height: '100%' }}
          >
            <ReportEditor
              onBack={handleBack}
              onSave={saveReport}
              onExportMd={() => handleOpenExportModal('markdown')}
              onExportPdf={() => handleOpenExportModal('pdf')}
              exporting={exporting}
              lastSavedAt={lastSavedAt}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {view === 'wizard' && (
        <NewReportWizard
          onComplete={handleWizardComplete}
          onCancel={() => setView('library')}
        />
      )}

      {showExportModal && (
        <ExportModal
          onExport={handleExport}
          onCancel={() => setShowExportModal(false)}
          exporting={exporting}
          defaultFormat={exportFormat}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
      {onboarding.show && <OnboardingModal onClose={onboarding.close} />}

      <CommandPalette
        open={paletteOpen && !ssoBlocked}
        onClose={() => setPaletteOpen(false)}
        onExportFormat={(fmt) => {
          // Only exports the active report — palette only shows export commands when activeReport
          handleOpenExportModal(fmt);
        }}
      />
    </div>
  );
}
