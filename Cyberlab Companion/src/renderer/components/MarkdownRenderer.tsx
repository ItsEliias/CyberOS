interface Props { content: string }

export default function MarkdownRenderer({ content }: Props) {
  const html = content
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, _lang, code) =>
      `<pre class="code-block text-xs mt-2 mb-2"><code>${code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-[var(--code-bg)] text-[var(--accent)] font-mono text-xs border border-[var(--border)]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-[var(--text)] mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-sm font-semibold text-[var(--accent-2)] mt-3 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-base font-bold text-[var(--accent)] mt-3 mb-2">$1</h1>')
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc mb-1">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br/>');

  return (
    <div
      className="prose selectable text-sm"
      dangerouslySetInnerHTML={{ __html: `<p class="mb-2">${html}</p>` }}
    />
  );
}
