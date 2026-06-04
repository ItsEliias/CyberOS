// VaultCore — Settings View (Screen 7)
// Vault path, scheduling, source health thresholds, tag rules, backup export/import

import { useState } from 'react';
import { useVaultCoreStore } from '../../stores/useVaultCoreStore';
import { useSecretStore } from '../../stores/useSecretStore';
import { useStore } from '../../store';
import type { SourceInterval, TagRule } from '../../types/vaultcore';

const INTERVALS: SourceInterval[] = ['hourly', 'daily', 'weekly', 'manual'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-wider mb-3 pb-1 border-b"
        style={{ color: 'var(--accent)', borderColor: 'var(--border)' }}
      >
        {title}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Row({ label, description, children }: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="shrink-0 pt-0.5" style={{ minWidth: 200 }}>
        <div className="text-sm" style={{ color: 'var(--text)' }}>{label}</div>
        {description && (
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{description}</div>
        )}
      </div>
      <div className="flex-1 max-w-sm">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
      style={{ background: checked ? 'var(--accent)' : 'var(--border)' }}
    >
      <span
        className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  );
}

function TagRuleRow({ rule, onRemove }: { rule: TagRule; onRemove: () => void }) {
  return (
    <div
      className="flex items-start gap-3 px-3 py-2.5 rounded-lg border"
      style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
          >
            {rule.tag}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{rule.category}</span>
        </div>
        <div className="text-[10px] mt-1 truncate" style={{ color: 'var(--text-dim)' }}>
          {rule.keywords.join(', ')}
        </div>
      </div>
      <button
        onClick={onRemove}
        className="text-[10px] px-2 py-0.5 rounded border transition-all hover:bg-red-500/10 shrink-0"
        style={{ borderColor: 'var(--border)', color: '#f85149' }}
      >
        Remove
      </button>
    </div>
  );
}

