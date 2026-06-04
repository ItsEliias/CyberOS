// GhostVault — Line Number Gutter
// Fixed-width gutter synced to textarea scroll, monospace muted numbers

import { useEffect, useRef, useCallback } from 'react';

interface Props {
  content: string;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  lineHeight?: number; // px, should match textarea's CSS line-height in px
  paddingTop?: number; // px, should match textarea's pt-5 (20px)
}

export default function LineNumberGutter({ content, textareaRef, lineHeight = 23, paddingTop = 20 }: Props) {
  const gutterRef = useRef<HTMLDivElement>(null);

  const lineCount = content ? content.split('\n').length : 1;

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    const g  = gutterRef.current;
    if (ta && g) g.scrollTop = ta.scrollTop;
  }, [textareaRef]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.addEventListener('scroll', syncScroll, { passive: true });
    return () => ta.removeEventListener('scroll', syncScroll);
  }, [textareaRef, syncScroll]);

  return (
    <div
      ref={gutterRef}
      aria-hidden="true"
      className="overflow-hidden shrink-0 select-none"
      style={{
        width: 40,
        paddingTop,
        paddingBottom: 20,
        background: 'rgba(7,8,15,0.6)',
        borderRight: '1px solid rgba(42,51,71,0.25)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.6875rem',
        lineHeight: `${lineHeight}px`,
        color: 'rgba(107,122,153,0.35)',
        textAlign: 'right',
        scrollbarWidth: 'none',
        userSelect: 'none',
      }}
    >
      {Array.from({ length: lineCount }, (_, i) => (
        <div key={i} style={{ paddingRight: 8, height: lineHeight }}>
          {i + 1}
        </div>
      ))}
    </div>
  );
}
