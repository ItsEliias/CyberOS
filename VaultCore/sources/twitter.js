'use strict';
// sources/twitter.js — Twitter/X thread extractor

async function scrape(browser, newPage, config, vaultPath, log, scrapeState, ctrl) {
  const url = config.url || '';
  if (!url) { log('error', 'No Twitter/X URL'); return []; }

  log('info', `Twitter/X thread: ${url}`);

  const page = await newPage(browser);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Get main tweet author
    const authorHandle = await page.$eval(
      '[data-testid="User-Name"] span, [href*="twitter.com"] span, [href*="x.com"] span',
      el => el.textContent.trim()
    ).catch(() => 'Unknown');

    // Scroll to load thread
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollBy(0, 1500));
      await page.waitForTimeout(600);
      if (ctrl.abort()) break;
    }

    // Extract tweets from thread (original author only)
    const tweets = await page.$$eval(
      '[data-testid="tweet"]',
      (els) => els.map(el => {
        const authorEl = el.querySelector('[data-testid="User-Name"]');
        const author = authorEl ? authorEl.textContent.trim() : '';
        const textEl = el.querySelector('[data-testid="tweetText"]');
        const text = textEl ? textEl.textContent.trim() : '';
        const timeEl = el.querySelector('time');
        const time = timeEl ? timeEl.getAttribute('datetime') : null;

        // Extract images
        const imgs = Array.from(el.querySelectorAll('[data-testid="tweetPhoto"] img, img[src*="pbs.twimg.com"]'))
          .map(img => img.src).filter(Boolean);

        return { author, text, time, images: imgs };
      }).filter(t => t.text && t.text.length > 0)
    ).catch(() => []);

    if (tweets.length === 0) {
      log('error', 'No tweets found — Twitter may require login', url);
      return [];
    }

    // Filter to original author's thread only (exclude replies and retweets)
    const mainAuthor = tweets[0].author;
    const threadTweets = tweets.filter(t => t.author === mainAuthor || t.author === '');

    // Extract tweet title from first tweet
    const firstText = threadTweets[0]?.text || 'Twitter Thread';
    const title = sanitizeTitle(firstText.slice(0, 80).split('\n')[0]);

    const content = buildTwitterNote(title, mainAuthor, threadTweets, url);

    log('success', `Twitter: ${title} (${threadTweets.length} tweets)`, url);

    return [{
      url,
      title,
      content,
      sourceType: 'twitter',
      subfolder: 'Twitter'
    }];
  } catch (e) {
    log('error', `Twitter failed: ${e.message}`, url);
    return [];
  } finally {
    try { await page.context().close(); } catch (_) {}
  }
}

function buildTwitterNote(title, author, tweets, url) {
  const lines = [];
  lines.push(`**Author:** ${author}`);
  lines.push(`**Source:** [View Thread](${url})`);
  lines.push(`**Tweets:** ${tweets.length}`);
  lines.push('');
  lines.push('## Thread');
  lines.push('');

  tweets.forEach((tweet, idx) => {
    lines.push(`### Tweet ${idx + 1}`);
    if (tweet.time) {
      lines.push(`*${new Date(tweet.time).toLocaleString()}*`);
    }
    lines.push('');
    lines.push(tweet.text);
    if (tweet.images && tweet.images.length > 0) {
      lines.push('');
      for (const img of tweet.images) {
        lines.push(`![Image](${img})`);
      }
    }
    lines.push('');
  });

  return lines.join('\n');
}

function sanitizeTitle(t) {
  return t.replace(/[<>:"/\\|?*@#]/g, '').trim().slice(0, 200) || 'Twitter Thread';
}

module.exports = { scrape };
