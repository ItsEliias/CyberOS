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

export default function TemplatesView({ onInsert }: Props) {
  return (
    <div className="flex flex-col h-full overflow-y-auto p-6"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
      <div className="text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>Templates</div>
      <div className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Click any template to insert it into the editor.
      </div>

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
