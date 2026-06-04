// Feature 5: Audit log — append-only, filterable
import { useState, useMemo } from 'react';
import { useSecretStore } from '../../stores/useSecretStore';
import type { AuditLogEntry } from '../../types/vaultcore';

const ACTION_COLORS: Record<AuditLogEntry['action'], string> = {
  view: '#8b949e', reveal: '#d29922', rotate: '#3fb950',
  export: '#7bb8ff', import: '#a78bfa', scan: '#3fb950',
};

function fmt(ts: string) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AuditLogView() {
  const { auditLog } = useSecretStore();
  const [filterAction, setFilterAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    return auditLog.filter((e) => {
      if (filterAction && e.action !== filterAction) return false;
      if (dateFrom && new Date(e.timestamp) < new Date(dateFrom)) return false;
      if (dateTo && new Date(e.timestamp) > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [auditLog, filterAction, dateFrom, dateTo]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center gap-3 flex-wrap shrink-0"
        style={{ borderColor: '#2a3347' }}>
        <span className="text-sm font-semibold" style={{ color: '#e6edf3' }}>Audit Log</span>
        <span className="text-[11px]" style={{ color: '#8b949e' }}>{filtered.length} entries</span>
        <div className="flex-1" />

        <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
          className="px-2 py-1.5 rounded text-xs border outline-none"
          style={{ background: '#161b27', borderColor: '#2a3347', color: '#e6edf3' }}>
          <option value="">All Actions</option>
          {(['view', 'reveal', 'rotate', 'export', 'import', 'scan'] as AuditLogEntry['action'][]).map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="px-2 py-1.5 rounded text-xs border outline-none"
          style={{ background: '#161b27', borderColor: '#2a3347', color: '#e6edf3' }} />
        <span style={{ color: '#8b949e' }}>–</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="px-2 py-1.5 rounded text-xs border outline-none"
          style={{ background: '#161b27', borderColor: '#2a3347', color: '#e6edf3' }} />
      </div>

      <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <span className="text-sm" style={{ color: '#8b949e' }}>No audit entries yet</span>
          </div>
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b" style={{ borderColor: '#2a3347' }}>
                {['Time', 'Action', 'User', 'File', 'Detail'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left font-medium uppercase tracking-wider text-[10px]"
                    style={{ color: '#8b949e' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b hover:bg-white/5 transition-colors"
                  style={{ borderColor: '#2a3347' }}>
                  <td className="px-4 py-2 font-mono whitespace-nowrap" style={{ color: '#8b949e' }}>
                    {fmt(e.timestamp)}
                  </td>
                  <td className="px-4 py-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
                      style={{ background: `${ACTION_COLORS[e.action]}18`, color: ACTION_COLORS[e.action] }}>
                      {e.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono" style={{ color: '#e6edf3' }}>{e.user}</td>
                  <td className="px-4 py-2 font-mono truncate max-w-48" style={{ color: '#8b949e' }}>
                    {e.secretFile ? e.secretFile.split('/').pop() : '—'}
                  </td>
                  <td className="px-4 py-2 truncate max-w-64" style={{ color: '#8b949e' }}>
                    {e.detail ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
