function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Syntax highlighter ────────────────────────────────────────────────────────

const JS_KEYWORDS   = /\b(const|let|var|function|class|return|if|else|for|while|do|switch|case|break|continue|import|export|default|new|typeof|instanceof|async|await|try|catch|finally|throw|void|delete|in|of|from|interface|type|enum|extends|implements|public|private|protected|readonly|static)\b/g;
const PY_KEYWORDS   = /\b(def|class|return|if|elif|else|for|while|import|from|as|with|try|except|finally|raise|pass|break|continue|lambda|yield|and|or|not|in|is|True|False|None|async|await|self)\b/g;
const BASH_KEYWORDS = /\b(echo|cd|ls|mkdir|rm|cp|mv|cat|grep|awk|sed|find|curl|wget|sudo|chmod|chown|export|source|alias|function|if|then|else|fi|for|do|done|while|case|esac)\b/g;

function highlightJs(code: string): string {
  let r = code;
  r = r.replace(/\/\/.*/g, m => `<span class="syn-comment">${m}</span>`);
  r = r.replace(/(\/\*[\s\S]*?\*\/)/g, m => `<span class="syn-comment">${m}</span>`);
  r = r.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, m => `<span class="syn-string">${m}</span>`);
  r = r.replace(JS_KEYWORDS, m => `<span class="syn-kw">${m}</span>`);
  return r;
}

function highlightPy(code: string): string {
  let r = code;
  r = r.replace(/#.*/g, m => `<span class="syn-comment">${m}</span>`);
  r = r.replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|"[^"]*"|'[^']*')/g, m => `<span class="syn-string">${m}</span>`);
  r = r.replace(PY_KEYWORDS, m => `<span class="syn-kw">${m}</span>`);
  return r;
}

function highlightBash(code: string): string {
  let r = code;
  r = r.replace(/#.*/g, m => `<span class="syn-comment">${m}</span>`);
  r = r.replace(/("(?:[^"\\]|\\.)*"|'[^']*')/g, m => `<span class="syn-string">${m}</span>`);
  r = r.replace(BASH_KEYWORDS, m => `<span class="syn-kw">${m}</span>`);
  r = r.replace(/(-{1,2}[\w-]+)/g, m => `<span class="syn-flag">${m}</span>`);
  return r;
}

function highlightCode(lang: string, code: string): string {
  const escaped = escHtml(code.trim());
  if (!lang) return escaped;
  const l = lang.toLowerCase();
  if (l === 'js' || l === 'javascript' || l === 'ts' || l === 'typescript') return highlightJs(escaped);
  if (l === 'py' || l === 'python') return highlightPy(escaped);
  if (l === 'sh' || l === 'bash' || l === 'zsh' || l === 'shell') return highlightBash(escaped);
  return escaped;
}

// ── Table parser ──────────────────────────────────────────────────────────────

function parseTable(block: string): string {
  const rows = block.trim().split('\n').filter(r => r.trim());
  if (rows.length < 2) return escHtml(block);

  const isSeperator = (r: string) => /^\|[-| :]+\|$/.test(r.trim());
  const parseRow = (r: string) =>
    r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());

  let html = '<table>';
  let headDone = false;
  let inBody   = false;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (isSeperator(row)) {
      if (!headDone) { html += '</thead>'; headDone = true; html += '<tbody>'; inBody = true; }
      continue;
    }
    const cells = parseRow(row);
    if (!headDone && !inBody) {
      html += '<thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr>';
    } else {
      html += '<tr>' + cells.map((c, ci) => `<td${ci % 2 === 0 ? '' : ''}>${c}</td>`).join('') + '</tr>';
    }
  }
  if (inBody) html += '</tbody>';
  return html + '</table>';
}

// ── Wiki-link renderer (with optional note opener) ────────────────────────────

let _noteOpener: ((name: string) => void) | null = null;

export function setWikiLinkOpener(fn: (name: string) => void) {
  _noteOpener = fn;
}

