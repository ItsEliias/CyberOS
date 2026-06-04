import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TEMPLATES_BY_MODE, TEMPLATE_LABELS, getTemplate } from '../lib/templates';
import TemplateEditor from './templates/TemplateEditor';
import { useStore } from '../store';
import type { AiCtx, Template } from '@shared/types';

interface Props {
  onInsert: (content: string) => void;
}

const MODE_LABELS: Record<string, string> = {
  work      : '💼 Work',
  cyber     : '🔐 Cyber',
  personal  : '👤 Personal',
  pentest   : '🎯 Pentest Methodology',
  cheatsheet: '📋 Cheatsheets',
};

const DEFAULT_LAB_TEMPLATE = `**Lab:** {{LAB}}\n**Target:** {{TARGET}}{{IP}}\n**Finding:** \n`;

interface SessionCtx {
  currentLab:   string | null;
  activeTarget: string | null;
  activeIP:     string | null;
}

const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: 'builtin-lab',
    name: 'Lab Session',
    content: '**Lab:** {{LAB}}\n**Target:** {{TARGET}}\n**IP:** {{IP}}\n\n**Finding:**\n\n**Notes:**\n',
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-recon',
    name: 'Recon Finding',
    content: '## Recon Finding\n\n**Target:** {{TARGET}}\n**IP:** {{IP}}\n**Service:**\n**Version:**\n\n**Description:**\n\n**Evidence:**\n```\n\n```\n\n**Impact:**\n\n**Recommendation:**\n',
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-quick',
    name: 'Quick Note',
    content: `# Note — ${new Date().toISOString().slice(0,10)}\n\n---\n\n`,
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'builtin-cred',
    name: 'Credential Record',
    content: '## Credential\n\n| Field | Value |\n|-------|-------|\n| Username | |\n| Password | |\n| Service | |\n| URL / IP | |\n| Notes | |\n',
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
];

function applyPlaceholders(content: string, session: SessionCtx | null): string {
  const lab    = session?.currentLab   || '';
  const target = session?.activeTarget || '';
  const ip     = session?.activeIP     ? ` (${session.activeIP})` : '';
  return content
    .replace(/\{\{LAB\}\}/g, lab)
    .replace(/\{\{TARGET\}\}/g, target)
    .replace(/\{\{IP\}\}/g, ip);
}

