import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import EditorHeader from './EditorHeader';
import SectionList from './SectionList';
import SectionEditor from './SectionEditor';
import FindingsPanel from './FindingsPanel';
import StatusBar from './layout/StatusBar';

interface Props {
  onBack: () => void;
  onSave: () => Promise<void>;
  onExportMd: () => void;
  onExportPdf: () => void;
  exporting: boolean;
  lastSavedAt: Date | null;
}

// ── Metadata sidebar field ─────────────────────────────────────────────────────

function MetaField({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: value ? 'var(--text-secondary)' : 'var(--text-muted)', fontStyle: value ? 'normal' : 'italic' }}>
        {value || 'Not set'}
      </span>
    </div>
  );
}

// ── Classification badge ───────────────────────────────────────────────────────

function ClassificationBadge({ label }: { label?: string }) {
  if (!label) return null;
  const styles: Record<string, { color: string; bg: string; border: string }> = {
    Confidential: { color: '#f85149', bg: 'rgba(248,81,73,0.10)', border: 'rgba(248,81,73,0.28)' },
    Internal:     { color: '#d29922', bg: 'rgba(210,153,34,0.10)', border: 'rgba(210,153,34,0.28)' },
    Public:       { color: '#3fb950', bg: 'rgba(63,185,80,0.10)',  border: 'rgba(63,185,80,0.28)'  },
  };
  const s = styles[label] ?? styles['Confidential'];
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
      padding: '2px 8px', borderRadius: 99,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {label}
    </span>
  );
}

// ── Collapsible metadata sidebar ──────────────────────────────────────────────

function MetadataSidebar({ open }: { open: boolean }) {
  const { activeReport } = useStore();
  if (!activeReport) return null;

  // Pull cover classification from cover section if present
  const coverSection = activeReport.sections.find(s => s.type === 'cover');
  const classification = coverSection?.coverData?.classification;
  const scope = activeReport.variables?.scope;
  const author = activeReport.operator || coverSection?.coverData?.testerName;
  const date = activeReport.assessmentDate
    ? new Date(activeReport.assessmentDate).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : undefined;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="meta-sidebar"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 200, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          style={{
            overflow: 'hidden',
            borderLeft: '1px solid var(--border)',
            background: 'var(--panel)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Inner content — fixed width so it doesn't squash during animation */}
          <div style={{ width: 200, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Sidebar header */}
            <div style={{
              padding: '10px 14px 8px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Report Info
              </span>
            </div>

            {/* Fields */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Classification */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>
                  Classification
                </span>
                <ClassificationBadge label={classification} />
                {!classification && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Not set</span>
                )}
              </div>

              <MetaField label="Author" value={author} />
              <MetaField label="Date" value={date} />
              <MetaField label="Target" value={activeReport.targetName || activeReport.targetIP} />
              <MetaField label="Platform" value={activeReport.platform} />
              <MetaField label="Scope" value={scope} />

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(42,51,71,0.5)' }} />

              {/* Report stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>
                  Stats
                </span>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sections</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {activeReport.sections.length}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Findings</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {activeReport.findings.length}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Critical</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#f85149', fontVariantNumeric: 'tabular-nums' }}>
                    {activeReport.findings.filter(f => f.severity === 'critical').length}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>High</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#ff8c42', fontVariantNumeric: 'tabular-nums' }}>
                    {activeReport.findings.filter(f => f.severity === 'high').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main editor ────────────────────────────────────────────────────────────────

export default function ReportEditor({ onBack, onSave, onExportMd, onExportPdf, exporting, lastSavedAt }: Props) {
  const { dirty, setActiveSectionId, activeReport } = useStore();
  const [panelView, setPanelView] = useState<'sections' | 'findings'>('sections');
  const [metaOpen, setMetaOpen] = useState(false);

  const handleSelectSection = useCallback((id: string) => {
    setActiveSectionId(id);
    setPanelView('sections');
  }, [setActiveSectionId]);

  if (!activeReport) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <EditorHeader
        dirty={dirty}
        onSave={onSave}
        onBack={onBack}
        onExportMd={onExportMd}
        onExportPdf={onExportPdf}
        exporting={exporting}
        metaOpen={metaOpen}
        onToggleMeta={() => setMetaOpen(v => !v)}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <SectionList
          onSelectSection={handleSelectSection}
          activeView={panelView}
          onViewChange={setPanelView}
        />

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {panelView === 'sections' ? (
            <SectionEditor />
          ) : (
            <FindingsPanel />
          )}
        </div>

        {/* Collapsible metadata sidebar */}
        <MetadataSidebar open={metaOpen} />
      </div>

      <StatusBar lastSavedAt={lastSavedAt} />
    </div>
  );
}
