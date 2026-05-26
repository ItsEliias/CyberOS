'use strict';
// sources/obsidian.js — Obsidian Publish scraper
const TurndownService = require('turndown');

const td = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-'
});

// Configure turndown rules
td.addRule('strikethrough', {
  filter: ['del', 's'],
  replacement: (content) => `~~${content}~~`
});
td.addRule('highlight', {
  filter: ['mark'],
  replacement: (content) => `==${content}==`
});

async function scrape(browser, newPage, config, vaultPath, log, scrapeState, ctrl) {
  const baseUrl = (config.url || 'https://publish.obsidian.md/addielamarr').replace(/\/$/, '');
  const visited = new Set();
  const pages = [];
  const queue = [baseUrl];
  const maxPages = config.maxPages || 500;

  log('info', `Scraping Obsidian Publish: ${baseUrl}`);

  const page = await newPage(browser);

  try {
    while (queue.length > 0 && pages.length < maxPages) {
      if (ctrl.abort()) break;

      const url = queue.shift();
      if (visited.has(url)) continue;
      visited.add(url);

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(1500);

        // Get sidebar links (all notes in publish)
        const navLinks = await page.$$eval(
          '.nav-file-title, .tree-item-inner, a.internal-link, .site-body-left-column a',
          (els) => els.map(el => ({
            href: el.href || el.getAttribute('href'),
            text: el.textContent.trim()
          })).filter(l => l.href && !l.href.includes('#'))
        );

        for (const link of navLinks) {
          try {
            const abs = new URL(link.href, baseUrl).href;
            if (abs.startsWith(baseUrl) && !visited.has(abs)) {
              queue.push(abs);
            }
          } catch (_) {}
        }

        // Extract main content
        const title = await page.title() || url.split('/').pop().replace(/-/g, ' ');
        const cleanTitle = title.replace(/\s*-\s*Obsidian Publish.*$/, '').trim();

        const html = await page.$eval(
          '.markdown-preview-view, .view-content, article, main, .publish-article',
          el => el.innerHTML
        ).catch(() => page.$eval('body', el => el.innerHTML));

        if (!html || html.length < 100) {
          log('error', `Empty content: ${cleanTitle}`, url);
          continue;
        }

        const markdown = td.turndown(html);
        const subfolder = buildSubfolder(url, baseUrl);

        // Check incremental
        if (config.updateMode === 'updates' && scrapeState[url]) {
          const crypto = require('crypto');
          const newHash = crypto.createHash('md5').update(markdown).digest('hex');
          if (newHash === scrapeState[url].contentHash) {
            pages.push({ url, title: cleanTitle, content: markdown, subfolder, unchanged: true });
            continue;
          }
        }

        pages.push({ url, title: cleanTitle, content: markdown, subfolder, sourceType: 'obsidian-publish' });
        log('success', `Fetched: ${cleanTitle}`, url);

        await ctrl.delay(config.requestDelay || 1500);

      } catch (e) {
        log('error', `Failed: ${url} — ${e.message}`, url);
      }
    }
  } finally {
    try { await page.context().close(); } catch (_) {}
  }

  return pages;
}

function buildSubfolder(url, baseUrl) {
  try {
    const u = new URL(url);
    const base = new URL(baseUrl);
    let rel = u.pathname.replace(base.pathname, '').replace(/^\//, '');
    const parts = rel.split('/');
    if (parts.length > 1) {
      parts.pop(); // remove filename part
      return parts.join('/');
    }
    return '';
  } catch (_) {
    return '';
  }
}

module.exports = { scrape };
