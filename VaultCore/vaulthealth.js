'use strict';
// vaulthealth.js — Statistics, duplicate detection, dead link finder, markdown cleaner, note splitter
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

// ─── Statistics ───────────────────────────────────────────────────────────────

async function getStats(vaultPath) {
  if (!vaultPath || !fs.existsSync(vaultPath)) return null;

  const stats = {
    totalNotes: 0,
    totalWords: 0,
    notesByFolder: {},
    mostLinkedNotes: [],
    orphanedNotes: [],
    newestNotes: [],
    recentlyUpdated: [],
    notesByTag: {},
    sourceBreakdown: {}
  };

  const allNotes = [];
  const outboundLinks = {}; // note title → [linked titles]
  const inboundLinks = {}; // note title → count

  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.')) continue;
        const fullPath = path.join(dir, e.name);
        if (e.isDirectory()) walk(fullPath);
        else if (e.name.endsWith('.md')) {
          stats.totalNotes++;
          const relPath = path.relative(vaultPath, fullPath);
          const folder = relPath.includes(path.sep) ? relPath.split(path.sep)[0] : 'Root';
          stats.notesByFolder[folder] = (stats.notesByFolder[folder] || 0) + 1;

          const fileStat = fs.statSync(fullPath);
          const content = fs.readFileSync(fullPath, 'utf8');
          const wordCount = content.split(/\s+/).filter(Boolean).length;
          stats.totalWords += wordCount;

          // Tags from frontmatter
          const tagsMatch = content.match(/^tags:\n((?:  - .*\n?)*)/m);
          if (tagsMatch) {
            const tags = tagsMatch[1].match(/  - (.+)/g) || [];
            for (const tag of tags) {
              const t = tag.replace('  - ', '').trim();
              stats.notesByTag[t] = (stats.notesByTag[t] || 0) + 1;
            }
          }

          // Source type from frontmatter
          const srcMatch = content.match(/^source_type:\s*(.+)$/m);
          if (srcMatch) {
            const src = srcMatch[1].trim().replace(/^["']|["']$/g, '');
            stats.sourceBreakdown[src] = (stats.sourceBreakdown[src] || 0) + 1;
          }

          // Outbound wikilinks
          const title = e.name.replace(/\.md$/, '');
          const wikilinks = [...content.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)]
            .map(m => m[1].trim());
          outboundLinks[title] = wikilinks;

          for (const link of wikilinks) {
            inboundLinks[link] = (inboundLinks[link] || 0) + 1;
          }

          allNotes.push({
            title,
            path: fullPath,
            relPath,
            wordCount,
            created: fileStat.birthtime || fileStat.ctime,
            modified: fileStat.mtime,
            inbound: 0,
            outbound: wikilinks.length
          });
        }
      }
    } catch (e) {
      console.error('[vaulthealth] Walk error:', e.message);
    }
  }

  walk(vaultPath);

  // Calculate inbound link counts
  for (const note of allNotes) {
    note.inbound = inboundLinks[note.title] || 0;
  }

  // Orphaned notes (no inbound AND no outbound links)
  stats.orphanedNotes = allNotes
    .filter(n => n.inbound === 0 && n.outbound === 0)
    .map(n => ({ title: n.title, path: n.relPath }))
    .slice(0, 50);

  // Most linked notes
  stats.mostLinkedNotes = allNotes
    .sort((a, b) => b.inbound - a.inbound)
    .slice(0, 10)
    .map(n => ({ title: n.title, inbound: n.inbound, path: n.relPath }));

  // Newest notes
  stats.newestNotes = [...allNotes]
    .sort((a, b) => new Date(b.created) - new Date(a.created))
    .slice(0, 20)
    .map(n => ({ title: n.title, created: n.created, path: n.relPath }));

  // Recently updated
  stats.recentlyUpdated = [...allNotes]
    .sort((a, b) => new Date(b.modified) - new Date(a.modified))
    .slice(0, 20)
    .map(n => ({ title: n.title, modified: n.modified, path: n.relPath }));

  return stats;
}

// ─── Duplicate Detection ──────────────────────────────────────────────────────

