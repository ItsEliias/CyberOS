import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Session } from '@shared/types';

interface DifficultyRatingModalProps {
  session: Session;
  onSave: (rating: number, notes: string) => void;
  onCancel: () => void;
}

const STAR_LABELS = ['', 'Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'];

export default function DifficultyRatingModal({ session, onSave, onCancel }: DifficultyRatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [notes, setNotes] = useState('');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <motion.div
        className="panel w-[400px] max-w-[92vw]"
        style={{ border: '1px solid var(--accent)', borderRadius: 10, overflow: 'hidden' }}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
          <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Rate This Lab</div>
          <div className="font-mono text-xs mt-0.5" style={{ color: 'var(--accent)' }}>{session.labName}</div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Star rating */}
          <div>
            <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Difficulty Rating</div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  className="transition-transform"
                  style={{
                    fontSize: 28,
                    background: 'none',
                    border: 'none',
                    color: star <= (hover || rating) ? '#d29922' : 'var(--border)',
                    transform: star <= (hover || rating) ? 'scale(1.15)' : 'scale(1)',
                    cursor: 'pointer',
                    padding: 0,
                    lineHeight: 1,
                  }}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(star)}
                >
                  ★
                </button>
              ))}
              {(hover || rating) > 0 && (
                <span className="text-xs" style={{ color: '#d29922' }}>
                  {STAR_LABELS[hover || rating]}
                </span>
              )}
            </div>
          </div>

          {/* Personal notes */}
          <div className="input-group">
            <label>Personal Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What did you learn? What was the key technique?"
              className="w-full text-xs resize-none"
              rows={3}
            />
          </div>
        </div>

        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg2)' }}
        >
          <button className="btn-ghost px-4 py-2 text-sm" onClick={onCancel}>Skip</button>
          <button
            className="btn-accent px-4 py-2 text-sm"
            onClick={() => onSave(rating, notes)}
            disabled={rating === 0}
          >
            Save Rating
          </button>
        </div>
      </motion.div>
    </div>
  );
}