// ── Delegated click handler for sanitized markdown links ─────────────────────
// Installed once at module-load. Any rendered <a class="md-link"> click is
// intercepted and routed through the IPC bridge, which itself re-validates
// the scheme on the main side. We don't trust the href attribute directly
// because dangerouslySetInnerHTML places it back into live DOM where the
// browser would otherwise navigate.
type Win = typeof window & { ghostvault?: { openExternal?: (url: string) => unknown } };
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e: MouseEvent) => {
    const el = e.target as HTMLElement | null;
    // External link → route through main, which re-validates the scheme.
    const link = el?.closest('a.md-link') as HTMLAnchorElement | null;
    if (link) {
      e.preventDefault();
      const href = link.getAttribute('data-href') ?? link.getAttribute('href') ?? '';
      if (!href || href === '#') return;
      try {
        (window as Win).ghostvault?.openExternal?.(href);
      } catch { /* ignore */ }
      return;
    }
    // Wiki-link → either call the registered opener directly, or dispatch
    // the open-note CustomEvent for components that hook into it.
    const wiki = el?.closest('.wiki-link') as HTMLElement | null;
    if (wiki) {
      const page = wiki.getAttribute('data-page') ?? '';
      if (!page) return;
      if (_noteOpener) {
        try { _noteOpener(page); } catch { /* ignore */ }
      } else {
        const root = document.querySelector('[data-wiki-root]');
        if (root) {
          try {
            root.dispatchEvent(new CustomEvent('open-note', { detail: page, bubbles: true }));
          } catch { /* ignore */ }
        }
      }
    }
  });
}

// ── Main markdown parser ──────────────────────────────────────────────────────

export function parseMarkdown(md: string, openNote?: (name: string) => void): string {
  if (openNote) _noteOpener = openNote;

  if (!md) return '<div class="empty-state"><div class="empty-icon">👻</div><div class="empty-title">Nothing here yet</div><div class="empty-sub">Start typing in the editor to see a live preview.</div></div>';

  let html = md;

  // Fenced code blocks — syntax highlighted
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const highlighted = highlightCode(lang, code.trim());
    const langLabel   = lang ? `<span class="code-lang">${escHtml(lang)}</span>` : '';
    return `<pre>${langLabel}<code class="syn-block">${highlighted}</code></pre>`;
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

  // Tables — GitHub style
  html = html.replace(/((?:\|[^\n]+\|\n?)+)/g, (block) => {
    const rows = block.trim().split('\n');
    if (rows.length < 2) return block;
    const hasSeperator = rows.some(r => /^\|[-| :]+\|$/.test(r.trim()));
    if (!hasSeperator) return block;
    return parseTable(block);
  });

  // Wiki-links [[Note Name]] — delegated click handler installed at module
  // load reads the data-page attribute instead of executing inline JS. The
  // previous inline onclick used a hand-rolled string-escape that didn't
  // cover \n / </script> sequences and was a latent XSS gadget under any
  // future CSP relaxation.
  html = html.replace(/\[\[([^\]]+)\]\]/g, (_, page: string) => {
    const safePage = escHtml(page);
    return `<span class="wiki-link" data-page="${safePage}">[[${safePage}]]</span>`;
  });

  // Tags #tag
  html = html.replace(/(?<!\w)#([\w-]+)/g, (_, tag) =>
    `<span class="md-tag">#${escHtml(tag)}</span>`
  );

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

  // Images — escape URL + alt, and only allow http(s)/data:image/ schemes.
  // Without this, a note containing ![](javascript:alert(1)) renders as
  // a clickable XSS payload because `dangerouslySetInnerHTML` happily
  // injects whatever we hand it.
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt: string, url: string) => {
    const trimmed = url.trim();
    const lower = trimmed.toLowerCase();
    const ok = lower.startsWith('http://') ||
               lower.startsWith('https://') ||
               lower.startsWith('data:image/');
    if (!ok) return escHtml(alt);
    return `<img src="${escHtml(trimmed)}" alt="${escHtml(alt)}" style="max-width:100%;border-radius:6px;margin:8px 0;">`;
  });

  // Links — escape URL + label, and only allow http/https/mailto. The
  // inline onclick previously substituted $2 raw, so a URL containing
  // `')` could break out into arbitrary JS. We now stash the URL on a
  // data-href attribute and route every click through a single delegated
  // handler that calls window.ghostvault.openExternal (which itself
  // re-validates the scheme on the main side).
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, url: string) => {
    const trimmed = url.trim();
    const lower = trimmed.toLowerCase();
    const ok = lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('mailto:');
    const safeHref = ok ? escHtml(trimmed) : '#';
    return `<a href="${safeHref}" data-href="${safeHref}" class="md-link">${escHtml(label)}</a>`;
  });

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

// ── Extract wiki-links from markdown ─────────────────────────────────────────

export function extractWikiLinks(md: string): string[] {
  const matches = md.matchAll(/\[\[([^\]]+)\]\]/g);
  return [...matches].map(m => m[1]);
}
