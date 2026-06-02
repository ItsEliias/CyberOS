import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';

type EditorMode = 'edit' | 'split' | 'preview';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMd(md: string): string {
  if (!md.trim()) return '<p style="color:var(--text-muted);font-style:italic">Nothing here yet.</p>';
  let h = md;
  h = h.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, _lang, code) =>
    `<pre style="background:var(--bg);padding:10px 14px;border-radius:4px;border:1px solid var(--border);font-size:12px;overflow-x:auto;margin:8px 0"><code>${esc(code.trim())}</code></pre>`
  );
  h = h.replace(/`([^`]+)`/g, (_, c) => `<code style="background:var(--bg);padding:1px 5px;border-radius:3px;font-size:12px;border:1px solid var(--border)">${esc(c)}</code>`);
  h = h.replace(/^#{4}\s+(.+)$/gm, '<h4 style="font-size:13px;font-weight:700;margin:14px 0 4px;color:var(--text)">$1</h4>');
  h = h.replace(/^#{3}\s+(.+)$/gm, '<h3 style="font-size:14px;font-weight:700;margin:16px 0 6px;color:var(--text)">$1</h3>');
  h = h.replace(/^#{2}\s+(.+)$/gm, '<h2 style="font-size:15px;font-weight:700;margin:18px 0 6px;color:var(--text);border-bottom:1px solid var(--border);padding-bottom:4px">$1</h2>');
  h = h.replace(/^#{1}\s+(.+)$/gm, '<h1 style="font-size:17px;font-weight:700;margin:18px 0 8px;color:var(--text)">$1</h1>');
  h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
  h = h.replace(/~~(.+?)~~/g, '<del>$1</del>');
  h = h.replace(/^[-*+] (.+)$/gm, '<li style="margin-left:20px;margin-bottom:2px">$1</li>');
  h = h.replace(/^(\d+)\. (.+)$/gm, '<li style="margin-left:20px;margin-bottom:2px">$2</li>');
  h = h.replace(/(<li[\s\S]*?<\/li>)/g, block => `<ul style="margin:6px 0;padding:0">${block}</ul>`);
  h = h.replace(/((?:\|[^\n]+\|\n)+)/g, (tb) => {
    const rows = tb.trim().split('\n').filter(r => !/^\|[-| :]+\|$/.test(r.trim()));
    if (!rows.length) return tb;
    const parseRow = (r: string) => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    const [head, ...body] = rows;
    const ths = parseRow(head).map(c => `<th style="border:1px solid var(--border);padding:5px 10px;background:var(--panel);text-align:left;font-size:12px">${c}</th>`).join('');
    const trs = body.map(r => `<tr>${parseRow(r).map(c => `<td style="border:1px solid var(--border);padding:5px 10px;font-size:12px">${c}</td>`).join('')}</tr>`).join('');
    return `<table style="border-collapse:collapse;width:100%;margin:10px 0"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  });
  h = h.replace(/\n\n+/g, '</p><p style="margin:8px 0;color:var(--text)">');
  h = `<p style="margin:8px 0;color:var(--text)">${h}</p>`;
  h = h.replace(/<p[^>]*>\s*<\/p>/g, '');
  h = h.replace(/<p[^>]*>(<(?:h[1-6]|pre|ul|ol|table)[^>]*>)/g, '$1');
  h = h.replace(/(<\/(?:h[1-6]|pre|ul|ol|table)>)<\/p>/g, '$1');
  return h;
}

export default function SectionEditor() {
  const { activeReport, activeSectionId, updateSection } = useStore();
  const section = activeReport?.sections.find(s => s.id === activeSectionId) ?? null;

  const [titleVal, setTitleVal] = useState(section?.title ?? '');
  const [contentVal, setContentVal] = useState(section?.content ?? '');
  const [editingTitle, setEditingTitle] = useState(false);
  const [mode, setMode] = useState<EditorMode>('edit');

  useEffect(() => {
    setTitleVal(section?.title ?? '');
    setContentVal(section?.content ?? '');
    setEditingTitle(false);
  }, [activeSectionId, section?.title, section?.content]);

  const preview = useMemo(() => renderMd(contentVal), [contentVal]);

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
      {/* Section title + mode toggle */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
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
        {section.title !== 'Findings' && (
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
            {(['edit', 'split', 'preview'] as EditorMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '3px 9px', fontSize: 10, fontWeight: 500,
                  background: mode === m ? 'var(--accent)' : 'var(--bg)',
                  color: mode === m ? '#fff' : 'var(--text-muted)',
                  border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                  transition: 'background 0.15s',
                }}
              >
                {m}
              </button>
            ))}
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
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {mode !== 'preview' && (
            <textarea
              value={contentVal}
              onChange={handleContentChange}
              placeholder={`Write ${section.title} content here (Markdown supported)…`}
              style={{
                flex: 1, resize: 'none', background: 'var(--bg)', color: 'var(--text)',
                border: 'none',
                borderRight: mode === 'split' ? '1px solid var(--border)' : 'none',
                padding: '16px 20px', fontSize: 13, lineHeight: 1.7,
                fontFamily: '"SF Mono", "Fira Code", Consolas, monospace',
                outline: 'none',
              }}
            />
          )}
          {mode !== 'edit' && (
            <div style={{
              flex: 1, overflowY: 'auto', padding: '16px 20px',
              background: 'var(--bg)',
              fontSize: 13, lineHeight: 1.7, color: 'var(--text)',
            }}
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          )}
        </div>
      )}
    </div>
  );
}
