// GhostVault — Editor mini status bar
// Shows word/char/line counts, word goal indicator, and keyboard hint

interface Props {
  wordCount: number;
  charCount: number;
  lineCount: number;
  wordGoal?: number;
  goalReached?: boolean;
}

export default function EditorStatusBar({ wordCount, charCount, lineCount, wordGoal, goalReached }: Props) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1 text-[10px] font-mono"
      style={{
        borderTop: '1px solid rgba(42,51,71,0.3)',
        background: 'rgba(7,8,15,0.5)',
      }}
    >
      <span
        key={wordCount}
        className="tabular-nums px-1.5 py-px rounded word-count-badge"
        style={{ background: 'rgba(123,184,255,0.07)', color: 'rgba(123,184,255,0.55)', border: '1px solid rgba(123,184,255,0.1)' }}
        title="Word count"
      >
        {wordCount}w
      </span>
      <span
        className="tabular-nums px-1.5 py-px rounded"
        style={{ background: 'rgba(42,51,71,0.2)', color: 'rgba(107,122,153,0.6)', border: '1px solid rgba(42,51,71,0.2)' }}
        title="Character count"
      >
        {charCount}c
      </span>
      <span
        className="tabular-nums px-1.5 py-px rounded"
        style={{ background: 'rgba(42,51,71,0.2)', color: 'rgba(107,122,153,0.6)', border: '1px solid rgba(42,51,71,0.2)' }}
        title="Line count"
      >
        {lineCount}L
      </span>
      {wordGoal != null && (
        <span
          className="tabular-nums px-1.5 py-px rounded"
          style={{
            background: goalReached ? 'rgba(63,185,80,0.1)' : 'rgba(227,162,70,0.1)',
            color: goalReached ? 'rgba(63,185,80,0.75)' : 'rgba(227,162,70,0.65)',
            border: `1px solid ${goalReached ? 'rgba(63,185,80,0.2)' : 'rgba(227,162,70,0.2)'}`,
          }}
          title={`Goal: ${wordGoal} words`}
        >
          {goalReached ? 'goal' : `/${wordGoal}`}
        </span>
      )}
      <div className="flex-1" />
      <kbd className="text-[9px] px-1 py-px rounded opacity-40"
        style={{ background: 'rgba(42,51,71,0.3)', color: 'rgba(139,148,158,0.7)', border: '1px solid rgba(42,51,71,0.4)' }}>
        ⌘S save
      </kbd>
    </div>
  );
}
