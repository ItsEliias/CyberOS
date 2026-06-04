import { useState } from 'react';
import type { Template } from '@shared/types';

interface Props {
  template?: Template;
  onSave: (t: Template) => void;
  onCancel: () => void;
}

export default function TemplateEditor({ template, onSave, onCancel }: Props) {
  const [name, setName]       = useState(template?.name || '');
  const [content, setContent] = useState(template?.content || '');

  function handleSave() {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    onSave({
      id        : template?.id || `custom-${Date.now()}`,
      name      : name.trim(),
      content,
      isBuiltIn : false,
      createdAt : template?.createdAt || now,
    });
  }

  return (
    <div
      className="flex flex-col gap-4 p-4 rounded-xl border"
      style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
    >
      <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
        {template ? 'Edit Template' : 'New Template'}
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-dim)' }}>
          Template Name
        </label>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Recon Finding"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--text-dim)' }}>
          Content — use {'{{LAB}}'}, {'{{TARGET}}'}, {'{{IP}}'} as placeholders
        </label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={'# {{LAB}} — {{TARGET}}\n\n**IP:** {{IP}}\n\n**Finding:**\n\n**Notes:**\n'}
          rows={12}
          className="w-full px-3 py-2 rounded-lg text-sm font-mono resize-none outline-none"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', lineHeight: '1.7' }}
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-white/5"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {template ? 'Save Changes' : 'Create Template'}
        </button>
      </div>
    </div>
  );
}
