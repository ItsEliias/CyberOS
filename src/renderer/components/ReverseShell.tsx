import { useState } from 'react';
import { useStore } from '../store';
import { SHELL_LANGUAGES, ENCODINGS, generateShell, generateListener, buildWrappedPayload, getStabilisationCommands } from '../lib/reverseshell';
import { SOUNDS } from '../lib/sounds';

export default function ReverseShell() {
  const { tabs, activeTabId } = useStore();
  const session = tabs.find(t => t.id === activeTabId)?.session;

  const [ip, setIp] = useState(session?.target.ip || '');
  const [port, setPort] = useState('4444');
  const [selectedLang, setSelectedLang] = useState('bash');
  const [encoding, setEncoding] = useState('raw');
  const [listenerProto, setListenerProto] = useState('nc');
  const [useAlt, setUseAlt] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedListener, setCopiedListener] = useState(false);
  const [showStabilise, setShowStabilise] = useState(false);

  const shell = generateShell(selectedLang, ip, port);
  const rawPayload = useAlt && shell.payloadAlt ? shell.payloadAlt : shell.payload;
  const payload = buildWrappedPayload(selectedLang, rawPayload, encoding);
  const listener = generateListener(port, listenerProto);
  const stab = getStabilisationCommands();

  async function copy(text: string, which: 'payload' | 'listener') {
    await navigator.clipboard.writeText(text);
    SOUNDS.click();
    if (which === 'payload') { setCopiedPayload(true); setTimeout(() => setCopiedPayload(false), 1500); }
    else { setCopiedListener(true); setTimeout(() => setCopiedListener(false), 1500); }
  }

  return (
    <div className="flex h-full">
      {/* Language list */}
      <div className="w-44 border-r border-[var(--border)] p-2 flex-shrink-0 overflow-y-auto">
        <div className="section-header">Language</div>
        {SHELL_LANGUAGES.map(lang => (
          <button
            key={lang.id}
            className={`w-full text-left px-3 py-2 rounded text-xs mb-0.5 transition-colors ${
              selectedLang === lang.id
                ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                : 'text-[var(--text-dim)] hover:bg-[var(--bg3)] hover:text-[var(--text)]'
            }`}
            style={{ border: 'none' }}
            onClick={() => { setSelectedLang(lang.id); setUseAlt(false); }}
          >
            {lang.label}
          </button>
        ))}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Config */}
        <div className="grid grid-cols-4 gap-3">
          <div className="input-group col-span-2">
            <label>Your IP (LHOST)</label>
            <input type="text" value={ip} onChange={e => setIp(e.target.value)} placeholder="10.10.14.x" className="w-full font-mono text-xs" />
          </div>
          <div className="input-group">
            <label>Port (LPORT)</label>
            <input type="text" value={port} onChange={e => setPort(e.target.value)} placeholder="4444" className="w-full font-mono text-xs" />
          </div>
          <div className="input-group">
            <label>Encoding</label>
            <select value={encoding} onChange={e => setEncoding(e.target.value)} className="w-full text-xs">
              {ENCODINGS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </div>
        </div>

        {/* Shell note */}
        {shell.note && (
          <div className="text-xs text-[var(--text-muted)] bg-[var(--bg3)] border border-[var(--border)] rounded px-3 py-2">
            {shell.note}
          </div>
        )}

        {/* Payload */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wide">Payload</span>
            {shell.payloadAlt && (
              <button
                className={`text-xs px-2 py-0.5 rounded transition-colors ${useAlt ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent-dim)]' : 'btn-ghost'}`}
                onClick={() => setUseAlt(a => !a)}
              >
                {useAlt ? 'Alt ✓' : 'Use Alt'}
              </button>
            )}
          </div>
          <div className="relative">
            <pre className="code-block text-xs overflow-x-auto pr-20 max-h-40">{payload}</pre>
            <button
              className="absolute top-2 right-2 text-xs px-2.5 py-1 rounded"
              style={{ background: copiedPayload ? 'var(--success)' : 'var(--accent-dim)', color: copiedPayload ? '#fff' : 'var(--accent)', border: '1px solid var(--accent)' }}
              onClick={() => copy(payload, 'payload')}
            >
              {copiedPayload ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Listener */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wide">Listener</span>
            <select value={listenerProto} onChange={e => setListenerProto(e.target.value)} className="text-xs py-0.5 px-2" style={{ width: 'auto' }}>
              {['nc','rlwrap','socat','ncat','msf'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="relative">
            <pre className="code-block text-xs overflow-x-auto pr-20">{listener}</pre>
            <button
              className="absolute top-2 right-2 text-xs px-2.5 py-1 rounded"
              style={{ background: copiedListener ? 'var(--success)' : 'var(--accent-dim)', color: copiedListener ? '#fff' : 'var(--accent)', border: '1px solid var(--accent)' }}
              onClick={() => copy(listener, 'listener')}
            >
              {copiedListener ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Shell stabilisation */}
        <div>
          <button
            className="text-xs text-[var(--text-muted)] flex items-center gap-1 mb-2"
            style={{ border: 'none', background: 'none', padding: 0 }}
            onClick={() => setShowStabilise(s => !s)}
          >
            {showStabilise ? '▼' : '▶'} Shell Stabilisation
          </button>
          {showStabilise && (
            <div className="code-block text-xs space-y-1">
              {[stab.step1, stab.step2, stab.step3, stab.step4, stab.step5, stab.step6].map((s, i) => (
                <div key={i} className={s.startsWith('#') ? 'text-[var(--text-muted)]' : 'text-[var(--text)]'}>{s}</div>
              ))}
              <div className="mt-2 text-[var(--text-muted)] text-[10px] italic">{stab.note}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
