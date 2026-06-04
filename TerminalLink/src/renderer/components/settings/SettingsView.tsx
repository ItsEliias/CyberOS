import { useState } from 'react';
import type { TerminalSettings, OutputAlertRule, KeybindingMap } from '../../types/terminallink';
import SshManager from '../SshManager';
import { useTerminalLinkStore } from '../../stores/useTerminalLinkStore';

interface Props {
  settings: TerminalSettings;
  onUpdate: (patch: Partial<TerminalSettings>) => void;
}

const INPUT: React.CSSProperties = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 3,
  padding: '6px 8px', color: 'var(--text)', fontSize: 12, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
};
const SELECT: React.CSSProperties = { ...INPUT, cursor: 'pointer' };
const SECTION_TITLE: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
  color: 'var(--accent)', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--border)',
};
const LABEL: React.CSSProperties = { fontSize: 11, color: 'var(--text-dim)', marginBottom: 4, display: 'block' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={SECTION_TITLE}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={LABEL}>{label}</label>{children}</div>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
      <div onClick={() => onChange(!checked)} style={{ width: 32, height: 16, borderRadius: 8, background: checked ? 'var(--accent)' : 'var(--border)', position: 'relative', transition: 'background 0.2s ease', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 2, left: checked ? 18 : 2, width: 12, height: 12, borderRadius: '50%', background: '#0a0e14', transition: 'left 0.2s ease' }} />
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</span>
    </label>
  );
}

