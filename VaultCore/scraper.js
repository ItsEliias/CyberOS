'use strict';
// scraper.js — Core scraping orchestrator using Playwright
const path = require('path');
const fs = require('fs');
const processor = require('./processor');
const conflict = require('./conflict');

// Source handlers
const obsidianScraper = require('./sources/obsidian');
const universalScraper = require('./sources/universal');
const githubScraper = require('./sources/github');
const youtubeScraper = require('./sources/youtube');
const pdfScraper = require('./sources/pdf');
const redditScraper = require('./sources/reddit');
const twitterScraper = require('./sources/twitter');
const notionScraper = require('./sources/notion');
const mediumScraper = require('./sources/medium');
const cveScraper = require('./sources/cve');
const rssScraper = require('./sources/rss');

let browserInstance = null;
let scrapeAborted = false;
let scrapePaused = false;
let failedUrls = [];
let progressCallback = null;
let pendingConflicts = []; // for 'ask' mode
let conflictResolveReject = null;

// ─── Public control API ────────────────────────────────────────────────────────

function pauseScrape() { scrapePaused = true; }
function resumeScrape() { scrapePaused = false; }
function stopScrape() { scrapeAborted = true; scrapePaused = false; closeBrowser(); }

async function closeBrowser() {
  if (browserInstance) {
    try { await browserInstance.close(); } catch (_) {}
    browserInstance = null;
  }
}

// ─── Browser management ────────────────────────────────────────────────────────

async function getBrowser() {
  if (browserInstance) return browserInstance;
  let playwright;
  try {
    playwright = require('playwright-core');
  } catch (_) {
    playwright = require('playwright');
  }
  browserInstance = await playwright.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  return browserInstance;
}

async function newPage(browser) {
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; VaultCore/1.0; +https://github.com/itsEliias/vaultcore)',
    ignoreHTTPSErrors: true
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  return page;
}

// ─── Delay helper ─────────────────────────────────────────────────────────────

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function respectDelay(delayMs) {
  if (scrapePaused) {
    while (scrapePaused && !scrapeAborted) {
      await delay(200);
    }
  }
  await delay(delayMs || 1500);
}

// ─── Main run function ────────────────────────────────────────────────────────

