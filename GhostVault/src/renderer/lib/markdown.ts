function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function parseMarkdown(md: string): string {
  if (!md) return '<div class="empty-state"><div class="empty-icon">👻</div><div class="empty-title">Nothing here yet</div><div class="empty-sub">Start typing in the editor to see a live preview.</div></div>';

  let html = md;

  // Fenced code blocks
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const escaped  = escHtml(code.trim());
    const langLabel = lang ? `<span class="code-lang">${escHtml(lang)}</span>` : '';
    return `<pre>${langLabel}<code>${escaped}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, (_, c) => `<code>${escHtml(c)}</code>`);

  // Headings
  html = html.replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>');

  // Horizontal rule
  html = html.replace(/^[-*_]{3,}\s*$/gm, '<hr>');

  // Blockquotes
  html = html.replace(/^>\s?(.+)$/gm, '<blockquote>$1</blockquote>');

  // Bold & italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g,         '<em>$1</em>');
  html = html.replace(/\_\_(.+?)\_\_/g,     '<strong>$1</strong>');
  html = html.replace(/\_(.+?)\_/g,         '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g,         '<del>$1</del>');

  // Wiki-links [[page]]
  html = html.replace(/\[\[([^\]]+)\]\]/g, (_, page) =>
    `<span class="wiki-link" title="Wiki link: ${escHtml(page)}">[[${escHtml(page)}]]</span>`
  );

  // Tags #tag
  html = html.replace(/(?<!\w)#([\w-]+)/g, (_, tag) =>
    `<span class="md-tag">#${escHtml(tag)}</span>`
  );

  // Tables
  html = html.replace(/((?:\|[^\n]+\|\n)+)/g, (tableBlock) => {
    const rows = tableBlock.trim().split('\n');
    if (rows.length < 2) return tableBlock;
    const isHeader = (r: string) => /^\|[-| :]+\|$/.test(r.trim());
    const parseRow = (r: string) => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    let thtml = '<table>'; let inBody = false;
    for (let i = 0; i < rows.length; i++) {
      if (isHeader(rows[i])) { inBody = true; thtml += '<tbody>'; continue; }
      const cells = parseRow(rows[i]);
      if (i === 0) thtml += '<thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead>';
      else         thtml += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
    }
    if (inBody) thtml += '</tbody>';
    return thtml + '</table>';
  });

  // Checkboxes
  html = html.replace(/^(\s*)- \[x\] (.+)$/gim, '$1<div class="md-check done">☑ $2</div>');
  html = html.replace(/^(\s*)- \[ \] (.+)$/gim, '$1<div class="md-check">☐ $2</div>');

  // Unordered lists
  html = html.replace(/^(\s*)[-*+] (.+)$/gm, (_, indent, item) => {
    const level = Math.floor(indent.length / 2);
    return `<li style="margin-left:${level * 16}px">${item}</li>`;
  });
  html = html.replace(/(<li[\s\S]*?<\/li>)/g, block => `<ul>${block}</ul>`);

  // Ordered lists
  html = html.replace(/^(\s*)\d+\. (.+)$/gm, (_, indent, item) => {
    const level = Math.floor(indent.length / 2);
    return `<li style="margin-left:${level * 16}px">${item}</li>`;
  });

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:6px;margin:8px 0;">');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    `<a href="$2" onclick="event.preventDefault();window.ghostvault.openExternal('$2')">$1</a>`
  );

  // Auto-detect IPs
  html = html.replace(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?)\b/g,
    '<code class="ip-addr" title="IP Address">$1</code>'
  );

  // Paragraphs
  html = html.replace(/\n\n+/g, '</p><p>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>(<(?:h[1-6]|pre|ul|ol|table|blockquote|div|hr)[^>]*>)/g, '$1');
  html = html.replace(/(<\/(?:h[1-6]|pre|ul|ol|table|blockquote|div|hr)>)<\/p>/g, '$1');

  return html;
}
