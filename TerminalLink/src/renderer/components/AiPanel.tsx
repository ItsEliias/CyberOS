import { useState, useEffect, useCallback } from 'react';

interface Props {
  ollamaUrl: string;
  lastCommand: string;
  lastOutput: string;
  onUse: (cmd: string) => void;
}

interface OllamaResponse { response: string }

export default function AiPanel({ ollamaUrl, lastCommand, lastOutput, onUse }: Props) {
  const [suggestion, setSuggestion] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [reachable,  setReachable]  = useState<boolean | null>(null);

  const checkReachable = useCallback(async () => {
    try {
      await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
      setReachable(true);
    } catch {
      setReachable(false);
    }
  }, [ollamaUrl]);

  useEffect(() => { checkReachable(); }, [checkReachable]);

  const getSuggestion = useCallback(async () => {
    if (!lastCommand || loading || !reachable) return;
    setLoading(true);
    setSuggestion('');
    try {
      const prompt = `You are a cybersecurity assistant. Based on this terminal command and its output, suggest the single best next command. Reply with ONLY the command, no explanation.\n\nCommand: ${lastCommand}\nOutput: ${lastOutput.slice(0, 300)}`;
      const res = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3', prompt, stream: false }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: OllamaResponse = await res.json();
      setSuggestion(data.response?.trim() ?? '');
    } catch {
      setSuggestion('');
    } finally {
      setLoading(false);
    }
  }, [ollamaUrl, lastCommand, lastOutput, loading, reachable]);

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--panel)',
      padding: '6px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0,
      minHeight: 34,
    }}>
      {/* AI badge */}
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
        color: reachable === false ? 'var(--text-muted)' : 'var(--accent)',
        background: reachable === false ? 'var(--bg)' : 'var(--accent-dim)',
        border: `1px solid ${reachable === false ? 'var(--border)' : 'var(--accent)'}`,
        borderRadius: 3, padding: '1px 5px', flexShrink: 0,
      }}>
        {reachable === false ? 'AI off' : 'AI'}
      </span>

      {reachable === false ? (
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          Ollama not reachable at {ollamaUrl}
        </span>
      ) : (
        <>
          {loading ? (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Thinking...</span>
          ) : suggestion ? (
            <>
              <code style={{ flex: 1, fontSize: 11, color: 'var(--accent)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {suggestion}
              </code>
              <button
                onClick={() => onUse(suggestion)}
                style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, background: 'var(--accent)', border: 'none', color: '#000', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
              >
                Use
              </button>
              <button
                onClick={getSuggestion}
                style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}
              >
                Refresh
              </button>
            </>
          ) : (
            <button
              onClick={getSuggestion}
              disabled={!lastCommand}
              style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: lastCommand ? 'pointer' : 'default', opacity: lastCommand ? 1 : 0.5 }}
            >
              Suggest next command
            </button>
          )}
        </>
      )}
    </div>
  );
}
