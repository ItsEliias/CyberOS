import { useState, useEffect } from 'react';
import { useStore } from '../store';

export default function SectionEditor() {
  const { activeReport, activeSectionId, updateSection } = useStore();
  const section = activeReport?.sections.find(s => s.id === activeSectionId) ?? null;

  const [titleVal, setTitleVal] = useState(section?.title ?? '');
  const [contentVal, setContentVal] = useState(section?.content ?? '');
  const [editingTitle, setEditingTitle] = useState(false);

  useEffect(() => {
    setTitleVal(section?.title ?? '');
    setContentVal(section?.content ?? '');
    setEditingTitle(false);
  }, [activeSectionId, section?.title, section?.content]);

  function commitTitle() {
    setEditingTitle(false);
    if (section && titleVal.trim()) {
      updateSection(section.id, { title: titleVal.trim() });
    }
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setContentVal(val);
    if (section) updateSection(section.id, { content: val });
  }

  if (!section) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Select a section to edit
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Section title */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {editingTitle ? (
          <input
            autoFocus
            value={titleVal}
            onChange={e => setTitleVal(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') { setEditingTitle(false); setTitleVal(section.title); } }}
            style={{ fontSize: 15, fontWeight: 700, background: 'transparent', border: 'none', borderBottom: '1px solid var(--accent)', color: 'var(--text)', width: '100%', padding: '2px 0', outline: 'none' }}
          />
        ) : (
          <div
            onClick={() => setEditingTitle(true)}
            style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', cursor: 'text', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {section.title}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>(click to rename)</span>
          </div>
        )}
      </div>

      {/* Auto-generated notice for Findings section */}
      {section.title === 'Findings' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⚡</div>
          <p style={{ fontSize: 14, marginBottom: 6 }}>This section is auto-generated from your findings.</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Use the Findings tab to add, edit, and manage findings.</p>
        </div>
      ) : (
        <textarea
          value={contentVal}
          onChange={handleContentChange}
          placeholder={`Write ${section.title} content here (Markdown supported)…`}
          style={{
            flex: 1, resize: 'none', background: 'var(--bg)', color: 'var(--text)',
            border: 'none', padding: '16px 20px', fontSize: 13, lineHeight: 1.7,
            fontFamily: '"SF Mono", "Fira Code", Consolas, monospace',
            outline: 'none',
          }}
        />
      )}
    </div>
  );
}
