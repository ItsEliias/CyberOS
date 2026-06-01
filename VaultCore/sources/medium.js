'use strict';
// sources/medium.js — Medium and Substack article extractor
const TurndownService = require('turndown');

const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });

async function scrape(browser, newPage, config, vaultPath, log, scrapeState, ctrl) {
  const url = config.url || '';
  if (!url) { log('error', 'No URL provided'); return []; }

  const isSubstack = url.includes('substack.com');
  log('info', `${isSubstack ? 'Substack' : 'Medium'}: ${url}`);

  // Detect if publication homepage or single article
  const isHomepage = isPublicationHomepage(url, isSubstack);

  if (isHomepage) {
    return await scrapePublication(browser, newPage, config, log, ctrl, isSubstack);
  } else {
    const article = await scrapeArticle(browser, newPage, config, url, log, isSubstack);
    return article ? [article] : [];
  }
}

async function scrapePublication(browser, newPage, config, log, ctrl, isSubstack) {
  const url = config.url;
  const page = await newPage(browser);
  const articleUrls = new Set();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Scroll to load more
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollBy(0, 2000));
      await page.waitForTimeout(800);
    }

    // Find article links
    const links = await page.$$eval('a[href]', (els) =>
      els.map(el => el.href).filter(Boolean)
    );

    for (const link of links) {
      try {
        const u = new URL(link);
        const pubU = new URL(url);
        if (isSubstack) {
          if (u.hostname === pubU.hostname && u.pathname.startsWith('/p/')) {
            articleUrls.add(u.origin + u.pathname);
          }
        } else {
          // Medium
          if (link.includes('medium.com') && u.pathname.split('/').length >= 3 && u.pathname.includes('-')) {
            const clean = u.origin + u.pathname;
            if (clean !== url) articleUrls.add(clean);
          }
        }
      } catch (_) {}
    }

    log('info', `Found ${articleUrls.size} articles`);

    const articles = [];
    for (const articleUrl of articleUrls) {
      if (ctrl.abort()) break;
      await ctrl.delay(config.requestDelay || 2000);
      const article = await scrapeArticle(browser, newPage, config, articleUrl, log, isSubstack);
      if (article) articles.push(article);
    }

    return articles;
  } finally {
    try { await page.context().close(); } catch (_) {}
  }
}

async function scrapeArticle(browser, newPage, config, url, log, isSubstack) {
  const page = await newPage(browser);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Close paywall/modal if present
    try {
      await page.click('button[aria-label*="close"], .modal-close, button.close', { timeout: 2000 });
    } catch (_) {}

    const title = await page.title().then(t => {
      return t.replace(/\s*[-|–]\s*(Medium|Substack).*$/, '').trim();
    });

    let html = '';
    const selectors = isSubstack
      ? ['.available-content', '.post-content', 'article', 'main']
      : ['article', '.section-content', 'main', '.postArticle-content'];

    for (const sel of selectors) {
      html = await page.$eval(sel, el => el.innerHTML).catch(() => '');
      if (html && html.length > 300) break;
    }

    if (!html) {
      log('warning', `Minimal content (may be paywalled): ${title}`, url);
    }

    const author = await page.$eval(
      '[data-testid="authorName"] a, .author-name, .byline a, .author a',
      el => el.textContent.trim()
    ).catch(() => null);

    const publishDate = await page.$eval(
      'time[datetime], [data-testid="publicationDate"]',
      el => el.getAttribute('datetime') || el.textContent.trim()
    ).catch(() => null);

    const content = buildArticleNote(title, author, publishDate, td.turndown(html || ''), url);
    log('success', `${isSubstack ? 'Substack' : 'Medium'}: ${title}`, url);

    return {
      url,
      title: sanitizeTitle(title),
      content,
      sourceType: 'medium',
      subfolder: isSubstack ? 'Substack' : 'Medium'
    };
  } catch (e) {
    log('error', `Article failed: ${url} — ${e.message}`, url);
    return null;
  } finally {
    try { await page.context().close(); } catch (_) {}
  }
}

function buildArticleNote(title, author, date, content, url) {
  const lines = [];
  if (author) lines.push(`**Author:** ${author}`);
  if (date) lines.push(`**Published:** ${date}`);
  lines.push(`**Source:** [Read original](${url})`);
  lines.push('');
  lines.push(content.replace(/\n{3,}/g, '\n\n').trim());
  return lines.join('\n');
}

function isPublicationHomepage(url, isSubstack) {
  try {
    const u = new URL(url);
    if (isSubstack) return u.pathname === '/' || u.pathname === '';
    // Medium publication homepage has no article slug
    const parts = u.pathname.split('/').filter(Boolean);
    return parts.length <= 1;
  } catch (_) { return false; }
}

function sanitizeTitle(t) {
  return t.replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 200) || 'Article';
}

module.exports = { scrape };