async function findDuplicates(vaultPath, onProgress) {
  const notes = [];
  const results = { exactTitle: [], similarContent: [] };

  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.')) continue;
        const fullPath = path.join(dir, e.name);
        if (e.isDirectory()) walk(fullPath);
        else if (e.name.endsWith('.md')) {
          const title = e.name.replace(/\.md$/, '').toLowerCase();
          const content = fs.readFileSync(fullPath, 'utf8');
          // Strip frontmatter for comparison
          const body = content.replace(/^---[\s\S]*?---\n/, '').trim();
          notes.push({
            title,
            displayTitle: e.name.replace(/\.md$/, ''),
            path: fullPath,
            relPath: path.relative(vaultPath, fullPath),
            body,
            hash: crypto.createHash('md5').update(body).digest('hex'),
            words: body.split(/\s+/).filter(Boolean)
          });
        }
      }
    } catch (_) {}
  }

  walk(vaultPath);
  onProgress({ percent: 20, message: `Loaded ${notes.length} notes` });

  // Exact title matches
  const titleGroups = {};
  for (const note of notes) {
    if (!titleGroups[note.title]) titleGroups[note.title] = [];
    titleGroups[note.title].push(note);
  }
  for (const [title, group] of Object.entries(titleGroups)) {
    if (group.length > 1) {
      results.exactTitle.push(group.map(n => ({ title: n.displayTitle, path: n.relPath, fullPath: n.path })));
    }
  }

  onProgress({ percent: 40, message: 'Checking for similar content...' });

  // Fuzzy content similarity (compare hashes first, then Jaccard similarity)
  const hashGroups = {};
  for (const note of notes) {
    if (!hashGroups[note.hash]) hashGroups[note.hash] = [];
    hashGroups[note.hash].push(note);
  }

  // Exact content duplicates
  for (const [hash, group] of Object.entries(hashGroups)) {
    if (group.length > 1) {
      const pair = {
        noteA: { title: group[0].displayTitle, path: group[0].relPath, fullPath: group[0].path },
        noteB: { title: group[1].displayTitle, path: group[1].relPath, fullPath: group[1].path },
        similarity: 100,
        type: 'exact-content'
      };
      results.similarContent.push(pair);
    }
  }

  onProgress({ percent: 60, message: 'Fuzzy matching...' });

  // Fuzzy similarity — compare notes pairwise using word overlap (Jaccard)
  // Only compare notes that haven't been paired already
  const compared = new Set();
  const threshold = 0.85;

  for (let i = 0; i < Math.min(notes.length, 500); i++) {
    for (let j = i + 1; j < Math.min(notes.length, 500); j++) {
      const key = `${i}-${j}`;
      if (compared.has(key)) continue;
      compared.add(key);

      const a = notes[i];
      const b = notes[j];

      // Skip exact content matches (already found)
      if (a.hash === b.hash) continue;

      // Quick length check
      const lenRatio = Math.min(a.words.length, b.words.length) / Math.max(a.words.length, b.words.length);
      if (lenRatio < 0.5) continue;

      const similarity = jaccardSimilarity(a.words, b.words);
      if (similarity >= threshold) {
        results.similarContent.push({
          noteA: { title: a.displayTitle, path: a.relPath, fullPath: a.path },
          noteB: { title: b.displayTitle, path: b.relPath, fullPath: b.path },
          similarity: Math.round(similarity * 100),
          type: 'similar-content'
        });
      }
    }

    if (i % 50 === 0) {
      onProgress({ percent: 60 + Math.round((i / Math.min(notes.length, 500)) * 35), message: `Comparing notes... ${i}/${Math.min(notes.length, 500)}` });
    }
  }

  onProgress({ percent: 100, message: `Found ${results.exactTitle.length} title duplicates, ${results.similarContent.length} content duplicates` });
  return results;
}

function jaccardSimilarity(wordsA, wordsB) {
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  const intersection = new Set([...setA].filter(w => setB.has(w)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// ─── Dead Link Finder ─────────────────────────────────────────────────────────

async function findDeadLinks(vaultPath, onProgress) {
  const allLinks = [];

  // Collect all external links from all md files
  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.')) continue;
        const fullPath = path.join(dir, e.name);
        if (e.isDirectory()) walk(fullPath);
        else if (e.name.endsWith('.md')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const relPath = path.relative(vaultPath, fullPath);
          // Extract markdown links [text](url)
          const links = [...content.matchAll(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g)];
          for (const [, text, url] of links) {
            allLinks.push({ url, text, file: relPath, fullPath });
          }
        }
      }
    } catch (_) {}
  }

  walk(vaultPath);
  onProgress({ percent: 10, message: `Found ${allLinks.length} external links` });

  const results = [];
  const checked = new Map(); // url → status

  for (let i = 0; i < allLinks.length; i++) {
    const { url, text, file } = allLinks[i];

    if (checked.has(url)) {
      results.push({ url, text, file, status: checked.get(url) });
      continue;
    }

    const status = await checkUrl(url);
    checked.set(url, status);
    results.push({ url, text, file, status });

    onProgress({
      percent: 10 + Math.round((i / allLinks.length) * 85),
      message: `Checking ${i + 1}/${allLinks.length}: ${url.slice(0, 60)}...`
    });

    // Small delay to be polite
    await new Promise(r => setTimeout(r, 150));
  }

  onProgress({ percent: 100, message: 'Link check complete' });

  return {
    total: allLinks.length,
    live: results.filter(r => r.status === 'live').length,
    dead: results.filter(r => r.status === 'dead').length,
    redirected: results.filter(r => r.status === 'redirected').length,
    unknown: results.filter(r => r.status === 'unknown').length,
    results
  };
}