function AlertRules({ rules, onChange }: { rules: OutputAlertRule[]; onChange: (r: OutputAlertRule[]) => void }) {
  function toggle(id: string) { onChange(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)); }
  function remove(id: string) { onChange(rules.filter(r => r.id !== id)); }
  function add()             { onChange([...rules, { id: `rule-${Date.now()}`, pattern: '', label: 'Alert', notificationType: 'visual', enabled: true }]); }
  function update(id: string, field: keyof OutputAlertRule, value: string | boolean) {
    onChange(rules.map(r => r.id === id ? { ...r, [field]: value } : r));
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rules.map(r => (
        <div key={r.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={r.enabled} onChange={() => toggle(r.id)} style={{ accentColor: 'var(--accent)', flexShrink: 0 }} />
          <input value={r.pattern} onChange={e => update(r.id, 'pattern', e.target.value)} placeholder="Regex" style={{ ...INPUT, flex: 2, padding: '4px 6px' }} />
          <input value={r.label} onChange={e => update(r.id, 'label', e.target.value)} placeholder="Label" style={{ ...INPUT, flex: 1, padding: '4px 6px' }} />
          <button onClick={() => remove(r.id)} style={{ fontSize: 10, color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✕</button>
        </div>
      ))}
      <button onClick={add} style={{ fontSize: 11, padding: '4px 0', borderRadius: 3, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer' }}>
        + Add Rule
      </button>
    </div>
  );
}

function KeybindingsTable({ kb, onChange }: { kb: KeybindingMap; onChange: (k: KeybindingMap) => void }) {
  const [rebinding, setRebinding] = useState<keyof KeybindingMap | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {(Object.entries(kb) as [keyof KeybindingMap, string][]).map(([action, binding]) => (
        <div key={action} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid rgba(42,51,71,0.4)' }}>
          <span style={{ flex: 1, fontSize: 11, color: 'var(--text-dim)', textTransform: 'capitalize' }}>
            {action.replace(/([A-Z])/g, ' $1')}
          </span>
          {rebinding === action ? (
            <input
              autoFocus
              placeholder="Press key combo…"
              onKeyDown={e => {
                e.preventDefault();
                const parts: string[] = [];
                if (e.metaKey) parts.push('Meta');
                if (e.ctrlKey) parts.push('Ctrl');
                if (e.shiftKey) parts.push('Shift');
                if (e.altKey) parts.push('Alt');
                const k = e.key;
                if (!['Meta','Control','Shift','Alt'].includes(k)) parts.push(k);
                if (parts.length > 0) { onChange({ ...kb, [action]: parts.join('+') }); setRebinding(null); }
              }}
              onBlur={() => setRebinding(null)}
              style={{ ...INPUT, width: 140, fontSize: 11, padding: '3px 6px' }}
            />
          ) : (
            <button
              onClick={() => setRebinding(action)}
              style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'monospace', minWidth: 120 }}
            >
              {binding}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function SettingsView({ settings, onUpdate }: Props) {
  const { sshProfiles, addSshProfile, removeSshProfile } = useTerminalLinkStore();

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20, maxWidth: 580, margin: '0 auto', width: '100%' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 20, letterSpacing: 0.5 }}>
        Settings
      </div>

      <Section title="Terminal">
        <Field label="Shell path">
          <input type="text" value={settings.shellPath} onChange={e => onUpdate({ shellPath: e.target.value })} placeholder="/bin/zsh" style={INPUT} />
        </Field>
        <Field label={`Font size: ${settings.fontSize}px`}>
          <input type="range" min={11} max={20} value={settings.fontSize} onChange={e => onUpdate({ fontSize: Number(e.target.value) })} style={{ width: '100%', accentColor: 'var(--accent)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}><span>11px</span><span>20px</span></div>
        </Field>
        <Field label="Cursor style">
          <select value={settings.cursorStyle} onChange={e => onUpdate({ cursorStyle: e.target.value as TerminalSettings['cursorStyle'] })} style={SELECT}>
            <option value="block">Block</option><option value="underline">Underline</option><option value="bar">Bar</option>
          </select>
        </Field>
        <Field label="Scrollback lines">
          <select value={settings.scrollbackLines} onChange={e => onUpdate({ scrollbackLines: Number(e.target.value) })} style={SELECT}>
            <option value={500}>500</option><option value={1000}>1 000</option><option value={5000}>5 000</option><option value={0}>Unlimited</option>
          </select>
        </Field>
      </Section>

      <Section title="Session">
        <Toggle checked={settings.autoLinkSession} onChange={v => onUpdate({ autoLinkSession: v })} label="Auto-link new sessions to active CyberLab session" />
        <Field label="Max commands to store">
          <select value={settings.maxHistoryEntries} onChange={e => onUpdate({ maxHistoryEntries: Number(e.target.value) })} style={SELECT}>
            <option value={1000}>1 000</option><option value={5000}>5 000</option><option value={0}>Unlimited</option>
          </select>
        </Field>
      </Section>

      <Section title="Context">
        <Toggle checked={settings.autoInjectTarget} onChange={v => onUpdate({ autoInjectTarget: v })} label="Auto-inject $TARGET from shared_context" />
        <Toggle checked={settings.showContextBar} onChange={v => onUpdate({ showContextBar: v })} label="Show context bar" />
      </Section>

      <Section title="Output Alerts">
        <AlertRules rules={settings.outputAlerts} onChange={r => onUpdate({ outputAlerts: r })} />
      </Section>

      <Section title="AI Assistant (Ollama)">
        <Toggle checked={settings.ollamaEnabled} onChange={v => onUpdate({ ollamaEnabled: v })} label="Enable AI command suggestions (shown below terminal)" />
        <Field label="Ollama URL">
          <input type="text" value={settings.ollamaUrl} onChange={e => onUpdate({ ollamaUrl: e.target.value })} placeholder="http://localhost:11434" style={INPUT} />
        </Field>
      </Section>

      <Section title="SSH Profiles">
        <SshManager profiles={sshProfiles} onConnect={() => {}} onAdd={p => addSshProfile(p)} onRemove={removeSshProfile} />
      </Section>

      <Section title="Keybindings">
        <KeybindingsTable kb={settings.keybindings} onChange={k => onUpdate({ keybindings: k })} />
      </Section>
    </div>
  );
}
