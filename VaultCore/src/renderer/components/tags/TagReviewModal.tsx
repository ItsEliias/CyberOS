import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useVaultCoreStore } from '../../stores/useVaultCoreStore';

export default function TagReviewModal() {
  const { tagReviewPending, setTagReviewPending, sources, updateSource } = useVaultCoreStore();
  const [customTagInput, setCustomTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  if (!tagReviewPending) return null;

  const { sourceId, suggestedTags, selectedTags, notesToSave } = tagReviewPending;
  const source = sources.find((s) => s.id === sourceId);

  function toggleTag(tag: string) {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setTagReviewPending({ ...tagReviewPending, selectedTags: next });
  }

  function addCustomTag() {
    const t = customTagInput.trim().replace(/^#/, '');
    if (!t) return;
    const tag = `#${t}`;
    if (!suggestedTags.includes(tag)) {
      setTagReviewPending({
        ...tagReviewPending,
        suggestedTags: [...suggestedTags, tag],
        selectedTags: [...selectedTags, tag],
      });
    }
    setCustomTagInput('');
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Write each note with frontmatter tags
      for (const note of notesToSave) {
        const fm = buildFrontmatter(selectedTags, source?.name ?? 'VaultCore');
        const content = note.content.startsWith('---')
          ? note.content
          : fm + note.content;
        await window.electronAPI.writeFile(note.path, content);
      }
      // Update source tags list
      if (source) {
        const merged = Array.from(new Set([...source.tags, ...selectedTags]));
        updateSource(sourceId, { tags: merged });
      }
    } finally {
      setSaving(false);
      setTagReviewPending(null);
    }
  }

  function handleCancel() {
    setTagReviewPending(null);
  }

  return (
    <AnimatePresence>
      <motion.div
        key="tag-review-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={handleCancel}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="w-full max-w-md rounded-xl border overflow-hidden"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Tag Review: {source?.name ?? 'Source'}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
              {notesToSave.length} note{notesToSave.length !== 1 ? 's' : ''} ready to save
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Auto-detected tags for this content:
            </div>

            {/* Tag pills */}
            <div className="flex flex-wrap gap-2">
              {suggestedTags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all"
                    style={active ? {
                      background: 'var(--accent)',
                      borderColor: 'var(--accent)',
                      color: '#fff',
                    } : {
                      background: 'transparent',
                      borderColor: 'var(--border)',
                      color: 'var(--text-dim)',
                    }}
                  >
                    <span>{active ? '✓' : '○'}</span>
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom tag input */}
            <div className="flex items-center gap-2">
              <input
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCustomTag(); }}
                placeholder="+ Add custom tag"
                className="flex-1 px-3 py-1.5 rounded-lg text-xs border outline-none"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <button
                onClick={addCustomTag}
                className="px-3 py-1.5 rounded-lg text-xs border transition-all"
                style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
              >
                Add
              </button>
            </div>

            <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
              These tags will be written to each note's YAML frontmatter.
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-4 pb-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-xs border transition-all hover:bg-white/5"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {saving ? 'Saving…' : 'Save with Tags'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function buildFrontmatter(tags: string[], source: string): string {
  const tagList = tags.map((t) => `  - "${t}"`).join('\n');
  return `---\ntags:\n${tagList}\nsource: "${source}"\nscraped_at: "${new Date().toISOString()}"\n---\n\n`;
}
