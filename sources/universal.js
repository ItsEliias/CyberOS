'use strict';
// sources/universal.js — Generic website scraper with crawl depth
const TurndownService = require('turndown');

const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });

td.addRule('removeScript', { filter: ['script', 'style', 'noscript', 'nav', 'footer', 'aside'], replacement: () => '' });
td.addRule('preCode', {
  filter: (node) => node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE',
  replacement: (content, node) => {
    const lang = node.firstChild.className.replace(/^language-/, '') || '';
    return `\n\`\`\`${lang}\n${node.firstChild.textContent}\n\`\`\`\n`;
  }
});

async function scrape(browser, newPage, config, vaultPath, log, scrapeState, ctrl) {
  const startUrl = config.url;
  if (!startUrl) { log('error', 'No URL provided'); return []; }

  const maxDepth = parseInt(config.crawlDepth) || 3;
  const sameDomainOnly = config.sameDomain !== false;
  const maxPages = config.maxPages || 200;

  let startDomain;
  try { startDomain = new URL(startUrl).hostname; } catch (e) { log('error', `Invalid URL: ${startUrl}`); return []; }

  const visited = new Set();
  const pages = [];
  const queue = [{ url: startUrl, depth: 0 }];

  const page = await newPage(browser);

  try {
    while (queue.length > 0 && pages.length < maxPages) {
      if (ctrl.abort()) break;

      const { url, depth } = queue.shift();
      if (visited.has(url)) continue;
      visited.add(url);

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);

        // Extract title
        const title = await page.title() || url;
        const cleanTitle = cleanPageTitle(title, startDomain);

        // Extract main content (try multiple selectors)
        let html = '';
        const contentSelectors = [
          'article', 'main', '.content', '.post-content', '.article-body',
          '.entry-content', '#content', '.page-content', '.markdown-body',
          '[role="main"]', '.container'
        ];
        for (const sel of contentSelectors) {
          try {
            html = await page.$eval(sel, el => el.innerHTML);
            if (html && html.length > 200) break;
          } catch (_) {}
        }
        if (!html) {
          html = await page.$eval('body', el => el.innerHTML).catch(() => '');
        }

        const markdown = cleanMarkdown(td.turndown(html || ''));

        if (markdown.length < 50) {
          log('warning', `Skipped (no content): ${cleanTitle}`, url);
          continue;
        }

        // Check incremental
        if (config.updateMode === 'updates' && scrapeState[url]) {
          const crypto = require('crypto');
          const newHash = crypto.createHash('md5').update(markdown).digest('hex');
          if (newHash === scrapeState[url].contentHash) {
            pages.push({ url, title: cleanTitle, content: markdown, unchanged: true, sourceType: 'website' });
            log('skipped', `Unchanged: ${cleanTitle}`, url);
            await ctrl.delay(config.requestDelay || 1500);
            continue;
          }
        }

        // Find links if we can crawl deeper
        if (depth < maxDepth) {
          const links = await page.$$eval('a[href]', (els) =>
            els.map(el => el.href).filter(Boolean)
          );
          for (const link of links) {
            try {
              const abs = new URL(link);
              if (sameDomainOnly && abs.hostname !== startDomain) continue;
              if (['mailto:', 'tel:', 'javascript:'].some(p => link.startsWith(p))) continue;
              const clean = abs.origin + abs.pathname;
              if (!visited.has(clean)) queue.push({ url: clean, depth: depth + 1 });
            } catch (_) {}
          }
        }

        pages.push({ url, title: cleanTitle, content: markdown, sourceType: 'website', subfolder: depthToSubfolder(url, startUrl) });
        log('success', `Scraped: ${cleanTitle}`, url);

      } catch (e) {
        log('error', `Failed: ${url} — ${e.message}`, url);
      }

      await ctrl.delay(config.requestDelay || 1500);
    }
  } finally {
    try { await page.context().close(); } catch (_) {}
  }

  return pages;
}

function cleanPageTitle(title, domain) {
  return title
    .replace(new RegExp(`\\s*[\\-|–|•]\\s*${domain}.*$`, 'i'), '')
    .replace(/\s*\|\s*.*$/, '')
    .trim() || title;
}

function cleanMarkdown(md) {
  return md
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\[(\s*)\]/g, '')
    .trim();
}

function depthToSubfolder(url, startUrl) {
  try {
    const u = new URL(url);
    const s = new URL(startUrl);
    let rel = u.pathname.replace(s.pathname, '').replace(/^\//, '');
    const parts = rel.split('/').filter(Boolean);
    if (parts.length > 1) { parts.pop(); return parts.join('/'); }
    return '';
  } catch (_) { return ''; }
}

module.exports = { scrape };