async function runScrape(config, vaultPath, onProgress) {
  scrapeAborted = false;
  scrapePaused = false;
  failedUrls = [];
  progressCallback = onProgress;

  const stats = {
    found: 0,
    saved: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    startTime: Date.now()
  };

  const log = (type, message, url) => {
    onProgress({
      type: 'log',
      logType: type, // success|error|warning|skipped|info
      message,
      url,
      stats,
      percent: stats.found > 0 ? Math.round(((stats.saved + stats.updated + stats.skipped + stats.failed) / stats.found) * 100) : 0,
      elapsed: Date.now() - stats.startTime
    });
  };

  const progress = (data) => {
    onProgress(Object.assign({ stats, percent: 0, elapsed: Date.now() - stats.startTime }, data));
  };

  // Load scrape state for incremental updates
  const stateFile = path.join(vaultPath, '_scrape_state.json');
  let scrapeState = {};
  if (config.updateMode === 'updates' || config.updateMode === 'incremental') {
    try {
      if (fs.existsSync(stateFile)) {
        scrapeState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      }
    } catch (_) {}
  }

  let pages = [];

  try {
    const browser = await getBrowser();

    log('info', `Starting ${config.sourceType} scrape: ${config.url || config.sourceName}`);
    progress({ type: 'status', message: 'Fetching pages...' });

    // Handle bulk URL import — run each URL through the appropriate scraper
    if (config.bulkUrls && config.bulkUrls.length > 0) {
      log('info', `Bulk import: ${config.bulkUrls.length} URLs`);
      for (const url of config.bulkUrls) {
        if (scrapeAborted) break;
        const urlConfig = Object.assign({}, config, { url, bulkUrls: null });
        // Auto-detect type
        const detectedType = detectTypeFromUrl(url);
        urlConfig.sourceType = detectedType;
        const urlPages = await dispatchScraper(detectedType, browser, newPage, urlConfig, vaultPath, log, scrapeState);
        pages.push(...urlPages);
        log('info', `URL done: ${url} → ${urlPages.length} pages`);
        await respectDelay(config.requestDelay || 1500);
      }
    } else {
      // Normal single-source dispatch
    }

    // Dispatch to appropriate scraper
    if (!config.bulkUrls || config.bulkUrls.length === 0)
    switch (config.sourceType) {
      case 'obsidian-publish':
        pages = await obsidianScraper.scrape(browser, newPage, config, vaultPath, log, scrapeState, { delay: respectDelay, abort: () => scrapeAborted });
        break;
      case 'website':
        pages = await universalScraper.scrape(browser, newPage, config, vaultPath, log, scrapeState, { delay: respectDelay, abort: () => scrapeAborted });
        break;
      case 'github':
        pages = await githubScraper.scrape(browser, newPage, config, vaultPath, log, scrapeState, { delay: respectDelay, abort: () => scrapeAborted });
        break;
      case 'youtube':
        pages = await youtubeScraper.scrape(browser, newPage, config, vaultPath, log, scrapeState, { delay: respectDelay, abort: () => scrapeAborted });
        break;
      case 'pdf':
        pages = await pdfScraper.scrape(config, vaultPath, log, { abort: () => scrapeAborted });
        break;
      case 'reddit':
        pages = await redditScraper.scrape(browser, newPage, config, vaultPath, log, scrapeState, { delay: respectDelay, abort: () => scrapeAborted });
        break;
      case 'twitter':
        pages = await twitterScraper.scrape(browser, newPage, config, vaultPath, log, scrapeState, { delay: respectDelay, abort: () => scrapeAborted });
        break;
      case 'notion':
        pages = await notionScraper.scrape(browser, newPage, config, vaultPath, log, scrapeState, { delay: respectDelay, abort: () => scrapeAborted });
        break;
      case 'medium':
        pages = await mediumScraper.scrape(browser, newPage, config, vaultPath, log, scrapeState, { delay: respectDelay, abort: () => scrapeAborted });
        break;
      case 'cve':
        pages = await cveScraper.scrape(browser, newPage, config, vaultPath, log, scrapeState, { delay: respectDelay, abort: () => scrapeAborted });
        break;
      case 'rss':
        pages = await rssScraper.scrape(config, vaultPath, log, scrapeState, { delay: respectDelay, abort: () => scrapeAborted });
        break;
      default:
        pages = await universalScraper.scrape(browser, newPage, config, vaultPath, log, scrapeState, { delay: respectDelay, abort: () => scrapeAborted });
    }

    stats.found = pages.length;
    log('info', `Found ${pages.length} pages to process`);

    // Detect obsidian plugins for formatting
    const obsidianPlugins = detectObsidianPlugins(vaultPath);

    // Process each page
    for (let i = 0; i < pages.length; i++) {
      if (scrapeAborted) break;
      await respectDelay(config.requestDelay || 1500);

      const page = pages[i];

      // Update progress
      progress({
        type: 'progress',
        current: i + 1,
        total: pages.length,
        percent: Math.round(((i + 1) / pages.length) * 100),
        currentPage: page.title || page.url
      });

      if (!page.content || page.content.trim().length === 0) {
        stats.failed++;
        failedUrls.push(page.url);
        log('error', `Empty content: ${page.title || page.url}`, page.url);
        continue;
      }

      // Build output path
      const outputPath = buildOutputPath(page, config, vaultPath);

      // Check incremental update mode
      if (config.updateMode === 'updates' && scrapeState[page.url]) {
        const prevHash = scrapeState[page.url].contentHash;
        const newHash = hashContent(page.content);
        if (prevHash === newHash) {
          stats.skipped++;
          log('skipped', `Unchanged: ${page.title || page.url}`, page.url);
          continue;
        }
      }

      // Inject frontmatter and process content
      const processedContent = processor.injectFrontmatter(page, config, obsidianPlugins);
      const finalContent = processor.autoTag(processedContent, page);

      // Handle conflict
      const conflictResult = await conflict.handleConflict(outputPath, finalContent, config.conflictStrategy || 'skip', scrapeState);
      if (conflictResult.action === 'skip') {
        stats.skipped++;
        log('skipped', `Conflict skipped: ${page.title || page.url}`, page.url);
      } else if (conflictResult.action === 'wrote') {
        if (fs.existsSync(outputPath)) {
          stats.updated++;
          log('success', `Updated: ${page.title || page.url}`, page.url);
        } else {
          stats.saved++;
          log('success', `Saved: ${page.title || page.url}`, page.url);
        }
        writeNote(outputPath, conflictResult.content || finalContent);
        // Update scrape state
        scrapeState[page.url] = {
          filePath: outputPath,
          contentHash: hashContent(finalContent),
          scrapedAt: new Date().toISOString(),
          title: page.title
        };
        saveScrapeState(stateFile, scrapeState);
      } else if (conflictResult.action === 'conflict') {
        stats.skipped++;
        log('warning', `Conflict detected: ${page.title || page.url}`, page.url);
      }
    }

    // Post-processing
    if (!scrapeAborted && pages.length > 0) {
      log('info', 'Running post-processing...');

      const outputFolder = getOutputFolder(config, vaultPath);

      // Auto-wikilinks
      if (outputFolder && fs.existsSync(outputFolder)) {
        log('info', 'Generating auto-wikilinks...');
        await processor.autoWikilinks(vaultPath, outputFolder);
      }

      // Generate index note
      if (outputFolder && fs.existsSync(outputFolder)) {
        log('info', 'Generating index note...');
        processor.generateIndexNote(outputFolder, config, stats);
      }

      // Extract code snippets
      if (outputFolder && fs.existsSync(outputFolder)) {
        log('info', 'Extracting code snippets...');
        processor.extractCodeSnippets(outputFolder);
      }

      // Canvas generation
      if (config.generateCanvas && outputFolder && fs.existsSync(outputFolder)) {
        log('info', 'Generating Obsidian Canvas...');
        await processor.generateCanvas(config.sourceName || 'Source', outputFolder, vaultPath);
      }
    }

    stats.elapsed = Date.now() - stats.startTime;
    log('info', `Scrape complete. Saved: ${stats.saved}, Updated: ${stats.updated}, Skipped: ${stats.skipped}, Failed: ${stats.failed}`);

    return { ...stats, failedUrls };

  } catch (e) {
    log('error', `Fatal scrape error: ${e.message}`);
    throw e;
  } finally {
    await closeBrowser();
  }
}