function checkUrl(url) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.request(url, { method: 'HEAD', timeout: 8000,
        headers: { 'User-Agent': 'VaultCore/1.0 LinkChecker' }
      }, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve('live');
        else if (res.statusCode >= 300 && res.statusCode < 400) resolve('redirected');
        else if (res.statusCode >= 400) resolve('dead');
        else resolve('unknown');
      });
      req.on('error', () => resolve('dead'));
      req.on('timeout', () => { req.destroy(); resolve('unknown'); });
      req.end();
    } catch (_) {
      resolve('unknown');
    }
  });
}

function exportDeadLinksCsv(results, vaultPath) {
  const lines = ['File,URL,Text,Status'];
  for (const r of (results.results || [])) {
    const row = [
      `"${r.file || ''}"`,
      `"${r.url || ''}"`,
      `"${(r.text || '').replace(/"/g, '""')}"`,
      r.status || ''
    ];
    lines.push(row.join(','));
  }
  const csvPath = path.join(vaultPath || os.homedir(), '_link_validation.csv');
  try {
    fs.writeFileSync(csvPath, lines.join('\n'), 'utf8');
    return csvPath;
  } catch (e) {
    return null;
  }
}

// ─── Markdown Cleaner ─────────────────────────────────────────────────────────

async function cleanMarkdown(options, vaultPath) {
  const { content, filePath, scope, operations } = options;

  if (scope === 'paste' || filePath) {
    const input = content || (filePath ? fs.readFileSync(filePath, 'utf8') : '');
    const cleaned = applyCleaningOperations(input, operations);
    return { original: input, cleaned, changed: input !== cleaned };
  }

  if (scope === 'folder' || scope === 'vault') {
    const targetPath = scope === 'vault' ? vaultPath : options.folderPath;
    let cleaned = 0;
    let backed = 0;

    function processFile(fp) {
      const original = fs.readFileSync(fp, 'utf8');
      const result = applyCleaningOperations(original, operations);
      if (result !== original) {
        // Backup first
        fs.writeFileSync(fp + '.backup', original, 'utf8');
        backed++;
        fs.writeFileSync(fp, result, 'utf8');
        cleaned++;
      }
    }

    function walk(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.')) continue;
        const fp = path.join(dir, e.name);
        if (e.isDirectory()) walk(fp);
        else if (e.name.endsWith('.md')) processFile(fp);
      }
    }

    walk(targetPath);
    return { cleaned, backed, message: `Cleaned ${cleaned} files. ${backed} backups created.` };
  }

  return { error: 'Unknown scope' };
}

function applyCleaningOperations(content, ops) {
  let result = content;
  const o = ops || {};

  if (o.fixHeadings) result = fixHeadingLevels(result);
  if (o.removeExtraBlankLines) result = result.replace(/\n{3,}/g, '\n\n');
  if (o.fixWikilinks) result = fixBrokenWikilinks(result);
  if (o.standardizeCodeBlocks) result = standardizeCodeBlocks(result);
  if (o.removeHtml) result = removeHtmlTags(result);
  if (o.fixListIndentation) result = fixListIndentation(result);
  if (o.normalizeFrontmatter) result = normalizeFrontmatter(result);
  if (o.stripTrackingParams) result = stripTrackingParams(result);

  return result.trim() + '\n';
}

