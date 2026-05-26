'use strict';
// sources/reddit.js — Reddit thread scraper

async function scrape(browser, newPage, config, vaultPath, log, scrapeState, ctrl) {
  const url = config.url || '';
  if (!url) { log('error', 'No Reddit URL'); return []; }

  const minUpvotes = parseInt(config.minUpvotes) || 10;
  log('info', `Reddit: ${url} — min upvotes: ${minUpvotes}`);

  const page = await newPage(browser);
  try {
    // Use old Reddit for easier scraping
    const oldRedditUrl = url.replace('www.reddit.com', 'old.reddit.com').replace('https://reddit.com', 'https://old.reddit.com');
    await page.goto(oldRedditUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Extract post title
    const title = await page.$eval('.title.may-blank, #siteTable .title a', el => el.textContent.trim())
      .catch(() => url.split('/').filter(Boolean).slice(-2, -1)[0] || 'Reddit Thread');

    // Extract post body
    const postBody = await page.$eval('.usertext-body .md, .expando .md', el => el.textContent.trim())
      .catch(() => '');

    const subreddit = await page.$eval('.subreddit', el => el.textContent.trim()).catch(() => '');
    const author = await page.$eval('.author', el => el.textContent.trim()).catch(() => '');
    const score = await page.$eval('.score.unvoted', el => el.textContent.trim()).catch(() => '');

    // Extract top-level comments
    const comments = await page.$$eval(
      '.commentarea > .nestedlisting > .comment, .commentarea .sitetable > .comment',
      (els, minScore) => {
        return els.slice(0, 50).map(el => {
          const scoreEl = el.querySelector('.score.unvoted, .score.likes, .score.dislikes');
          const scoreText = scoreEl ? scoreEl.getAttribute('title') || scoreEl.textContent : '0';
          const points = parseInt(scoreText.replace(/[^-\d]/g, '')) || 0;
          const authorEl = el.querySelector('a.author');
          const bodyEl = el.querySelector('.usertext-body .md, .usertext-body');
          return {
            author: authorEl ? authorEl.textContent.trim() : '[deleted]',
            score: points,
            body: bodyEl ? bodyEl.textContent.trim() : ''
          };
        }).filter(c => c.score >= minScore && c.body && c.body !== '[deleted]' && c.body !== '[removed]');
      },
      minUpvotes
    ).catch(() => []);

    // Build markdown content
    const content = buildRedditNote(title, author, subreddit, score, postBody, comments, url);

    log('success', `Reddit: ${title} (${comments.length} comments filtered)`, url);

    return [{
      url,
      title: sanitizeTitle(title),
      content,
      sourceType: 'reddit',
      subfolder: 'Reddit'
    }];
  } catch (e) {
    log('error', `Reddit failed: ${e.message}`, url);
    return [];
  } finally {
    try { await page.context().close(); } catch (_) {}
  }
}

function buildRedditNote(title, author, subreddit, score, body, comments, url) {
  const lines = [];
  lines.push(`**Subreddit:** ${subreddit || 'Unknown'}`);
  lines.push(`**Author:** u/${author || 'Unknown'}`);
  lines.push(`**Score:** ${score || 0}`);
  lines.push(`**Source:** [View on Reddit](${url})`);
  lines.push('');

  if (body && body.trim()) {
    lines.push('## Post');
    lines.push('');
    lines.push(body.trim());
    lines.push('');
  }

  if (comments.length > 0) {
    lines.push('## Top Comments');
    lines.push('');
    for (const comment of comments) {
      lines.push(`### u/${comment.author} (${comment.score} points)`);
      lines.push('');
      lines.push(comment.body);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function sanitizeTitle(title) {
  return title.replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 200);
}

module.exports = { scrape };
