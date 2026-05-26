'use strict';
// sources/rss.js — RSS/Atom feed parser (pure XML, no external API)
const https = require('https');
const http = require('http');

async function scrape(config, vaultPath, log, scrapeState, ctrl) {
  const feedUrl = config.url || '';
  if (!feedUrl) { log('error', 'No RSS feed URL'); return []; }

  const maxItems = parseInt(config.rssMaxItems) || 10;
  log('info', `RSS: ${feedUrl} — fetching ${maxItems} items`);

  try {
    const feedXml = await fetchUrl(feedUrl);
    if (!feedXml) { log('error', `Failed to fetch feed: ${feedUrl}`); return []; }

    const items = parseFeed(feedXml);
    if (items.length === 0) { log('warning', 'No items found in feed', feedUrl); return []; }

    log('info', `Found ${items.length} items, processing ${Math.min(items.length, maxItems)}`);

    // Get feed title for subfolder
    const feedTitle = extractFeedTitle(feedXml) || 'RSS';
    const subfolder = `RSS/${sanitizeFileName(feedTitle)}`;

    const pages = [];
    const toProcess = items.slice(0, maxItems);

    for (const item of toProcess) {
      if (ctrl.abort()) break;
      await ctrl.delay(config.requestDelay || 800);

      // Check if unchanged (for incremental)
      const itemKey = item.link || item.guid;
      if (config.updateMode === 'updates' && scrapeState[itemKey]) {
        const crypto = require('crypto');
        const newHash = crypto.createHash('md5').update(item.content || item.description || '').digest('hex');
        if (newHash === scrapeState[itemKey].contentHash) {
          log('skipped', `Unchanged: ${item.title}`, itemKey);
          continue;
        }
      }

      const content = buildRSSNote(item, feedTitle, feedUrl);
      const title = sanitizeFileName(item.title || 'Untitled Article');

      pages.push({
        url: item.link || feedUrl,
        title,
        content,
        sourceType: 'rss',
        subfolder,
        feedTitle
      });

      log('success', `RSS item: ${item.title}`, item.link);
    }

    return pages;
  } catch (e) {
    log('error', `RSS scrape error: ${e.message}`, feedUrl);
    return [];
  }
}

function parseFeed(xml) {
  const items = [];

  // Support both RSS 2.0 and Atom
  const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"');

  if (isAtom) {
    // Parse Atom feed
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)];
    for (const m of entries) {
      const entry = m[1];
      items.push({
        title: extractXML(entry, 'title'),
        link: extractAtomLink(entry),
        guid: extractXML(entry, 'id'),
        published: extractXML(entry, 'published') || extractXML(entry, 'updated'),
        author: extractXML(entry, 'name') || extractXML(entry, 'author'),
        content: extractXML(entry, 'content') || extractXML(entry, 'summary'),
        description: extractXML(entry, 'summary')
      });
    }
  } else {
    // Parse RSS 2.0
    const rssItems = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
    for (const m of rssItems) {
      const item = m[1];
      items.push({
        title: extractXML(item, 'title'),
        link: extractXML(item, 'link'),
        guid: extractXML(item, 'guid'),
        published: extractXML(item, 'pubDate') || extractXML(item, 'dc:date'),
        author: extractXML(item, 'dc:creator') || extractXML(item, 'author'),
        content: extractXML(item, 'content:encoded') || extractXML(item, 'description'),
        description: extractXML(item, 'description')
      });
    }
  }

  return items.filter(i => i.title || i.link);
}

function extractXML(xml, tag) {
  const patterns = [
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'),
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  ];
  for (const p of patterns) {
    const m = xml.match(p);
    if (m) return m[1].trim();
  }
  return '';
}

function extractAtomLink(entry) {
  const m = entry.match(/<link[^>]+href="([^"]+)"/i);
  return m ? m[1] : '';
}

function extractFeedTitle(xml) {
  const m = xml.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
  return m ? m[1].trim() : '';
}

function buildRSSNote(item, feedTitle, feedUrl) {
  const TurndownService = require('turndown');
  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

  const lines = [];
  lines.push(`**Feed:** ${feedTitle}`);
  if (item.author) lines.push(`**Author:** ${item.author}`);
  if (item.published) {
    try {
      const d = new Date(item.published).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
      lines.push(`**Published:** ${d}`);
    } catch (_) {
      lines.push(`**Published:** ${item.published}`);
    }
  }
  if (item.link) lines.push(`**Source:** [Read original](${item.link})`);
  lines.push('');

  if (item.content || item.description) {
    const raw = item.content || item.description;
    // Check if HTML
    if (raw.includes('<') && raw.includes('>')) {
      lines.push(td.turndown(raw).replace(/\n{3,}/g, '\n\n'));
    } else {
      lines.push(raw);
    }
  }

  return lines.join('\n');
}

function fetchUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: { 'User-Agent': 'VaultCore/1.0 RSS Reader', 'Accept': 'application/rss+xml,application/xml,text/xml,*/*' },
      timeout: 15000
    }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(fetchUrl(res.headers.location));
        return;
      }
      if (res.statusCode !== 200) { resolve(null); return; }
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().slice(0, 200) || 'Untitled';
}

module.exports = { scrape };