export default function SettingsView() {
  const { settings, updateSettings, addTagRule, removeTagRule } = useVaultCoreStore();
  const { vaultPath, setVaultPath, addLog } = useStore();
  const { secrets, currentUser, setCurrentUser, addAuditEntry } = useSecretStore();

  const [saved, setSaved] = useState(false);
  const [newRuleCategory, setNewRuleCategory] = useState('');
  const [newRuleTag, setNewRuleTag] = useState('');
  const [newRuleKeywords, setNewRuleKeywords] = useState('');
  const [backupPassword, setBackupPassword] = useState('');
  const [backupStatus, setBackupStatus] = useState('');
  const [userDraft, setUserDraft] = useState(currentUser);

  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function handleExportBackup() {
    if (!backupPassword) { setBackupStatus('Password required'); return; }
    const payload = secrets.map((s) => ({
      id: s.id, repoId: s.repoId, filePath: s.filePath,
      lineNumber: s.lineNumber, patternType: s.patternType,
      valueHash: hashValue(s.maskedValue),
      environment: s.environment, secretType: s.secretType,
      comment: s.comment, expiresAt: s.expiresAt,
      rotationHistory: s.rotationHistory,
    }));
    setBackupStatus('Exporting…');
    const res = await window.electronAPI.exportBackup(payload, backupPassword);
    if (res.canceled) { setBackupStatus(''); return; }
    if (res.error) { setBackupStatus(`Error: ${res.error}`); return; }
    addAuditEntry({ timestamp: new Date().toISOString(), action: 'export', user: currentUser, detail: `Exported ${payload.length} secrets` });
    setBackupStatus(`Saved to ${res.filePath?.split('/').pop()}`);
    setBackupPassword('');
    setTimeout(() => setBackupStatus(''), 4000);
  }

  async function handleImportBackup() {
    if (!backupPassword) { setBackupStatus('Password required'); return; }
    setBackupStatus('Importing…');
    const res = await window.electronAPI.importBackup(backupPassword);
    if (res.canceled) { setBackupStatus(''); return; }
    if (res.error) { setBackupStatus(`Error: ${res.error}`); return; }
    addAuditEntry({ timestamp: new Date().toISOString(), action: 'import', user: currentUser, detail: 'Backup imported' });
    setBackupStatus('Import successful — restart to apply');
    setBackupPassword('');
    setTimeout(() => setBackupStatus(''), 5000);
  }

  function hashValue(v: string): string {
    let h = 0;
    for (let i = 0; i < v.length; i++) { h = ((h << 5) - h) + v.charCodeAt(i); h |= 0; }
    return Math.abs(h).toString(16).padStart(8, '0');
  }

  async function handleChangeVault() {
    const p = await window.electronAPI.selectFolder();
    if (!p) return;
    await window.electronAPI.setVaultPath(p);
    setVaultPath(p);
    updateSettings({ vaultPath: p });
    addLog({ type: 'success', message: `Vault path set to: ${p}`, time: new Date().toLocaleTimeString() });
    flash();
  }

  async function handleRevealVault() {
    const p = vaultPath || settings.vaultPath;
    if (p) await window.electronAPI.openFolder(p);
  }

  function handleAddTagRule() {
    const category = newRuleCategory.trim();
    const tag = newRuleTag.trim().startsWith('#') ? newRuleTag.trim() : `#${newRuleTag.trim()}`;
    const keywords = newRuleKeywords.split(',').map((k) => k.trim()).filter(Boolean);
    if (!category || !newRuleTag.trim() || keywords.length === 0) return;
    addTagRule({ category, tag, keywords });
    setNewRuleCategory('');
    setNewRuleTag('');
    setNewRuleKeywords('');
    flash();
  }

  const currentVaultPath = vaultPath || settings.vaultPath;

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto px-5 py-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Settings</div>
          {saved && <span className="text-xs" style={{ color: '#3fb950' }}>Saved ✓</span>}
        </div>

        {/* Vault */}
        <Section title="Vault">
          <Row label="Obsidian Vault Path" description="Where scraped content is saved as markdown notes">
            <div className="flex items-center gap-2">
              <span
                className="flex-1 text-xs font-mono truncate px-3 py-2 rounded-lg border"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: currentVaultPath ? 'var(--text-muted)' : 'var(--text-dim)' }}
              >
                {currentVaultPath || 'Not configured'}
              </span>
              <button
                onClick={handleChangeVault}
                className="px-3 py-2 rounded-lg text-xs border transition-all hover:bg-white/5 shrink-0"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                Change…
              </button>
              {currentVaultPath && (
                <button
                  onClick={handleRevealVault}
                  className="px-3 py-2 rounded-lg text-xs border transition-all hover:bg-white/5 shrink-0"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  Reveal
                </button>
              )}
            </div>
          </Row>
          <Row label="Auto-create Directories" description="Automatically create output directories when writing notes">
            <Toggle
              checked={settings.autoCreateDirs}
              onChange={(v) => { updateSettings({ autoCreateDirs: v }); flash(); }}
            />
          </Row>
        </Section>

        {/* Scheduling */}
        <Section title="Scheduling">
          <Row label="Auto-scrape Enabled" description="Run scheduled scrapes automatically">
            <Toggle
              checked={settings.schedulingEnabled}
              onChange={(v) => { updateSettings({ schedulingEnabled: v }); flash(); }}
            />
          </Row>
          <Row label="Default Interval" description="Default schedule for new sources">
            <div className="flex gap-2 flex-wrap">
              {INTERVALS.map((i) => (
                <button
                  key={i}
                  onClick={() => { updateSettings({ defaultInterval: i }); flash(); }}
                  className="px-3 py-1.5 rounded-lg text-xs capitalize border transition-all"
                  style={{
                    background: settings.defaultInterval === i ? 'var(--accent)' : 'transparent',
                    borderColor: settings.defaultInterval === i ? 'var(--accent)' : 'var(--border)',
                    color: settings.defaultInterval === i ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {i}
                </button>
              ))}
            </div>
          </Row>
        </Section>

        {/* Source Health */}
        <Section title="Source Health">
          <Row label="Failure Threshold for Error" description="Consecutive failures before marking a source as error (default 3)">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={20}
                value={settings.failureThreshold}
                onChange={(e) => updateSettings({ failureThreshold: parseInt(e.target.value, 10) || 3 })}
                onBlur={flash}
                className="w-20 px-3 py-1.5 rounded-lg text-xs border outline-none font-mono"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>failures</span>
            </div>
          </Row>
          <Row label="Auto-disable After Failures" description="Automatically disable sources after reaching the error threshold">
            <Toggle
              checked={settings.autoDisableAfterFailures}
              onChange={(v) => { updateSettings({ autoDisableAfterFailures: v }); flash(); }}
            />
          </Row>
        </Section>

        {/* Tags */}
        <Section title="Tags">
          <Row label="Auto-tag Using Keyword Rules" description="Detect and apply tags based on content keywords">
            <Toggle
              checked={settings.autoTagEnabled}
              onChange={(v) => { updateSettings({ autoTagEnabled: v }); flash(); }}
            />
          </Row>

          {settings.autoTagEnabled && (
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                Tag Rules ({settings.tagRules.length})
              </div>

              {/* Existing rules */}
              <div className="space-y-2 max-h-64 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
                {settings.tagRules.map((rule) => (
                  <TagRuleRow
                    key={rule.category}
                    rule={rule}
                    onRemove={() => { removeTagRule(rule.category); flash(); }}
                  />
                ))}
              </div>

              {/* Add new rule */}
              <div
                className="rounded-lg border p-3 space-y-2"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}
              >
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>
                  Add Rule
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value)}
                    placeholder="category (e.g. forensics)"
                    className="px-2.5 py-1.5 rounded-lg text-xs border outline-none"
                    style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                  <input
                    value={newRuleTag}
                    onChange={(e) => setNewRuleTag(e.target.value)}
                    placeholder="#tag (e.g. #forensics)"
                    className="px-2.5 py-1.5 rounded-lg text-xs border outline-none"
                    style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>
                <input
                  value={newRuleKeywords}
                  onChange={(e) => setNewRuleKeywords(e.target.value)}
                  placeholder="keywords, comma separated"
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none"
                  style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAddTagRule}
                    disabled={!newRuleCategory.trim() || !newRuleTag.trim() || !newRuleKeywords.trim()}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    Add Rule
                  </button>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* Identity (Feature 5 — user in audit log) */}
        <Section title="Identity">
          <Row label="Username" description="Shown in audit log entries for all secret access events">
            <div className="flex items-center gap-2">
              <input
                value={userDraft}
                onChange={(e) => setUserDraft(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-xs border outline-none font-mono"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <button
                onClick={() => { setCurrentUser(userDraft.trim() || 'User'); flash(); }}
                className="px-3 py-2 rounded-lg text-xs border transition-all hover:bg-white/5 shrink-0"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                Save
              </button>
            </div>
          </Row>
        </Section>

        {/* Backup (Feature 17) */}
        <Section title="Backup">
          <Row label="Backup Password" description="AES-256 encrypted. Used for both export and import">
            <input
              type="password"
              value={backupPassword}
              onChange={(e) => setBackupPassword(e.target.value)}
              placeholder="Enter backup password…"
              className="w-full px-3 py-2 rounded-lg text-xs border outline-none"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </Row>
          {backupStatus && (
            <div className="text-[11px] px-3 py-2 rounded border"
              style={{ background: backupStatus.startsWith('Error') ? 'rgba(248,81,73,0.06)' : 'rgba(63,185,80,0.06)', borderColor: backupStatus.startsWith('Error') ? '#f85149' : '#3fb950', color: backupStatus.startsWith('Error') ? '#f85149' : '#3fb950' }}>
              {backupStatus}
            </div>
          )}
          <Row label="Export / Import" description={`Export all ${secrets.length} secrets metadata (values hashed). Import restores metadata.`}>
            <div className="flex gap-2">
              <button
                onClick={handleExportBackup}
                disabled={!backupPassword || secrets.length === 0}
                className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                Export Backup
              </button>
              <button
                onClick={handleImportBackup}
                disabled={!backupPassword}
                className="flex-1 px-3 py-2 rounded-lg text-xs border transition-all hover:bg-white/5 disabled:opacity-40"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                Import Backup
              </button>
            </div>
          </Row>
        </Section>
      </div>
    </div>
  );
}
