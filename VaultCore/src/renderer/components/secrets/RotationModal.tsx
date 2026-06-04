// Feature 4: Secret rotation workflow
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DetectedSecret, RotationEvent } from '../../types/vaultcore';
import { useSecretStore } from '../../stores/useSecretStore';
import { maskValue } from '../../utils/secretScanner';

interface Props {
  secret: DetectedSecret;
  onClose: () => void;
}

type Step = 'input' | 'confirm' | 'done';

export default function RotationModal({ secret, onClose }: Props) {
  const { updateSecret, currentUser, addAuditEntry } = useSecretStore();
  const [step, setStep] = useState<Step>('input');
  const [newValue, setNewValue] = useState('');

  function handleConfirm() {
    const event: RotationEvent = {
      timestamp: new Date().toISOString(),
      oldValueMasked: secret.maskedValue,
      newValueMasked: maskValue(newValue),
      rotatedBy: currentUser,
    };
    updateSecret(secret.id, {
      maskedValue: maskValue(newValue),
      rotationHistory: [...secret.rotationHistory, event],
    });
    addAuditEntry({
      timestamp: new Date().toISOString(), action: 'rotate',
      secretId: secret.id, secretFile: secret.filePath, user: currentUser,
      detail: `Rotated ${secret.patternType} in ${secret.filePath}:${secret.lineNumber}`,
    });
    setStep('done');
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}>
        <motion.div className="w-full max-w-md rounded-xl border overflow-hidden"
          style={{ background: '#0f1117', borderColor: '#2a3347' }}
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}>

          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#2a3347' }}>
            <span className="text-sm font-semibold" style={{ color: '#e6edf3' }}>Rotate Secret</span>
            <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10"
              style={{ color: '#8b949e' }}>×</button>
          </div>

          <div className="p-4 space-y-4">
            {step === 'input' && (
              <>
                <div>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#8b949e' }}>Current Value</div>
                  <div className="font-mono text-sm px-3 py-2 rounded border" style={{ background: '#161b27', borderColor: '#2a3347', color: '#f85149' }}>
                    {secret.maskedValue}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#8b949e' }}>New Value</div>
                  <input type="password" value={newValue} onChange={(e) => setNewValue(e.target.value)}
                    placeholder="Paste new secret value..."
                    className="w-full font-mono text-sm px-3 py-2 rounded border outline-none"
                    style={{ background: '#161b27', borderColor: '#2a3347', color: '#e6edf3' }} />
                </div>
                <button disabled={!newValue.trim()} onClick={() => setStep('confirm')}
                  className="w-full py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                  style={{ background: '#d29922', color: '#fff' }}>
                  Continue
                </button>
              </>
            )}

            {step === 'confirm' && (
              <>
                <div className="space-y-2">
                  <div className="flex gap-3 items-center px-3 py-2 rounded border" style={{ background: '#161b27', borderColor: '#2a3347' }}>
                    <span className="text-[10px] shrink-0" style={{ color: '#f85149' }}>OLD</span>
                    <span className="font-mono text-xs truncate" style={{ color: '#8b949e' }}>{secret.maskedValue}</span>
                  </div>
                  <div className="flex gap-3 items-center px-3 py-2 rounded border" style={{ background: '#161b27', borderColor: '#2a3347' }}>
                    <span className="text-[10px] shrink-0" style={{ color: '#3fb950' }}>NEW</span>
                    <span className="font-mono text-xs truncate" style={{ color: '#3fb950' }}>{maskValue(newValue)}</span>
                  </div>
                </div>
                <p className="text-[11px]" style={{ color: '#8b949e' }}>
                  Confirm rotation. The old value will be stored in rotation history (masked).
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setStep('input')}
                    className="flex-1 py-2 rounded-lg text-sm border transition-all hover:bg-white/5"
                    style={{ borderColor: '#2a3347', color: '#8b949e' }}>Back</button>
                  <button onClick={handleConfirm}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: '#3fb950', color: '#fff' }}>Confirm Rotation</button>
                </div>
              </>
            )}

            {step === 'done' && (
              <div className="text-center py-4 space-y-3">
                <div className="text-2xl">✓</div>
                <div className="text-sm font-semibold" style={{ color: '#3fb950' }}>Secret Rotated</div>
                <div className="text-[11px]" style={{ color: '#8b949e' }}>
                  Rotation logged with timestamp and masked values.
                </div>
                <button onClick={onClose}
                  className="px-6 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: '#3fb950', color: '#fff' }}>Done</button>
              </div>
            )}
          </div>

          {secret.rotationHistory.length > 0 && step !== 'done' && (
            <div className="px-4 pb-4">
              <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: '#8b949e' }}>History</div>
              <div className="space-y-1 max-h-32 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
                {secret.rotationHistory.map((ev, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] font-mono px-2 py-1 rounded"
                    style={{ background: '#161b27', color: '#8b949e' }}>
                    <span style={{ color: '#3fb950' }}>{new Date(ev.timestamp).toLocaleDateString()}</span>
                    <span>{ev.rotatedBy}</span>
                    <span className="truncate">{ev.oldValueMasked} → {ev.newValueMasked}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
