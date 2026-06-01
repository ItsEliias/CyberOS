import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store';
import { useToast, ToastContainer } from './components/Toast';
import ReportLibrary from './components/ReportLibrary';
import NewReportWizard from './components/NewReportWizard';
import ReportEditor from './components/ReportEditor';
import PrintView from './components/PrintView';
import type { Report } from '@shared/types';

export default function App() {
  const {
    view, activeReport,
    setView, setReports, setActiveReport, upsertReport, removeReport, setDirty
  } = useStore();

  const { toasts, addToast, removeToast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [printReport, setPrintReport] = useState<Report | null>(null);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    window.reportforge.loadReports().then(r => setReports(r || []));

    const unsubPrint = window.reportforge.onTriggerPrintView(r => setPrintReport(r));
    const unsubDone  = window.reportforge.onPrintDone(() => setPrintReport(null));

    return () => { unsubPrint(); unsubDone(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Open report ────────────────────────────────────────────────────────────
  const openReport = useCallback((r: Report) => {
    setActiveReport(r);
    setView('editor');
  }, [setActiveReport, setView]);

  // ── Save active report ─────────────────────────────────────────────────────
  const saveReport = useCallback(async () => {
    const { activeReport: r } = useStore.getState();
    if (!r) return;
    const ok = await window.reportforge.saveReport(r);
    if (ok) {
      upsertReport(r);
      setDirty(false);
      addToast('Report saved', 'success');
    } else {
      addToast('Save failed', 'error');
    }
  }, [upsertReport, setDirty, addToast]);

  // ── Wizard complete ────────────────────────────────────────────────────────
  const handleWizardComplete = useCallback(async (r: Report) => {
    const ok = await window.reportforge.saveReport(r);
    if (ok) {
      upsertReport(r);
      setActiveReport(r);
      setView('editor');
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
    }
    setView('library');
    setActiveReport(null);
  }, [setView, setActiveReport, upsertReport]);

  // ── Export Markdown ────────────────────────────────────────────────────────
  const handleExportMd = useCallback(async () => {
    const { activeReport: r } = useStore.getState();
    if (!r) return;
    setExporting(true);
    const result = await window.reportforge.exportMarkdown(r);
    setExporting(false);
    if (result.ok) addToast(`Exported to ${result.path?.split('/').pop()}`, 'success');
    else if (result.error) addToast(`Export failed: ${result.error}`, 'error');
  }, [addToast]);

  // ── Export PDF ─────────────────────────────────────────────────────────────
  const handleExportPdf = useCallback(async () => {
    const { activeReport: r } = useStore.getState();
    if (!r) return;
    setExporting(true);
    const result = await window.reportforge.exportPDF(r);
    setExporting(false);
    if (result.ok) addToast(`PDF saved to ${result.path?.split('/').pop()}`, 'success');
    else if (result.error) addToast(`PDF export failed: ${result.error}`, 'error');
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

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--bg)', color: 'var(--text)' }}>
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
              onExportMd={handleExportMd}
              onExportPdf={handleExportPdf}
              exporting={exporting}
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

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
