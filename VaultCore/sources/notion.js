'use strict';
// sources/notion.js — Public Notion page extractor
const TurndownService = require('turndown');

const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });

td.addRule('notionCallout', {
  filter: (node) => node.classList && node.classList.contains('notion-callout'),
  replacement: (content) => `> ${content.replace(/\n/g, '\n> ')}\n\n`
});

td.addRule('notionToggle', {
  filter: (node) => node.classList && node.classList.contains('notion-toggle'),
  replacement: (content) => `<details><summary>Toggle</summary>\n\n${content}\n</details>\n\n`
});

async function scrape(browser, newPage, config, vaultPath, log, scrapeState, ctrl) {
  const url = config.url || '';
  if (!url) { log('error', 'No Notion URL'); return []; }

  log('info', `Notion: ${url}`);

  const page = await newPage(browser);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(3000);

    // Wait for Notion content to load
    await page.waitForSelector('.notion-page-content, .notion-root, [class*="notion"]', { timeout: 20000 })
      .catch(() => null);

    await page.waitForTimeout(2000);

    // Scroll to trigger lazy loading
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 2000));
      await page.waitForTimeout(500);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Extract title
    const title = await page.$eval(
      '.notion-page-content h1, .notion-title, [placeholder="Untitled"], h1[class*="notion"]',
      el => el.textContent.trim()
    ).catch(() => null) || await page.title();

    const cleanTitle = title.replace(/\s*-\s*Notion$/, '').trim();

    // Extract content
    const html = await page.$eval(
      '.notion-page-content, .notion-root, main',
      el => el.innerHTML
    ).catch(() => null);

    if (!html) {
      // Fallback: entire body
      const bodyHtml = await page.$eval('body', el => el.innerHTML).catch(() => '');
      const markdown = processNotionMarkdown(td.turndown(bodyHtml), cleanTitle);
      return [{
        url,
        title: sanitizeTitle(cleanTitle),
        content: markdown,
        sourceType: 'notion',
        subfolder: 'Notion'
      }];
    }

    const markdown = processNotionMarkdown(td.turndown(html), cleanTitle);

    log('success', `Notion: ${cleanTitle}`, url);

    return [{
      url,
      title: sanitizeTitle(cleanTitle),
      content: markdown,
      sourceType: 'notion',
      subfolder: 'Notion'
    }];
  } catch (e) {
    log('error', `Notion failed: ${e.message}`, url);
    return [];
  } finally {
    try { await page.context().close(); } catch (_) {}
  }
}

function processNotionMarkdown(md, title) {
  return md
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\[\s*\]\([^)]*\)/g, '') // remove empty links
    .trim();
}

function sanitizeTitle(t) {
  return t.replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 200) || 'Notion Page';
}

module.exports = { scrape };