function fixHeadingLevels(content) {
  // If there's an H1 in frontmatter title and also in body, demote body headings
  const lines = content.split('\n');
  let minLevel = 6;
  let inFrontmatter = false;
  let fmClosed = false;

  for (let i = 0; i < lines.length; i++) {
    if (i === 0 && lines[i] === '---') { inFrontmatter = true; continue; }
    if (inFrontmatter && lines[i] === '---') { inFrontmatter = false; fmClosed = true; continue; }
    if (inFrontmatter) continue;
    const m = lines[i].match(/^(#{1,6})\s/);
    if (m) minLevel = Math.min(minLevel, m[1].length);
  }

  if (minLevel <= 1) return content; // already starts at h1

  const shift = minLevel - 1;
  return content.replace(/^(#{1,6})\s/gm, (match, hashes) => {
    const newLevel = Math.max(1, hashes.length - shift);
    return '#'.repeat(newLevel) + ' ';
  });
}

function fixBrokenWikilinks(content) {
  // Remove illegal characters from wikilinks [[title|alias]]
  return content.replace(/\[\[([^\]]+)\]\]/g, (match, inner) => {
    const cleaned = inner.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim();
    return `[[${cleaned}]]`;
  });
}

function standardizeCodeBlocks(content) {
  // Normalize common language aliases
  const aliases = {
    'sh': 'bash', 'shell': 'bash', 'console': 'bash',
    'py': 'python', 'rb': 'ruby', 'js': 'javascript', 'ts': 'typescript',
    'ps': 'powershell', 'ps1': 'powershell'
  };
  return content.replace(/```(\w+)\n/g, (match, lang) => {
    const normalized = aliases[lang.toLowerCase()] || lang.toLowerCase();
    return `\`\`\`${normalized}\n`;
  });
}

function removeHtmlTags(content) {
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function fixListIndentation(content) {
  const lines = content.split('\n');
  const result = [];
  for (const line of lines) {
    // Standardize list item indentation to 2 spaces
    const m = line.match(/^(\s*)([*+-]|\d+\.)\s/);
    if (m) {
      const depth = Math.floor(m[1].length / 4) * 2;
      result.push(' '.repeat(depth) + line.trimStart());
    } else {
      result.push(line);
    }
  }
  return result.join('\n');
}

function normalizeFrontmatter(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) return content;

  const fmContent = fmMatch[1];
  const body = content.slice(fmMatch[0].length);

  // Parse and sort frontmatter keys
  const lines = fmContent.split('\n');
  const pairs = [];
  let currentKey = null, currentVal = [];

  for (const line of lines) {
    const keyMatch = line.match(/^([a-z_]+):\s*(.*)?$/i);
    if (keyMatch) {
      if (currentKey) pairs.push([currentKey, currentVal.join('\n')]);
      currentKey = keyMatch[1];
      currentVal = [keyMatch[2] || ''];
    } else if (currentKey && line.startsWith('  ')) {
      currentVal.push(line);
    }
  }
  if (currentKey) pairs.push([currentKey, currentVal.join('\n')]);

  pairs.sort((a, b) => a[0].localeCompare(b[0]));

  const newFm = pairs.map(([k, v]) => v ? `${k}: ${v}` : k + ':').join('\n');
  return `---\n${newFm}\n---\n` + body;
}

function stripTrackingParams(content) {
  return content.replace(/\(https?:\/\/[^)]+\)/g, (match) => {
    try {
      const urlStr = match.slice(1, -1);
      const u = new URL(urlStr);
      // Remove common tracking params
      const tracking = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'mc_eid', 'ref', '_ga', 'source', 'feature'];
      for (const p of tracking) u.searchParams.delete(p);
      return `(${u.toString()})`;
    } catch (_) { return match; }
  });
}

// ─── Note Splitter ────────────────────────────────────────────────────────────