// ─── Retry failed URLs ────────────────────────────────────────────────────────

async function retryFailed(config, vaultPath, onProgress) {
  if (!failedUrls || failedUrls.length === 0) {
    return { saved: 0, failed: 0, message: 'No failed URLs to retry' };
  }
  const retryConfig = Object.assign({}, config, { urls: failedUrls });
  failedUrls = [];
  return runScrape(retryConfig, vaultPath, onProgress);
}

// ─── File helpers ─────────────────────────────────────────────────────────────

function writeNote(filePath, content) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (e) {
    console.error('[scraper] Failed to write note:', filePath, e.message);
  }
}

function saveScrapeState(stateFile, state) {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
  } catch (_) {}
}

function hashContent(content) {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(content || '').digest('hex');
}

function buildOutputPath(page, config, vaultPath) {
  const outputSubfolder = config.outputSubfolder || sanitizePath(config.sourceName || 'Scraped');
  const outputDir = path.join(vaultPath, outputSubfolder, page.subfolder || '');
  const fileName = sanitizeFileName(page.title || 'Untitled') + '.md';
  return path.join(outputDir, fileName);
}

function getOutputFolder(config, vaultPath) {
  const outputSubfolder = config.outputSubfolder || sanitizePath(config.sourceName || 'Scraped');
  return path.join(vaultPath, outputSubfolder);
}

function sanitizeFileName(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200) || 'Untitled';
}

function sanitizePath(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '-')
    .trim()
    .slice(0, 100) || 'Scraped';
}

function detectObsidianPlugins(vaultPath) {
  const pluginsFile = path.join(vaultPath, '.obsidian', 'community-plugins.json');
  try {
    if (fs.existsSync(pluginsFile)) {
      return JSON.parse(fs.readFileSync(pluginsFile, 'utf8'));
    }
  } catch (_) {}
  return [];
}

function detectTypeFromUrl(url) {
  const u = (url || '').toLowerCase();
  if (u.includes('publish.obsidian.md')) return 'obsidian-publish';
  if (u.includes('github.com')) return 'github';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('reddit.com')) return 'reddit';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  if (u.includes('notion.so') || u.includes('notion.site')) return 'notion';
  if (u.includes('medium.com') || u.includes('substack.com')) return 'medium';
  if (u.endsWith('.xml') || u.includes('/feed') || u.includes('/rss')) return 'rss';
  return 'website';
}

async function dispatchScraper(type, browser, newPageFn, config, vaultPath, log, scrapeState) {
  const ctrl = { delay: respectDelay, abort: () => scrapeAborted };
  try {
    switch (type) {
      case 'obsidian-publish': return await obsidianScraper.scrape(browser, newPageFn, config, vaultPath, log, scrapeState, ctrl);
      case 'github': return await githubScraper.scrape(browser, newPageFn, config, vaultPath, log, scrapeState, ctrl);
      case 'youtube': return await youtubeScraper.scrape(browser, newPageFn, config, vaultPath, log, scrapeState, ctrl);
      case 'reddit': return await redditScraper.scrape(browser, newPageFn, config, vaultPath, log, scrapeState, ctrl);
      case 'twitter': return await twitterScraper.scrape(browser, newPageFn, config, vaultPath, log, scrapeState, ctrl);
      case 'notion': return await notionScraper.scrape(browser, newPageFn, config, vaultPath, log, scrapeState, ctrl);
      case 'medium': return await mediumScraper.scrape(browser, newPageFn, config, vaultPath, log, scrapeState, ctrl);
      case 'rss': return await rssScraper.scrape(config, vaultPath, log, scrapeState, ctrl);
      default: return await universalScraper.scrape(browser, newPageFn, config, vaultPath, log, scrapeState, ctrl);
    }
  } catch (e) {
    log('error', `Dispatch error for ${config.url}: ${e.message}`, config.url);
    return [];
  }
}

module.exports = {
  runScrape,
  retryFailed,
  pauseScrape,
  resumeScrape,
  stopScrape,
  sanitizeFileName,
  sanitizePath,
  hashContent
};
