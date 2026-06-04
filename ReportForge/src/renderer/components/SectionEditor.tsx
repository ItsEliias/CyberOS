import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import { applyVariables, highlightVariables } from '../utils/variables';
import CoverEditor from './CoverEditor';
import SignatureEditor from './SignatureEditor';
import RiskMatrix from './RiskMatrix';
import SeverityChart from './SeverityChart';
import CommentsPanel, { unresolvedCount } from './CommentsPanel';

type EditorMode = 'edit' | 'split' | 'preview';

// ── Passive voice / repeated word patterns ────────────────────────────────────
const PASSIVE_RE = /\b(was found|was seen|was identified|was discovered|was detected|was observed|were found|were seen|were identified)\b/gi;
const REPEATED_RE = /\b(\w{3,})\s+\1\b/gi;

function grammarHighlight(html: string): string {
  // Apply after MD rendering — mark passive voice with blue underline
  html = html.replace(PASSIVE_RE, m =>
    `<span style="text-decoration:underline;text-decoration-color:#4d90fe;text-decoration-style:wavy" title="Passive voice">${m}</span>`
  );
  html = html.replace(REPEATED_RE, (_, w) =>
    `<span style="text-decoration:underline;text-decoration-color:#f0a500;text-decoration-style:wavy" title="Repeated word">${w}</span> ${w}`
  );
  return html;
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

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

// ── Markdown toolbar ──────────────────────────────────────────────────────────

interface ToolbarAction {
  label: string;
  title: string;
  wrap?: [string, string];
  insert?: string;
  block?: (line: string) => string;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { label: 'B',    title: 'Bold',         wrap: ['**', '**'] },
  { label: 'I',    title: 'Italic',       wrap: ['*', '*'] },
  { label: '`',    title: 'Inline Code',  wrap: ['`', '`'] },
  { label: 'H1',   title: 'Heading',      block: (l) => l.startsWith('# ') ? l.slice(2) : `# ${l}` },
  { label: 'Link', title: 'Link',         wrap: ['[', '](url)'] },
  { label: 'Code', title: 'Code Block',   wrap: ['```\n', '\n```'] },
  { label: 'Table', title: 'Insert Table', insert: '| Column 1 | Column 2 | Column 3 |\n|---|---|---|\n| Cell | Cell | Cell |\n' },
];

function applyToolbarAction(
  action: ToolbarAction,
  value: string,
  selStart: number,
  selEnd: number,
): { newValue: string; newStart: number; newEnd: number } {
  const selected = value.slice(selStart, selEnd);
  if (action.insert) {
    const newValue = value.slice(0, selStart) + action.insert + value.slice(selEnd);
    return { newValue, newStart: selStart, newEnd: selStart + action.insert.length };
  }
  if (action.block) {
    const lineStart = value.lastIndexOf('\n', selStart - 1) + 1;
    const lineEnd = value.indexOf('\n', selEnd);
    const actualEnd = lineEnd === -1 ? value.length : lineEnd;
    const line = value.slice(lineStart, actualEnd);
    const newLine = action.block(line);
    const newValue = value.slice(0, lineStart) + newLine + value.slice(actualEnd);
    return { newValue, newStart: lineStart, newEnd: lineStart + newLine.length };
  }
  if (action.wrap) {
    const [open, close] = action.wrap;
    const newValue = value.slice(0, selStart) + open + selected + close + value.slice(selEnd);
    return { newValue, newStart: selStart + open.length, newEnd: selEnd + open.length };
  }
  return { newValue: value, newStart: selStart, newEnd: selEnd };
}

// ── Executive summary auto-generator ─────────────────────────────────────────

type ExecFinding = { severity: string; title: string; description: string };

function buildExecSummary(findings: ExecFinding[]): string {
  const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'] as const;
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  findings.forEach(f => { if (f.severity in counts) counts[f.severity]++; });

  const parts: string[] = [];
  for (const s of SEVERITY_ORDER) {
    if (counts[s] > 0) parts.push(`${counts[s]} ${s}`);
  }
  const countSentence = parts.length
    ? `${parts.join(', ')} finding${findings.length !== 1 ? 's' : ''} were identified`
    : 'no findings were identified';

  const top3 = findings.filter(f => ['critical', 'high'].includes(f.severity)).slice(0, 3);

  const lines: string[] = [`During the assessment, ${countSentence}.`, ''];

  if (top3.length > 0) {
    lines.push('The most critical issues include:');
    lines.push('');
    top3.forEach(f => {
      const desc = f.description.slice(0, 120) + (f.description.length > 120 ? '…' : '');
      lines.push(`- **[${f.severity.toUpperCase()}] ${f.title}**: ${desc}`);
    });
    lines.push('');
  }

  lines.push('Remediation guidance is provided for each finding. Immediate attention is recommended for critical and high severity issues.');
  return lines.join('\n');
}

// ── Auto TOC generator ────────────────────────────────────────────────────────

function buildTocContent(sections: Array<{ title: string; order: number; visible: boolean; type?: string }>): string {
  const sorted = sections
    .filter(s => s.visible && s.type !== 'toc')
    .sort((a, b) => a.order - b.order);
  const lines = ['## Table of Contents', ''];
  sorted.forEach((s, i) => {
    const anchor = s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    lines.push(`${i + 1}. [${s.title}](#${anchor})`);
  });
  return lines.join('\n');
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SectionEditor() {
  const { activeReport, activeSectionId, updateSection, patchReportMeta } = useStore();
  const section = activeReport?.sections.find(s => s.id === activeSectionId) ?? null;

  const [titleVal, setTitleVal] = useState(section?.title ?? '');
  const [contentVal, setContentVal] = useState(section?.content ?? '');
  const [editingTitle, setEditingTitle] = useState(false);
  const [mode, setMode] = useState<EditorMode>('edit');
  const [showComments, setShowComments] = useState(false);
  const [showVarHighlight, setShowVarHighlight] = useState(false);
  const [showGrammar, setShowGrammar] = useState(false);
  const [wordCountVal, setWordCountVal] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTitleVal(section?.title ?? '');
    setContentVal(section?.content ?? '');
    setEditingTitle(false);
    setShowComments(false);
  }, [activeSectionId, section?.title, section?.content]);

  // Debounced word count
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setWordCountVal(wordCount(contentVal)), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [contentVal]);

  // Preview with variable substitution + optional grammar highlighting
  const preview = useMemo(() => {
    const withVars = applyVariables(contentVal, activeReport?.variables);
    let html = renderMd(withVars);
    if (showGrammar) html = grammarHighlight(html);
    return html;
  }, [contentVal, activeReport?.variables, showGrammar]);

  // Var-highlighted editor overlay HTML
  const varHighlightHtml = useMemo(() => {
    return showVarHighlight ? highlightVariables(esc(contentVal)) : '';
  }, [contentVal, showVarHighlight]);

  function commitTitle() {
    setEditingTitle(false);
    if (section && titleVal.trim()) updateSection(section.id, { title: titleVal.trim() });
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setContentVal(val);
    if (section) updateSection(section.id, { content: val });
  }

  function handleToolbarAction(action: ToolbarAction) {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: ss, selectionEnd: se } = ta;
    const { newValue, newStart, newEnd } = applyToolbarAction(action, contentVal, ss, se);
    setContentVal(newValue);
    if (section) updateSection(section.id, { content: newValue });
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(newStart, newEnd); });
  }

  const handleAutoExecSummary = useCallback(() => {
    if (!activeReport) return;
    const generated = buildExecSummary(activeReport.findings as never);
    const confirmed = confirm(
      `Replace Executive Summary content?\n\nPreview:\n${generated.slice(0, 200)}…`
    );
    if (confirmed) {
      setContentVal(generated);
      if (section) updateSection(section.id, { content: generated });
    }
  }, [activeReport, section, updateSection]);

  const handleRegenToc = useCallback(() => {
    if (!activeReport || !section) return;
    const toc = buildTocContent(activeReport.sections);
    setContentVal(toc);
    updateSection(section.id, { content: toc });
  }, [activeReport, section, updateSection]);

  const handleAutoAddToc = useCallback(() => {
    if (!activeReport) return;
    const hasToc = activeReport.sections.some(s => s.type === 'toc');
    if (hasToc) return;
    const toc = buildTocContent(activeReport.sections);
    const newSection = {
      id     : crypto.randomUUID(),
      title  : 'Table of Contents',
      content: toc,
      order  : -1,
      visible: true,
      type   : 'toc' as const,
      comments: [],
    };
    // Insert at beginning (order 0, push others)
    const sections = [
      { ...newSection, order: 0 },
      ...activeReport.sections.map(s => ({ ...s, order: s.order + 1 })),
    ];
    patchReportMeta({ sections });
  }, [activeReport, patchReportMeta]);

  if (!section) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Select a section to edit
      </div>
    );
  }

  // Special section types
  if (section.type === 'cover') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <SectionTitleBar section={section} titleVal={titleVal} setTitleVal={setTitleVal} editingTitle={editingTitle} setEditingTitle={setEditingTitle} commitTitle={commitTitle} />
        <CoverEditor section={section} />
      </div>
    );
  }

  if (section.type === 'signature') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <SectionTitleBar section={section} titleVal={titleVal} setTitleVal={setTitleVal} editingTitle={editingTitle} setEditingTitle={setEditingTitle} commitTitle={commitTitle} />
        <SignatureEditor section={section} />
      </div>
    );
  }

  if (section.type === 'risk-matrix') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <SectionTitleBar section={section} titleVal={titleVal} setTitleVal={setTitleVal} editingTitle={editingTitle} setEditingTitle={setEditingTitle} commitTitle={commitTitle} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Set <strong>Likelihood</strong> (1–5) and <strong>Impact Score</strong> (1–5) on findings to plot them on the matrix.
          </p>
          <RiskMatrix findings={activeReport?.findings ?? []} />
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 8 }}>Severity Chart</div>
            <SeverityChart findings={activeReport?.findings ?? []} />
          </div>
        </div>
      </div>
    );
  }

  const isFindingsSec = section.title === 'Findings';
  const isTocSec = section.type === 'toc';
  const isExecSec = section.title === 'Executive Summary';
  const commentCount = unresolvedCount(section);
  const pages = Math.max(1, Math.ceil(wordCountVal / 250));
  const visibleSections = activeReport?.sections.filter(s => s.visible).length ?? 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header row */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <SectionTitleInline section={section} titleVal={titleVal} setTitleVal={setTitleVal} editingTitle={editingTitle} setEditingTitle={setEditingTitle} commitTitle={commitTitle} />

        {/* Word count */}
        {!isFindingsSec && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
            {wordCountVal} words · ~{pages} page{pages !== 1 ? 's' : ''}
          </span>
        )}

        {/* TOC auto-add button */}
        {!isFindingsSec && visibleSections >= 3 && !activeReport?.sections.some(s => s.type === 'toc') && (
          <button
            className="btn-ghost"
            style={{ fontSize: 10, padding: '2px 8px', flexShrink: 0, whiteSpace: 'nowrap' }}
            onClick={handleAutoAddToc}
            title="Auto-add Table of Contents section"
          >
            + Add TOC
          </button>
        )}

        {/* Grammar highlight toggle */}
        {!isFindingsSec && mode !== 'edit' && (
          <button
            className="btn-ghost"
            style={{ fontSize: 10, padding: '2px 8px', flexShrink: 0, color: showGrammar ? 'var(--accent)' : undefined }}
            onClick={() => setShowGrammar(v => !v)}
            title="Toggle passive voice / repeated word highlighting"
          >
            Grammar
          </button>
        )}

        {/* Variable highlight toggle */}
        {!isFindingsSec && mode !== 'preview' && (
          <button
            className="btn-ghost"
            style={{ fontSize: 10, padding: '2px 8px', flexShrink: 0, color: showVarHighlight ? 'var(--accent)' : undefined }}
            onClick={() => setShowVarHighlight(v => !v)}
            title="Highlight {{variables}}"
          >
            Vars
          </button>
        )}

        {/* Comments button */}
        <button
          className="btn-ghost"
          style={{ fontSize: 10, padding: '2px 8px', flexShrink: 0, color: showComments ? 'var(--accent)' : undefined, position: 'relative' }}
          onClick={() => setShowComments(v => !v)}
          title="Comments"
        >
          Comments{commentCount > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--accent)', color: '#000', borderRadius: 99, fontSize: 8, width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {commentCount}
            </span>
          )}
        </button>

        {!isFindingsSec && !isTocSec && (
          <div style={{
            display: 'flex', borderRadius: 8, overflow: 'hidden', flexShrink: 0,
            background: 'var(--surface-2)',
            border: '1px solid rgba(42,51,71,0.6)',
            padding: 2, gap: 1,
          }}>
            {(['edit', 'split', 'preview'] as EditorMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '3px 10px', fontSize: 10, fontWeight: mode === m ? 600 : 500,
                  background: mode === m ? 'rgba(74,158,255,0.15)' : 'transparent',
                  color: mode === m ? '#4a9eff' : 'var(--text-muted)',
                  border: mode === m ? '1px solid rgba(74,158,255,0.3)' : '1px solid transparent',
                  cursor: 'pointer', textTransform: 'capitalize', borderRadius: 6,
                  transition: 'all 0.15s var(--ease)',
                }}
                onMouseEnter={e => { if (mode !== m) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                onMouseLeave={e => { if (mode !== m) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Markdown toolbar */}
      {!isFindingsSec && !isTocSec && mode !== 'preview' && (
        <div style={{ display: 'flex', gap: 2, padding: '5px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--panel)', flexWrap: 'wrap', alignItems: 'center' }}>
          {TOOLBAR_ACTIONS.map(action => (
            <button
              key={action.label}
              title={action.title}
              onMouseDown={e => { e.preventDefault(); handleToolbarAction(action); }}
              style={{
                padding: '2px 8px', fontSize: 11, fontWeight: 600,
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 3, color: 'var(--text-dim)', cursor: 'pointer',
                fontFamily: action.label === 'I' ? 'Georgia, serif' : 'inherit',
                fontStyle: action.label === 'I' ? 'italic' : 'normal',
                transition: 'background 0.1s, color 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
            >
              {action.label}
            </button>
          ))}

          {/* Exec summary generator */}
          {isExecSec && (
            <button
              onMouseDown={e => { e.preventDefault(); handleAutoExecSummary(); }}
              style={{ padding: '2px 10px', fontSize: 11, background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.3)', borderRadius: 3, color: 'var(--accent)', cursor: 'pointer', marginLeft: 4 }}
            >
              Auto-generate
            </button>
          )}

          {/* TOC regenerate */}
          {isTocSec && (
            <button
              onMouseDown={e => { e.preventDefault(); handleRegenToc(); }}
              style={{ padding: '2px 10px', fontSize: 11, background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.3)', borderRadius: 3, color: 'var(--accent)', cursor: 'pointer' }}
            >
              Regenerate TOC
            </button>
          )}
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {isFindingsSec ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>⚡</div>
            <p style={{ fontSize: 14, marginBottom: 6 }}>This section is auto-generated from your findings.</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Use the Findings tab to add, edit, and manage findings.</p>
            {(activeReport?.findings.length ?? 0) > 0 && (
              <div style={{ marginTop: 20 }}>
                <SeverityChart findings={activeReport?.findings ?? []} />
              </div>
            )}
          </div>
        ) : (
          <>
            {mode !== 'preview' && (
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <textarea
                  ref={textareaRef}
                  value={contentVal}
                  onChange={handleContentChange}
                  spellCheck
                  placeholder={`Write ${section.title} content here (Markdown supported)…`}
                  style={{
                    position: 'absolute', inset: 0,
                    resize: 'none', background: 'var(--bg)', color: showVarHighlight ? 'transparent' : 'var(--text)',
                    border: 'none',
                    borderRight: mode === 'split' ? '1px solid var(--border)' : 'none',
                    padding: '16px 20px', fontSize: 13, lineHeight: 1.7,
                    fontFamily: '"SF Mono", "Fira Code", Consolas, monospace',
                    outline: 'none', caretColor: 'var(--text)',
                  }}
                />
                {/* Variable highlight overlay */}
                {showVarHighlight && (
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute', inset: 0,
                      padding: '16px 20px', fontSize: 13, lineHeight: 1.7,
                      fontFamily: '"SF Mono", "Fira Code", Consolas, monospace',
                      pointerEvents: 'none', whiteSpace: 'pre-wrap', overflowWrap: 'break-word',
                      color: 'var(--text)', overflow: 'hidden',
                    }}
                    dangerouslySetInnerHTML={{ __html: varHighlightHtml }}
                  />
                )}
              </div>
            )}
            {mode !== 'edit' && (
              <div
                style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: 'var(--bg)', fontSize: 13, lineHeight: 1.7, color: 'var(--text)' }}
                dangerouslySetInnerHTML={{ __html: preview }}
              />
            )}
          </>
        )}

        {/* Comments panel */}
        <AnimatePresence>
          {showComments && (
            <CommentsPanel section={section} onClose={() => setShowComments(false)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface TitleBarProps {
  section: { id: string; title: string };
  titleVal: string;
  setTitleVal: (v: string) => void;
  editingTitle: boolean;
  setEditingTitle: (v: boolean) => void;
  commitTitle: () => void;
}

function SectionTitleBar({ section, titleVal, setTitleVal, editingTitle, setEditingTitle, commitTitle }: TitleBarProps) {
  return (
    <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
      <SectionTitleInline {...{ section, titleVal, setTitleVal, editingTitle, setEditingTitle, commitTitle }} />
    </div>
  );
}

function SectionTitleInline({ section, titleVal, setTitleVal, editingTitle, setEditingTitle, commitTitle }: TitleBarProps) {
  return (
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
          style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', cursor: 'text', display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {section.title}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>(click to rename)</span>
        </div>
      )}
    </div>
  );
}
