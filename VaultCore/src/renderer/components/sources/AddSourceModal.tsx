import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ScrapingSource, SourceType, SourceInterval } from '../../types/vaultcore';

const SOURCE_TYPES: SourceType[] = [
  'website', 'github', 'rss', 'medium', 'cve', 'reddit',
  'youtube', 'obsidian-publish', 'pdf', 'twitter', 'notion',
];

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  'website':          'Website',
  'github':           'GitHub',
  'rss':              'RSS Feed',
  'medium':           'Medium',
  'cve':              'CVE / NVD',
  'reddit':           'Reddit',
  'youtube':          'YouTube',
  'obsidian-publish': 'Obsidian Publish',
  'pdf':              'PDF',
  'twitter':          'Twitter / X',
  'notion':           'Notion',
};

const INTERVALS: SourceInterval[] = ['hourly', 'daily', 'weekly', 'manual'];

interface FormData {
  name: string;
  type: SourceType;
  url: string;
  outputPath: string;
  interval: SourceInterval;
  tags: string;
}

const DEFAULT_FORM: FormData = {
  name: '',
  type: 'website',
  url: '',
  outputPath: '',
  interval: 'daily',
  tags: '',
};

interface Props {
  initialData?: Partial<ScrapingSource>;
  onSave: (data: Omit<ScrapingSource, 'id'>) => Promise<void>;
  onClose: () => void;
}

export default function AddSourceModal({ initialData, onSave, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    name: initialData?.name ?? '',
    type: initialData?.type ?? 'website',
    url: initialData?.url ?? '',
    outputPath: initialData?.outputPath ?? '',
    interval: initialData?.interval ?? 'daily',
    tags: (initialData?.tags ?? []).join(', '),
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isEdit = !!initialData;

  function update(patch: Partial<FormData>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  async function handleTest() {
    if (!form.url) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await window.electronAPI.scrapeSourceNow('test-url');
      setTestResult(result.success ? 'Connection successful' : `Error: ${result.error}`);
    } catch {
      setTestResult('Could not connect to source');
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const tags = form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith('#') ? t : `#${t}`));

      await onSave({
        name: form.name.trim(),
        type: form.type,
        url: form.url.trim(),
        outputPath: form.outputPath.trim(),
        interval: form.interval,
        enabled: true,
        consecutiveFailures: 0,
        health: 'healthy',
        totalNotesSaved: 0,
        tags,
      });
    } finally {
      setSaving(false);
    }
  }

  const step1Valid = form.name.trim().length > 0 && form.url.trim().length > 0;

  return (
    <AnimatePresence>
      <motion.div
        key="add-source-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="w-full max-w-lg rounded-xl border overflow-hidden"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {isEdit ? 'Edit Source' : 'Add Source'}
              </div>
              {!isEdit && (
                <div className="flex items-center gap-2 mt-1">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className="w-6 h-1 rounded-full"
                      style={{ background: s <= step ? 'var(--accent)' : 'var(--border)' }}
                    />
                  ))}
                  <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Step {step} of 3</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-lg w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-white/10"
              style={{ color: 'var(--text-dim)' }}
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {(step === 1 || isEdit) && (
              <>
                <div className="space-y-3">
                  <Field label="Name">
                    <input
                      value={form.name}
                      onChange={(e) => update({ name: e.target.value })}
                      placeholder="HackTricks GitHub"
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </Field>
                  <Field label="Type">
                    <select
                      value={form.type}
                      onChange={(e) => update({ type: e.target.value as SourceType })}
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                      {SOURCE_TYPES.map((t) => (
                        <option key={t} value={t}>{SOURCE_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="URL">
                    <input
                      value={form.url}
                      onChange={(e) => update({ url: e.target.value })}
                      placeholder="https://…"
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none font-mono"
                      style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                  </Field>
                </div>
              </>
            )}

            {(step === 2 || isEdit) && (
              <div className="space-y-3">
                <Field label="Output path" hint="Relative path within vault">
                  <input
                    value={form.outputPath}
                    onChange={(e) => update({ outputPath: e.target.value })}
                    placeholder="/HackTricks/"
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none font-mono"
                    style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </Field>
                <Field label="Schedule">
                  <div className="flex gap-2 flex-wrap">
                    {INTERVALS.map((i) => (
                      <button
                        key={i}
                        onClick={() => update({ interval: i })}
                        className="px-3 py-1.5 rounded-lg text-xs capitalize border transition-all"
                        style={{
                          background: form.interval === i ? 'var(--accent)' : 'transparent',
                          borderColor: form.interval === i ? 'var(--accent)' : 'var(--border)',
                          color: form.interval === i ? '#fff' : 'var(--text-muted)',
                        }}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Default tags" hint="Comma separated, e.g. #linux, #tools">
                  <input
                    value={form.tags}
                    onChange={(e) => update({ tags: e.target.value })}
                    placeholder="#technique, #tools"
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </Field>
              </div>
            )}

            {step === 3 && !isEdit && (
              <div className="space-y-4">
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Test the source before saving to confirm it's reachable.
                </div>
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="w-full py-2 rounded-lg text-sm border transition-all disabled:opacity-40"
                  style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                >
                  {testing ? 'Testing…' : 'Test URL'}
                </button>
                {testResult && (
                  <div
                    className="text-xs px-3 py-2 rounded-lg"
                    style={{
                      background: testResult.startsWith('Error') || testResult.startsWith('Could')
                        ? 'rgba(248,81,73,0.1)' : 'rgba(63,185,80,0.1)',
                      color: testResult.startsWith('Error') || testResult.startsWith('Could')
                        ? '#f85149' : '#3fb950',
                    }}
                  >
                    {testResult}
                  </div>
                )}
                <div
                  className="rounded-lg border p-3 text-xs space-y-1"
                  style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
                >
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-dim)' }}>Name</span>
                    <span style={{ color: 'var(--text-muted)' }}>{form.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-dim)' }}>Type</span>
                    <span style={{ color: 'var(--text-muted)' }}>{SOURCE_TYPE_LABELS[form.type]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-dim)' }}>Schedule</span>
                    <span style={{ color: 'var(--text-muted)' }}>{form.interval}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-dim)' }}>Output</span>
                    <span style={{ color: 'var(--text-muted)' }}>{form.outputPath || '(root)'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 pb-5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs border transition-all hover:bg-white/5"
              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
            <div className="flex gap-2">
              {step > 1 && !isEdit && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="px-4 py-2 rounded-lg text-xs border transition-all hover:bg-white/5"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  Back
                </button>
              )}
              {!isEdit && step < 3 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={step === 1 && !step1Valid}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving || (!isEdit && !step1Valid)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Source'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
          {label}
        </label>
        {hint && (
          <span className="text-[9px]" style={{ color: 'var(--text-dim)' }}>— {hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}
