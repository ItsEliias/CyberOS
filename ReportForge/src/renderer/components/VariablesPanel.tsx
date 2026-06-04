import { useStore } from '../store';
import { KNOWN_VARS } from '../utils/variables';
import type { ReportVariables } from '@shared/types';

const VAR_LABELS: Record<keyof ReportVariables, string> = {
  client_name    : 'Client Name',
  test_date      : 'Test Date',
  tester_name    : 'Tester Name',
  scope          : 'Scope',
  engagement_type: 'Engagement Type',
};

const VAR_PLACEHOLDERS: Record<keyof ReportVariables, string> = {
  client_name    : 'e.g. ACME Corp',
  test_date      : '',
  tester_name    : 'e.g. Jane Smith',
  scope          : 'e.g. 10.0.0.0/8',
  engagement_type: 'e.g. External Pentest',
};

interface Props {
  onClose: () => void;
}

export default function VariablesPanel({ onClose }: Props) {
  const { activeReport, updateVariables } = useStore();
  if (!activeReport) return null;

  const vars = activeReport.variables ?? {} as ReportVariables;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
    }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 10, width: 440, overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Report Variables</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Used in templates via <code style={{ color: 'var(--accent)', background: 'rgba(63,185,80,0.1)', padding: '0 4px', borderRadius: 3 }}>{'{{variable}}'}</code>
            </p>
          </div>
          <button className="btn-ghost" style={{ padding: '3px 10px', fontSize: 12 }} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {KNOWN_VARS.map(key => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between' }}>
                <span>{VAR_LABELS[key]}</span>
                <code style={{ color: 'var(--accent)', fontFamily: '"SF Mono", monospace', fontSize: 10, textTransform: 'none' }}>
                  {`{{${key}}}`}
                </code>
              </label>
              <input
                type={key === 'test_date' ? 'date' : 'text'}
                value={(vars as Record<string, string>)[key] ?? ''}
                onChange={e => updateVariables({ [key]: e.target.value } as Partial<ReportVariables>)}
                placeholder={VAR_PLACEHOLDERS[key]}
                style={{ width: '100%' }}
              />
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" style={{ padding: '5px 16px', fontSize: 12 }} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