async function analyseNoteHeadings(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fmMatch = content.match(/^---[\s\S]*?---\n/);
    const body = fmMatch ? content.slice(fmMatch[0].length) : content;

    const headings = [];
    const lines = body.split('\n');
    let charOffset = fmMatch ? fmMatch[0].length : 0;

    for (const line of lines) {
      const m = line.match(/^(#{2,3})\s+(.+)/);
      if (m) {
        headings.push({
          level: m[1].length,
          title: m[2].trim(),
          offset: charOffset,
          lineText: line
        });
      }
      charOffset += line.length + 1;
    }

    return { headings, totalLines: lines.length, filePath };
  } catch (e) {
    return { error: e.message };
  }
}

async function splitNote(filePath, splitPoints, vaultPath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const noteName = path.basename(filePath, '.md');
    const noteDir = path.dirname(filePath);

    // Backup original
    fs.writeFileSync(filePath + '.backup', content, 'utf8');

    const fmMatch = content.match(/^---[\s\S]*?---\n/);
    const frontmatter = fmMatch ? fmMatch[0] : '';
    const body = fmMatch ? content.slice(frontmatter.length) : content;

    const lines = body.split('\n');
    const sections = [];
    let currentSection = null;
    const splitTitles = new Set(splitPoints || []);

    for (const line of lines) {
      const hMatch = line.match(/^(#{2,3})\s+(.+)/);
      if (hMatch) {
        const heading = hMatch[2].trim();
        if (splitTitles.size === 0 || splitTitles.has(heading)) {
          if (currentSection) sections.push(currentSection);
          currentSection = { title: heading, lines: [line] };
          continue;
        }
      }
      if (currentSection) currentSection.lines.push(line);
      else if (!currentSection) sections.push({ title: null, lines: [line] });
    }
    if (currentSection) sections.push(currentSection);

    const createdNotes = [];

    for (const section of sections) {
      if (!section.title) continue;

      const sectionContent = [
        `---`,
        `title: "${section.title}"`,
        `source_note: "[[${noteName}]]"`,
        `tags:`,
        `  - split-from-${sanitizeTag(noteName)}`,
        `---`,
        ``,
        ...section.lines
      ].join('\n');

      const fileName = sanitizeFileName(section.title) + '.md';
      const filePath2 = path.join(noteDir, fileName);
      fs.writeFileSync(filePath2, sectionContent, 'utf8');
      createdNotes.push({ title: section.title, path: path.relative(vaultPath, filePath2) });
    }

    // Replace original with MOC
    const mocContent = [
      frontmatter.replace(/^---/, `---`).trimEnd(),
      ``,
      `# ${noteName}`,
      ``,
      `> *This note was split into the following sub-notes:*`,
      ``,
      ...createdNotes.map(n => `- [[${n.title}]]`),
      ``
    ].join('\n');

    fs.writeFileSync(filePath, mocContent, 'utf8');

    return { success: true, created: createdNotes, mocPath: filePath };
  } catch (e) {
    return { error: e.message };
  }
}

// ─── Note operations ──────────────────────────────────────────────────────────

async function mergeNotes(notePathA, notePathB, keepPath) {
  try {
    const contentA = fs.readFileSync(notePathA, 'utf8');
    const contentB = fs.readFileSync(notePathB, 'utf8');

    const merged = [
      contentA.trim(),
      '\n\n---\n\n',
      '> *Merged content:*\n\n',
      contentB.replace(/^---[\s\S]*?---\n/, '').trim()
    ].join('');

    return { success: true, merged, pathA: notePathA, pathB: notePathB };
  } catch (e) {
    return { error: e.message };
  }
}

function deleteNote(filePath) {
  try {
    // Backup before delete
    const backup = filePath + '.deleted_' + Date.now();
    fs.copyFileSync(filePath, backup);
    fs.unlinkSync(filePath);
    return { success: true, backup };
  } catch (e) {
    return { error: e.message };
  }
}

// ─── Link validation (for post-scrape) ───────────────────────────────────────

async function validateLinks(folderPath) {
  const allLinks = [];

  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.')) continue;
        const fp = path.join(dir, e.name);
        if (e.isDirectory()) walk(fp);
        else if (e.name.endsWith('.md')) {
          const content = fs.readFileSync(fp, 'utf8');
          const links = [...content.matchAll(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g)];
          for (const [, text, url] of links) {
            allLinks.push({ url, text, file: fp });
          }
        }
      }
    } catch (_) {}
  }

  walk(folderPath);
  const results = { total: allLinks.length, dead: [], live: [] };

  for (const link of allLinks.slice(0, 100)) { // limit to 100 for post-scrape
    const status = await checkUrl(link.url);
    if (status === 'dead') results.dead.push(link);
    else results.live.push(link);
  }

  return results;
}

// ─── Knowledge Gap Report ─────────────────────────────────────────────────────

