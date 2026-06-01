'use strict';
// sources/youtube.js — YouTube video/playlist transcript and description extractor

async function scrape(browser, newPage, config, vaultPath, log, scrapeState, ctrl) {
  const url = config.url || '';
  if (!url) { log('error', 'No YouTube URL'); return []; }

  const extractMode = config.youtubeMode || 'full'; // full | description
  const timestampLinks = config.timestampLinks !== false;
  const pages = [];

  // Detect if playlist or single video
  const isPlaylist = url.includes('list=') || url.includes('/playlist?');

  log('info', `YouTube: ${isPlaylist ? 'Playlist' : 'Video'} — ${url}`);

  const page = await newPage(browser);
  try {
    if (isPlaylist) {
      // Fetch playlist items
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Scroll to load more items
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 2000));
        await page.waitForTimeout(800);
      }

      const videoLinks = await page.$$eval(
        'ytd-playlist-video-renderer a#video-title, ytd-grid-video-renderer a#video-title',
        (els) => els.map(el => ({ href: el.href, title: el.title || el.textContent.trim() }))
      );

      log('info', `Found ${videoLinks.length} videos in playlist`);

      for (const { href, title } of videoLinks) {
        if (ctrl.abort()) break;
        await ctrl.delay(config.requestDelay || 2000);
        const videoPage = await scrapeVideo(browser, newPage, { ...config, url: href, youtubeMode: extractMode }, log, ctrl, timestampLinks);
        if (videoPage) pages.push(videoPage);
      }
    } else {
      const videoPage = await scrapeVideo(browser, newPage, config, log, ctrl, timestampLinks);
      if (videoPage) pages.push(videoPage);
    }
  } finally {
    try { await page.context().close(); } catch (_) {}
  }

  return pages;
}

async function scrapeVideo(browser, newPage, config, log, ctrl, timestampLinks) {
  const url = config.url;
  const page = await newPage(browser);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Expand description
    try {
      await page.click('#expand, tp-yt-paper-button#expand, #description .more-button, #snippet .more-button', { timeout: 3000 });
      await page.waitForTimeout(500);
    } catch (_) {}

    const title = await page.$eval('h1.ytd-video-primary-info-renderer, h1.title', el => el.textContent.trim())
      .catch(() => url.split('v=')[1] || 'YouTube Video');

    const channelName = await page.$eval(
      '#channel-name a, .ytd-channel-name a, yt-formatted-string.ytd-channel-name',
      el => el.textContent.trim()
    ).catch(() => 'Unknown Channel');

    const uploadDate = await page.$eval(
      '#info-strings yt-formatted-string, .date.ytd-video-primary-info-renderer',
      el => el.textContent.trim()
    ).catch(() => null);

    const description = await page.$eval(
      '#description-text, #description ytd-text-inline-expander, #snippet-text',
      el => el.textContent.trim()
    ).catch(() => null);

    const thumbnailUrl = await page.$eval(
      'meta[property="og:image"], meta[name="thumbnail"]',
      el => el.content || el.getAttribute('content')
    ).catch(() => null);

    let transcript = '';
    if (config.youtubeMode !== 'description') {
      transcript = await extractTranscript(page, timestampLinks, url);
    }

    const videoId = extractVideoId(url);
    const videoUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;

    const content = buildYouTubeNote(title, channelName, uploadDate, description, thumbnailUrl, videoUrl, transcript, timestampLinks);

    log('success', `YouTube: ${title}`, url);

    return {
      url,
      title: sanitizeTitle(title),
      content,
      sourceType: 'youtube'
    };
  } catch (e) {
    log('error', `YouTube failed: ${url} — ${e.message}`, url);
    return null;
  } finally {
    try { await page.context().close(); } catch (_) {}
  }
}

async function extractTranscript(page, timestampLinks, videoUrl) {
  try {
    // Open transcript panel
    const menuBtn = await page.$('#button-shape button, .ytd-menu-renderer button[aria-label*="More"]').catch(() => null);
    if (menuBtn) {
      await menuBtn.click();
      await page.waitForTimeout(500);
      const transcriptBtn = await page.$('tp-yt-paper-item:has-text("Open transcript"), ytd-menu-service-item-renderer:has-text("transcript")').catch(() => null);
      if (transcriptBtn) {
        await transcriptBtn.click();
        await page.waitForTimeout(1500);
      }
    }

    const segments = await page.$$eval(
      'ytd-transcript-segment-renderer, .ytd-transcript-segment-list-renderer .segment',
      (els) => els.map(el => {
        const time = el.querySelector('.segment-timestamp, .timestamp')?.textContent.trim() || '';
        const text = el.querySelector('.segment-text, .cue-group-start-offset')?.textContent.trim() ||
                     el.textContent.trim();
        return { time, text };
      })
    ).catch(() => []);

    if (segments.length === 0) return '';

    const videoId = extractVideoId(videoUrl);
    const lines = segments.map(s => {
      const timeSeconds = parseTimestamp(s.time);
      if (timestampLinks && videoId && s.time) {
        return `[${s.time}](https://youtu.be/${videoId}?t=${timeSeconds}) ${s.text}`;
      }
      return `**${s.time}** ${s.text}`;
    });

    return lines.join('\n');
  } catch (_) {
    return '';
  }
}

function buildYouTubeNote(title, channel, date, description, thumbnail, videoUrl, transcript, timestampLinks) {
  const lines = [];
  if (thumbnail) lines.push(`![Thumbnail](${thumbnail})`);
  lines.push(`**Channel:** ${channel || 'Unknown'}`);
  if (date) lines.push(`**Published:** ${date}`);
  lines.push(`**Source:** [Watch on YouTube](${videoUrl})`);
  lines.push('');

  if (description) {
    lines.push('## Description');
    lines.push('');
    lines.push(description);
    lines.push('');
  }

  if (transcript && transcript.trim()) {
    lines.push('## Transcript');
    lines.push('');
    lines.push(transcript);
  }

  return lines.join('\n');
}

function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.replace('/', '');
    return u.searchParams.get('v');
  } catch (_) { return null; }
}

function parseTimestamp(ts) {
  if (!ts) return 0;
  const parts = ts.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function sanitizeTitle(title) {
  return title.replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 200);
}

module.exports = { scrape };