export default function TemplatesView({ onInsert }: Props) {
  const { vaultPath } = useStore();
  const [seedingSheets, setSeedingSheets]   = useState(false);
  const [seedToast, setSeedToast]           = useState('');
  const [session, setSession]               = useState<SessionCtx | null>(null);
  const [labTemplate, setLabTemplate]         = useState(DEFAULT_LAB_TEMPLATE);
  const [editingLab, setEditingLab]           = useState(false);
  const [labTemplateEdit, setLabTemplateEdit] = useState(DEFAULT_LAB_TEMPLATE);
  const [savedLabel, setSavedLabel]           = useState(false);
  const [userTemplates, setUserTemplates]     = useState<Template[]>([]);
  const [showEditor, setShowEditor]           = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | undefined>();

  useEffect(() => {
    window.ghostvault.getSessionContext().then(ctx => {
      if (ctx) setSession(ctx);
    });
    window.ghostvault.getConfig().then(cfg => {
      if (cfg.labSessionTemplate) setLabTemplate(cfg.labSessionTemplate);
      if ((cfg as Record<string, unknown>).userTemplates) {
        try {
          const stored = (cfg as Record<string, unknown>).userTemplates;
          if (Array.isArray(stored)) setUserTemplates(stored as Template[]);
        } catch { /* ignore */ }
      }
    });
  }, []);

  async function saveUserTemplates(templates: Template[]) {
    setUserTemplates(templates);
    await window.ghostvault.saveConfig({ userTemplates: templates } as Parameters<typeof window.ghostvault.saveConfig>[0]);
  }

  function handleSaveTemplate(t: Template) {
    const updated = editingTemplate
      ? userTemplates.map(ut => ut.id === t.id ? t : ut)
      : [...userTemplates, t];
    saveUserTemplates(updated);
    setShowEditor(false);
    setEditingTemplate(undefined);
  }

  function handleDeleteTemplate(id: string) {
    saveUserTemplates(userTemplates.filter(t => t.id !== id));
  }

  function handleEditTemplate(t: Template) {
    setEditingTemplate(t);
    setShowEditor(true);
  }

  function buildLabContent() {
    const lab    = session?.currentLab   || '[currentLab]';
    const target = session?.activeTarget || '[activeTarget]';
    const ip     = session?.activeIP     ? ` (${session.activeIP})` : '';
    return labTemplate
      .replace('{{LAB}}', lab)
      .replace('{{TARGET}}', target)
      .replace('{{IP}}', ip);
  }

  async function saveLabTemplate() {
    await window.ghostvault.saveConfig({ labSessionTemplate: labTemplateEdit });
    setLabTemplate(labTemplateEdit);
    setEditingLab(false);
    setSavedLabel(true);
    setTimeout(() => setSavedLabel(false), 2000);
  }

  const CHEATSHEET_KEYS = TEMPLATES_BY_MODE['cheatsheet'] || [];

  async function seedCheatsheets() {
    if (!vaultPath || seedingSheets) return;
    setSeedingSheets(true);
    try {
      await window.ghostvault.createFolder(vaultPath, 'Cheatsheets');
      for (const key of CHEATSHEET_KEYS) {
        const label = TEMPLATE_LABELS[key] || key;
        const title = label.replace(/^[^\w\s]*\s/, '').trim();
        await window.ghostvault.newNote(vaultPath, 'Cheatsheets', title);
        const content = getTemplate(key);
        const { notes } = await window.ghostvault.loadVault(vaultPath);
        const created = notes.find(n => n.name === title);
        if (created) await window.ghostvault.writeNote(created.path, content);
      }
      setSeedToast(`${CHEATSHEET_KEYS.length} cheatsheets imported to Cheatsheets/`);
      setTimeout(() => setSeedToast(''), 3000);
    } finally {
      setSeedingSheets(false);
    }
  }

  return (
    <div
      className="flex flex-col h-full overflow-y-auto p-6"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="text-xl font-bold" style={{ color: 'var(--text)' }}>Templates</div>
        <div className="flex gap-2">
          <button
            onClick={seedCheatsheets}
            disabled={seedingSheets || !vaultPath}
            className="text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors hover:bg-white/5 disabled:opacity-40"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            title="Import security cheatsheets as vault notes"
          >
            {seedingSheets ? 'Importing…' : 'Import Cheatsheets'}
          </button>
          <button
            onClick={() => { setEditingTemplate(undefined); setShowEditor(true); }}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: '#7bb8ff', color: '#0a0a0f' }}
          >
            + New Template
          </button>
        </div>
      </div>
      {seedToast && (
        <div className="mb-3 px-3 py-2 rounded-lg text-xs font-medium"
          style={{ background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.3)', color: '#3fb950' }}>
          {seedToast}
        </div>
      )}
      <div className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Click any template to insert it into the editor.
      </div>

      {/* Template Editor */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6"
          >
            <TemplateEditor
              template={editingTemplate}
              onSave={handleSaveTemplate}
              onCancel={() => { setShowEditor(false); setEditingTemplate(undefined); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lab Session template */}
      <div className="mb-6 p-3 rounded-lg border"
        style={{ borderColor: 'var(--accent)', background: 'rgba(99,102,241,.06)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--accent)' }}>
            Lab Session
          </div>
          {session && (
            <span className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              Active: {[session.currentLab, session.activeTarget].filter(Boolean).join(' / ')}
            </span>
          )}
        </div>

        {!editingLab ? (
          <div className="space-y-2">
            <pre className="text-xs p-2 rounded whitespace-pre-wrap"
              style={{ background: 'var(--bg3)', color: 'var(--text-dim)', fontFamily: 'inherit' }}>
              {labTemplate}
            </pre>
            <div className="flex gap-2">
              <button
                onClick={() => onInsert(buildLabContent())}
                className="flex-1 text-xs py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                {session ? 'Insert with Session Data' : 'Insert Template'}
              </button>
              <button
                onClick={() => { setLabTemplateEdit(labTemplate); setEditingLab(true); }}
                className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                Edit
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-[10px] mb-1" style={{ color: 'var(--text-dim)' }}>
              Use {'{{LAB}}'}, {'{{TARGET}}'}, {'{{IP}}'} as placeholders.
            </div>
            <textarea
              value={labTemplateEdit}
              onChange={e => setLabTemplateEdit(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg text-xs font-mono outline-none resize-none"
              rows={5}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <div className="flex gap-2">
              <button
                onClick={saveLabTemplate}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
                style={{ background: savedLabel ? '#22c55e' : 'var(--accent)', color: '#fff' }}>
                {savedLabel ? 'Saved' : 'Save'}
              </button>
              <button
                onClick={() => setEditingLab(false)}
                className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Built-in templates */}
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--text-dim)' }}>
          Built-in
        </div>
        <div className="grid grid-cols-2 gap-2">
          {BUILT_IN_TEMPLATES.map(t => (
            <div
              key={t.id}
              className="px-3 py-2.5 rounded-lg border transition-all hover:scale-[1.01]"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
            >
              <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>{t.name}</div>
              <pre
                className="text-[10px] truncate mb-2 leading-relaxed"
                style={{ color: 'var(--text-dim)', fontFamily: 'inherit', whiteSpace: 'pre-wrap', maxHeight: 40, overflow: 'hidden' }}
              >
                {t.content.split('\n').slice(0, 3).join('\n')}
              </pre>
              <button
                onClick={() => onInsert(applyPlaceholders(t.content, session))}
                className="w-full text-[10px] py-1 rounded font-medium transition-all hover:opacity-80"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                Use
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* User-created templates */}
      {userTemplates.length > 0 && (
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--text-dim)' }}>
            My Templates
          </div>
          <div className="grid grid-cols-2 gap-2">
            {userTemplates.map(t => (
              <div
                key={t.id}
                className="px-3 py-2.5 rounded-lg border"
                style={{ background: 'var(--bg3)', borderColor: 'rgba(123,184,255,0.2)' }}
              >
                <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text)' }}>{t.name}</div>
                <pre
                  className="text-[10px] leading-relaxed mb-2"
                  style={{ color: 'var(--text-dim)', fontFamily: 'inherit', whiteSpace: 'pre-wrap', maxHeight: 40, overflow: 'hidden' }}
                >
                  {t.content.split('\n').slice(0, 3).join('\n')}
                </pre>
                <div className="flex gap-1">
                  <button
                    onClick={() => onInsert(applyPlaceholders(t.content, session))}
                    className="flex-1 text-[10px] py-1 rounded font-medium transition-all hover:opacity-80"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    Use
                  </button>
                  <button
                    onClick={() => handleEditTemplate(t)}
                    className="text-[10px] px-2 py-1 rounded border transition-colors hover:bg-white/5"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(t.id)}
                    className="text-[10px] px-2 py-1 rounded border transition-colors hover:bg-white/5"
                    style={{ borderColor: 'var(--border)', color: '#f85149' }}
                  >
                    Del
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Standard library templates by mode */}
      {(Object.entries(TEMPLATES_BY_MODE) as [string, string[]][]).map(([mode, keys]) => (
        <div key={mode} className="mb-6">
          <div className="text-[10px] uppercase tracking-widest font-semibold mb-2"
            style={{ color: 'var(--text-dim)' }}>
            {MODE_LABELS[mode]}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {keys.map(key => (
              <button key={key}
                onClick={() => onInsert(getTemplate(key))}
                className="text-left px-3 py-2.5 rounded-lg border text-sm transition-all hover:scale-[1.01]"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                {TEMPLATE_LABELS[key] || key}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
