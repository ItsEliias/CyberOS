import { useState } from 'react';
import { CHEATSHEETS } from '../lib/cheatsheets';
import { SOUNDS } from '../lib/sounds';

const SHEET_IDS = Object.keys(CHEATSHEETS);

export default function Cheatsheets() {
  const [selectedId, setSelectedId] = useState(SHEET_IDS[0]);
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  const sheet = CHEATSHEETS[selectedId];

  async function copyStep(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      SOUNDS.click();
      setCopiedStep(text);
      setTimeout(() => setCopiedStep(null), 1200);
    } catch { /* clipboard rejected — leave indicator off so user knows */ }
  }

  return (
    <div className="flex h-full">
      {/* Sheet list */}
      <div className="w-44 border-r border-[var(--border)] p-2 flex-shrink-0">
        <div className="section-header">Cheatsheets</div>
        {SHEET_IDS.map(id => (
          <button
            key={id}
            className={`w-full text-left px-3 py-2 rounded text-xs mb-0.5 transition-colors ${
              selectedId === id ? 'bg-[var(--accent-dim)] text-[var(--accent)]' : 'text-[var(--text-dim)] hover:bg-[var(--bg3)] hover:text-[var(--text)]'
            }`}
            style={{ border: 'none' }}
            onClick={() => setSelectedId(id)}
          >
            {CHEATSHEETS[id].title}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-sm font-semibold text-[var(--accent)] mb-4">{sheet.title}</h2>

        {sheet.items && (
          <div className="space-y-2">
            {sheet.items.map((item, i) => (
              <div key={i} className="card flex items-start gap-3">
                {item.port !== undefined && (
                  <div className="font-mono text-[var(--accent)] text-sm font-bold w-14 flex-shrink-0">{item.port}</div>
                )}
                <div className="flex-1 min-w-0">
                  {item.service && <div className="text-xs font-semibold text-[var(--text)] mb-0.5">{item.service}</div>}
                  <div className="text-xs text-[var(--text-dim)] leading-relaxed">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {sheet.sections?.map(section => (
          <div key={section.heading} className="mb-6">
            <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wide mb-2 pb-1 border-b border-[var(--border)]">
              {section.heading}
            </h3>
            <div className="space-y-1.5">
              {section.items.map((item, i) => {
                const copyText = item.flag || item.step || item.hash || '';
                return (
                  <div key={i} className="flex items-start gap-2 group">
                    {copyText && (
                      <button
                        className="font-mono text-xs text-[var(--accent)] flex-shrink-0 text-left hover:text-[var(--accent-2)] transition-colors max-w-[280px] truncate"
                        style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                        onClick={() => copyStep(copyText)}
                        title={copyText}
                      >
                        {copiedStep === copyText ? '✓' : copyText}
                      </button>
                    )}
                    {item.type && (
                      <span className="text-xs font-semibold text-[var(--warning)] flex-shrink-0">{item.type}</span>
                    )}
                    <span className="text-xs text-[var(--text-dim)] flex-1">{item.description}</span>
                    {item.tool && (
                      <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">{item.tool}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
