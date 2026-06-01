'use strict';
// sources/github.js — GitHub repository scraper
const https = require('https');

async function scrape(browser, newPage, config, vaultPath, log, scrapeState, ctrl) {
  const repoUrl = config.url || '';
  if (!repoUrl) { log('error', 'No GitHub repo URL'); return []; }

  // Parse owner/repo from URL
  let owner, repo;
  try {
    const u = new URL(repoUrl);
    const parts = u.pathname.replace(/^\//, '').split('/');
    owner = parts[0];
    repo = parts[1];
  } catch (e) { log('error', 'Invalid GitHub URL'); return []; }

  if (!owner || !repo) { log('error', 'Could not parse owner/repo from URL'); return []; }

  const branch = config.branch || 'main';
  const scrapeMode = config.githubMode || 'readme';
  const pages = [];

  log('info', `GitHub: ${owner}/${repo} — mode: ${scrapeMode}, branch: ${branch}`);

  try {
    if (scrapeMode === 'readme') {
      const content = await fetchGitHubRaw(owner, repo, branch, 'README.md');
      if (content) {
        pages.push({
          url: repoUrl,
          title: `${repo} README`,
          content: preprocessMarkdown(content),
          sourceType: 'github'
        });
        log('success', `Fetched README: ${repo}`, repoUrl);
      } else {
        log('error', 'README not found', repoUrl);
      }
    } else {
      // Fetch file tree via GitHub API
      const tree = await fetchGitHubTree(owner, repo, branch);
      if (!tree || tree.length === 0) {
        log('error', 'Could not fetch repository tree', repoUrl);
        return pages;
      }

      let mdFiles = [];
      if (scrapeMode === 'wiki') {
        mdFiles = tree.filter(f => f.path.endsWith('.md') && f.path.toLowerCase().includes('wiki'));
      } else if (scrapeMode === 'docs') {
        mdFiles = tree.filter(f => f.path.endsWith('.md') && (
          f.path.toLowerCase().startsWith('docs/') ||
          f.path.toLowerCase().startsWith('documentation/') ||
          f.path.toLowerCase().startsWith('doc/')
        ));
      } else {
        // All markdown files
        mdFiles = tree.filter(f => f.path.endsWith('.md'));
      }

      log('info', `Found ${mdFiles.length} markdown files`);

      for (const file of mdFiles) {
        if (ctrl.abort()) break;
        await ctrl.delay(config.requestDelay || 800);

        try {
          const raw = await fetchGitHubRaw(owner, repo, branch, file.path);
          if (!raw) { log('error', `Failed to fetch: ${file.path}`); continue; }

          const title = file.path.split('/').pop().replace(/\.md$/i, '').replace(/-/g, ' ');
          const subfolder = file.path.includes('/') ? file.path.split('/').slice(0, -1).join('/') : '';

          pages.push({
            url: `https://github.com/${owner}/${repo}/blob/${branch}/${file.path}`,
            title,
            content: preprocessMarkdown(raw),
            subfolder,
            sourceType: 'github'
          });
          log('success', `Fetched: ${file.path}`, file.path);
        } catch (e) {
          log('error', `Failed: ${file.path} — ${e.message}`);
        }
      }
    }
  } catch (e) {
    log('error', `GitHub scrape error: ${e.message}`);
  }

  return pages;
}

function preprocessMarkdown(md) {
  // Convert relative links to absolute GitHub links where possible
  return md
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function fetchGitHubRaw(owner, repo, branch, filePath) {
  return new Promise((resolve) => {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    const req = https.get(url, {
      headers: { 'User-Agent': 'VaultCore/1.0' }
    }, (res) => {
      if (res.statusCode !== 200) { resolve(null); return; }
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve(data));
    });
    req.on('error', () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
  });
}

function fetchGitHubTree(owner, repo, branch) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      method: 'GET',
      headers: {
        'User-Agent': 'VaultCore/1.0',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 15000
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.tree || []);
        } catch (_) { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.on('timeout', () => { req.destroy(); resolve([]); });
    req.end();
  });
}

module.exports = { scrape };
