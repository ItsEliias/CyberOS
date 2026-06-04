import { useMemo } from 'react';
import { parseMarkdown } from '../../lib/markdown';

interface Props {
  content: string;
  className?: string;
}

export default function NotePreview({ content, className = '' }: Props) {
  const html = useMemo(() => parseMarkdown(content), [content]);

  return (
    <div
      className={`flex-1 overflow-y-auto p-6 ${className}`}
      style={{ background: 'var(--bg)', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}
    >
      <div
        className="markdown-preview max-w-prose mx-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
