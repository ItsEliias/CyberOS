import { useState } from 'react';
import { OPERATIONS, applyOperation, applyChain } from '../lib/encoder';
import { SOUNDS } from '../lib/sounds';

type Mode = 'single' | 'chain';

const GROUPS = [...new Set(OPERATIONS.map(o => o.group))];

export default function Encoder() {
  const [mode, setMode] = useState<Mode>('single');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [selectedOp, setSelectedOp] = useState('b64-encode');
  const [chain, setChain] = useState<string[]>(['', '', '']);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [chainSteps, setChainSteps] = useState<Array<{ op: string; result: string | null; error: string | null }>>([]);

  async function run() {
    if (!input) return;
    setProcessing(true);
    setError('');
    setOutput('');
    setChainSteps([]);

    try {
      if (mode === 'single') {
        const result = await applyOperation(selectedOp, input);
        setOutput(result);
      } else {
        const ops = chain.filter(Boolean);
        if (!ops.length) { setError('Add at least one operation to the chain'); return; }
        const { final, steps } = await applyChain(ops, input);
        setOutput(final);
        setChainSteps(steps);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Operation failed');
    } finally {
      setProcessing(false);
    }
  }

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    SOUNDS.click();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function swapInputOutput() {
    setInput(output);
    setOutput('');
    setError('');
    setChainSteps([]);
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">Encoder / Decoder</h2>
        <div className="flex gap-1 ml-4">
          {(['single','chain'] as Mode[]).map(m => (
            <button
              key={m}
              className={`px-3 py-1 text-xs rounded capitalize ${mode === m ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent-dim)]' : 'btn-ghost'}`}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 flex-1">
        {/* Input */}
        <div className="flex flex-col flex-1 gap-2">
          <label className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">Input</label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 text-xs font-mono resize-none min-h-[120px]"
            placeholder="Paste text to encode/decode..."
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3 w-52 flex-shrink-0">
          {mode === 'single' ? (
            <>
              <div>
                <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide block mb-2">Operation</label>
                {GROUPS.map(group => (
                  <div key={group} className="mb-2">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1 px-1">{group}</div>
                    {OPERATIONS.filter(o => o.group === group).map(op => (
                      <button
                        key={op.id}
                        className={`w-full text-left px-3 py-1.5 rounded text-xs mb-0.5 transition-colors ${
                          selectedOp === op.id ? 'bg-[var(--accent-dim)] text-[var(--accent)]' : 'text-[var(--text-dim)] hover:bg-[var(--bg3)] hover:text-[var(--text)]'
                        }`}
                        style={{ border: 'none' }}
                        onClick={() => setSelectedOp(op.id)}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <label className="text-xs text-[var(--text-muted)] uppercase tracking-wide block">Chain (up to 3)</label>
              {chain.map((op, i) => (
                <div key={i} className="input-group">
                  <label>Step {i + 1}</label>
                  <select
                    value={op}
                    onChange={e => { const c = [...chain]; c[i] = e.target.value; setChain(c); }}
                    className="w-full text-xs"
                  >
                    <option value="">(none)</option>
                    {OPERATIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}

          <button className="btn-accent w-full py-2" onClick={run} disabled={processing || !input}>
            {processing ? 'Processing...' : 'Run'}
          </button>
        </div>

        {/* Output */}
        <div className="flex flex-col flex-1 gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide">Output</label>
            <div className="flex gap-2">
              {output && (
                <button className="text-xs btn-ghost px-2 py-1" onClick={swapInputOutput} data-tooltip="Use as input">↑</button>
              )}
              <button
                className="text-xs px-2.5 py-1 rounded"
                style={{ background: copied ? 'var(--success)' : 'var(--accent-dim)', color: copied ? '#fff' : 'var(--accent)', border: '1px solid var(--accent)' }}
                onClick={copyOutput}
                disabled={!output}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          {error ? (
            <div className="text-xs text-[var(--error)] bg-[var(--bg3)] border border-[var(--error)] rounded p-3">{error}</div>
          ) : (
            <textarea
              value={output}
              readOnly
              className="flex-1 text-xs font-mono resize-none min-h-[120px] selectable"
              placeholder="Output will appear here..."
            />
          )}
          {chainSteps.length > 0 && (
            <div className="space-y-1">
              {chainSteps.map((s, i) => (
                <div key={i} className={`text-[10px] px-2 py-1 rounded border ${s.error ? 'border-[var(--error)] text-[var(--error)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}>
                  Step {i + 1} ({s.op}): {s.error || (s.result ? s.result.slice(0, 60) + (s.result.length > 60 ? '...' : '') : '')}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
