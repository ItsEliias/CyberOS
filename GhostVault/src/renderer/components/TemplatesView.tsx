import { useState, useEffect } from 'react';
import { TEMPLATES_BY_MODE, TEMPLATE_LABELS, getTemplate } from '../lib/templates';
import type { AiCtx } from '@shared/types';

interface Props {
  onInsert: (content: string) => void;
}

const MODE_LABELS: Record<string, string> = {
  work    : '💼 Work',
  cyber   : '🔐 Cyber',
  personal: '👤 Personal',
};

const DEFAULT_LAB_TEMPLATE = `**Lab:** {{LAB}}\n**Target:** {{TARGET}}{{IP}}\n**Finding:** \n`;

interface SessionCtx {
  currentLab:   string | null;
  activeTarget: string | null;
  activeIP:     string | null;
}

export default function TemplatesView({ onInsert }: Props) {
  const [session, setSession]               = useState<SessionCtx | null>(null);
  const [labTemplate, setLabTemplate]       = useState(DEFAULT_LAB_TEMPLATE);
  const [editingLab, setEditingLab]         = useState(false);
  const [labTemplateEdit, setLabTemplateEdit] = useState(DEFAULT_LAB_TEMPLATE);
  const [savedLabel, setSavedLabel]         = useState(false);

  useEffect(() => {
    window.ghostvault.getSessionContext().then(ctx => {
      if (ctx) setSession(ctx);
    });
    window.ghostvault.getConfig().then(cfg => {
      if (cfg.labSessionTemplate) setLabTemplate(cfg.labSessionTemplate);
    });
  }, []);

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

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
      <div className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>Templates</div>
      <div className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Click any template to insert it into the editor.
      </div>

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

      {/* Standard templates */}
      {(Object.entries(TEMPLATES_BY_MODE) as [AiCtx, string[]][]).map(([mode, keys]) => (
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
