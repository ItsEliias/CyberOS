// Feature 7: inline show/hide, Feature 12: tagging badges, Feature 16: inline comments
import { useState, useRef, useEffect } from 'react';
import type { DetectedSecret } from '../../types/vaultcore';
import { useSecretStore } from '../../stores/useSecretStore';
import { fileTypeIcon, expiryStatus, expiryDays } from '../../utils/secretScanner';

const ENV_COLORS: Record<string, string> = {
  production: '#f85149', staging: '#d29922',
  development: '#3fb950', unknown: '#8b949e',
};
const TYPE_COLORS: Record<string, string> = {
  api_key: '#7bb8ff', password: '#f85149', certificate: '#d29922',
  token: '#a78bfa', private_key: '#f85149', other: '#8b949e',
};

interface Props {
  secret: DetectedSecret;
  onRevealAudit: (id: string) => void;
}

export default function SecretRow({ secret, onRevealAudit }: Props) {
  const { updateSecret, currentUser, addAuditEntry } = useSecretStore();
  const [revealed, setRevealed] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [commentDraft, setCommentDraft] = useState(secret.comment ?? '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const expiry = secret.expiresAt ? expiryStatus(secret.expiresAt) : null;
  const expiryColor = expiry === 'danger' ? '#f85149' : expiry === 'warn' ? '#d29922' : '#3fb950';

  function handleReveal() {
    if (revealed) { setRevealed(false); if (timerRef.current) clearTimeout(timerRef.current); return; }
    setRevealed(true);
    onRevealAudit(secret.id);
    addAuditEntry({ timestamp: new Date().toISOString(), action: 'reveal', secretId: secret.id, secretFile: secret.filePath, user: currentUser });
    timerRef.current = setTimeout(() => setRevealed(false), 5000);
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function saveComment() {
    updateSecret(secret.id, { comment: commentDraft });
    setShowComment(false);
  }

  const displayValue = revealed ? secret.maskedValue.replace(/•/g, '*') + ' [reveal]' : secret.maskedValue;

  return (
    <div className="relative group px-3 py-2.5 rounded-lg border transition-all"
      style={{ background: '#0f1117', borderColor: '#2a3347' }}
      title={secret.comment}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="shrink-0 text-sm">{fileTypeIcon(secret.filePath)}</span>
        <span className="text-[10px] font-mono truncate flex-1" style={{ color: '#8b949e' }}>
          {secret.filePath.split('/').pop()}:{secret.lineNumber}
        </span>

        {/* Entropy badge */}
        {secret.entropy != null && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0"
            style={{ background: 'rgba(248,81,73,0.1)', color: '#f85149' }}>
            H:{secret.entropy.toFixed(1)}
          </span>
        )}

        {/* Expiry badge */}
        {expiry && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0"
            style={{ background: `${expiryColor}18`, color: expiryColor }}>
            {expiryDays(secret.expiresAt!)}d
          </span>
        )}

        {/* Env badge */}
        <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0 capitalize"
          style={{ background: `${ENV_COLORS[secret.environment]}18`, color: ENV_COLORS[secret.environment] }}>
          {secret.environment}
        </span>

        {/* Type badge */}
        <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0 capitalize"
          style={{ background: `${TYPE_COLORS[secret.secretType]}18`, color: TYPE_COLORS[secret.secretType] }}>
          {secret.secretType.replace('_', ' ')}
        </span>

        {/* Pattern */}
        <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0 font-mono"
          style={{ background: '#161b27', color: '#8b949e' }}>
          {secret.patternType.replace('_', ' ')}
        </span>
      </div>

      <div className="flex items-center gap-2 mt-1.5">
        <span className="font-mono text-[11px] flex-1 truncate"
          style={{ color: revealed ? '#3fb950' : '#e6edf3', fontFamily: 'JetBrains Mono, monospace' }}>
          {displayValue}
        </span>
        <button onClick={handleReveal} title={revealed ? 'Hide' : 'Reveal for 5s'}
          className="text-xs w-6 h-6 flex items-center justify-center rounded transition-all hover:bg-white/10 shrink-0"
          style={{ color: revealed ? '#3fb950' : '#8b949e' }}>
          {revealed ? '🙈' : '👁'}
        </button>
        <button onClick={() => setShowComment(!showComment)} title="Add/edit comment"
          className="text-xs w-6 h-6 flex items-center justify-center rounded transition-all hover:bg-white/10 shrink-0"
          style={{ color: secret.comment ? '#d29922' : '#8b949e' }}>
          💬
        </button>
      </div>

      {showComment && (
        <div className="mt-2 flex gap-2">
          <textarea
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            placeholder="Why does this secret exist?"
            rows={2}
            className="flex-1 text-xs px-2 py-1.5 rounded border outline-none resize-none font-mono"
            style={{ background: '#161b27', borderColor: '#2a3347', color: '#e6edf3' }}
          />
          <div className="flex flex-col gap-1">
            <button onClick={saveComment}
              className="px-2 py-1 text-[10px] rounded font-semibold"
              style={{ background: '#3fb950', color: '#fff' }}>Save</button>
            <button onClick={() => setShowComment(false)}
              className="px-2 py-1 text-[10px] rounded border"
              style={{ borderColor: '#2a3347', color: '#8b949e' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