async function generateKnowledgeGapReport(vaultPath) {
  try {
    const scrapedTopics = new Map();
    const writeupTopics = new Map();

    // Collect topics from scraped notes (tags)
    function collectTopics(dir, map, isWriteup) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (e.name.startsWith('.')) continue;
          const fp = path.join(dir, e.name);
          if (e.isDirectory()) collectTopics(fp, map, isWriteup);
          else if (e.name.endsWith('.md')) {
            const content = fs.readFileSync(fp, 'utf8');
            // Extract tags
            const tagsMatch = content.match(/^tags:\n((?:  - .*\n?)*)/m);
            if (tagsMatch) {
              const tags = tagsMatch[1].match(/  - (.+)/g) || [];
              for (const tag of tags) {
                const t = tag.replace('  - ', '').trim().replace(/^#/, '');
                map.set(t, (map.get(t) || 0) + 1);
              }
            }
            // Extract headings as topics
            const headings = [...content.matchAll(/^#{1,3}\s+(.+)/gm)].map(m => m[1].trim().toLowerCase());
            for (const h of headings) map.set(h, (map.get(h) || 0) + 1);
          }
        }
      } catch (_) {}
    }

    // All scraped content (exclude Writeups)
    collectTopics(vaultPath, scrapedTopics, false);

    // Writeups folder specifically
    const writeupsDir = path.join(vaultPath, 'Writeups');
    if (fs.existsSync(writeupsDir)) {
      collectTopics(writeupsDir, writeupTopics, true);
    }

    // Identify gaps: topics in scraped material but not covered in writeups
    const gaps = [];
    for (const [topic, count] of scrapedTopics.entries()) {
      if (!writeupTopics.has(topic) && count >= 2) {
        gaps.push({ topic, coverage: count });
      }
    }

    gaps.sort((a, b) => b.coverage - a.coverage);

    const reportDate = new Date().toISOString().split('T')[0];
    const reportPath = path.join(vaultPath, 'Reports', `Knowledge Gap ${reportDate}.md`);

    const lines = [
      `---`,
      `title: "Knowledge Gap Report — ${reportDate}"`,
      `generated_at: "${new Date().toISOString()}"`,
      `tags:`,
      `  - report`,
      `  - knowledge-gap`,
      `  - auto-generated`,
      `---`,
      ``,
      `# Knowledge Gap Report — ${reportDate}`,
      ``,
      `> *Auto-generated by VAULTCORE. Compares scraped material against your writeups to identify topics you've studied but not practised.*`,
      ``,
      `## Summary`,
      ``,
      `- **Topics in scraped vault:** ${scrapedTopics.size}`,
      `- **Topics covered in writeups:** ${writeupTopics.size}`,
      `- **Gaps identified:** ${gaps.length}`,
      ``,
      `## Gaps — Topics to Prioritise`,
      ``,
      `These topics appear in your scraped material but have no coverage in your writeups:`,
      ``
    ];

    // Group by coverage level
    const highPriority = gaps.filter(g => g.coverage >= 5).slice(0, 20);
    const medPriority = gaps.filter(g => g.coverage >= 3 && g.coverage < 5).slice(0, 20);
    const lowPriority = gaps.filter(g => g.coverage < 3).slice(0, 20);

    if (highPriority.length > 0) {
      lines.push(`### 🔴 High Priority (well-documented in vault)`);
      lines.push('');
      for (const g of highPriority) {
        lines.push(`- **${g.topic}** — ${g.coverage} references in vault`);
      }
      lines.push('');
    }

    if (medPriority.length > 0) {
      lines.push(`### 🟡 Medium Priority`);
      lines.push('');
      for (const g of medPriority) {
        lines.push(`- **${g.topic}** — ${g.coverage} references in vault`);
      }
      lines.push('');
    }

    if (lowPriority.length > 0) {
      lines.push(`### ⚪ Lower Priority`);
      lines.push('');
      for (const g of lowPriority) {
        lines.push(`- ${g.topic}`);
      }
      lines.push('');
    }

    lines.push(`## Topics Well Covered in Writeups`);
    lines.push('');
    for (const [topic] of [...writeupTopics.entries()].slice(0, 20)) {
      lines.push(`- ✅ ${topic}`);
    }

    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');

    return { success: true, path: reportPath, gaps: gaps.length, reportDate };
  } catch (e) {
    return { error: e.message };
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().slice(0, 200) || 'Note';
}

function sanitizeTag(name) {
  return name.replace(/[^a-z0-9-]/gi, '-').toLowerCase().trim();
}

module.exports = {
  getStats,
  findDuplicates,
  findDeadLinks,
  exportDeadLinksCsv,
  cleanMarkdown,
  analyseNoteHeadings,
  splitNote,
  mergeNotes,
  deleteNote,
  validateLinks,
  generateKnowledgeGapReport
};
