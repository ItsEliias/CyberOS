import { useState, useCallback } from 'react';
import { useStore } from '../store';
import EditorHeader from './EditorHeader';
import SectionList from './SectionList';
import SectionEditor from './SectionEditor';
import FindingsPanel from './FindingsPanel';

interface Props {
  onBack: () => void;
  onSave: () => Promise<void>;
  onExportMd: () => Promise<void>;
  onExportPdf: () => Promise<void>;
  exporting: boolean;
}

export default function ReportEditor({ onBack, onSave, onExportMd, onExportPdf, exporting }: Props) {
  const { dirty, setActiveSectionId, activeReport } = useStore();
  const [panelView, setPanelView] = useState<'sections' | 'findings'>('sections');

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
      </div>
    </div>
  );
}
