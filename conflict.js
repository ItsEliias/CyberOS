'use strict';
// conflict.js — Conflict detection, hash comparison, diff display, resolution
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function hashContent(content) {
  return crypto.createHash('md5').update(content || '').digest('hex');
}

// ─── Main conflict handler ─────────────────────────────────────────────────────

async function handleConflict(outputPath, newContent, strategy, scrapeState) {
  const exists = fs.existsSync(outputPath);

  if (!exists) {
    // New file — no conflict
    return { action: 'wrote', content: newContent };
  }

  // File exists — check for conflict
  let existingContent;
  try {
    existingContent = fs.readFileSync(outputPath, 'utf8');
  } catch (e) {
    return { action: 'wrote', content: newContent };
  }

  const existingHash = hashContent(existingContent);
  const newHash = hashContent(newContent);

  // If content is identical, no need to write
  if (existingHash === newHash) {
    return { action: 'skip', reason: 'identical' };
  }

  // Check if user has edited the file since last scrape
  const stateEntry = scrapeState ? scrapeState[getUrlFromFile(outputPath, scrapeState)] : null;
  const userEdited = stateEntry && stateEntry.contentHash && stateEntry.contentHash !== existingHash;

  switch (strategy) {
    case 'skip':
      return { action: 'skip', reason: 'conflict-skip' };

    case 'overwrite':
      return { action: 'wrote', content: newContent };

    case 'keep-both': {
      const date = new Date().toISOString().split('T')[0];
      const ext = path.extname(outputPath);
      const base = outputPath.slice(0, -ext.length);
      const newPath = `${base}_updated_${date}${ext}`;
      writeNote(newPath, newContent);
      return { action: 'skip', reason: 'kept-both', alternativePath: newPath };
    }

    case 'ask':
      // Signal conflict for UI to handle
      return {
        action: 'conflict',
        existingContent,
        newContent,
        outputPath,
        userEdited,
        diff: generateDiff(existingContent, newContent)
      };

    default:
      // Default: skip if user edited, overwrite if not
      if (userEdited) {
        return {
          action: 'conflict',
          existingContent,
          newContent,
          outputPath,
          userEdited: true,
          diff: generateDiff(existingContent, newContent)
        };
      }
      return { action: 'wrote', content: newContent };
  }
}

// ─── Diff generation ──────────────────────────────────────────────────────────

function generateDiff(oldContent, newContent) {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const diff = [];

  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i] !== undefined ? oldLines[i] : null;
    const newLine = newLines[i] !== undefined ? newLines[i] : null;

    if (oldLine === null) {
      diff.push({ type: 'add', line: newLine, lineNum: i + 1 });
    } else if (newLine === null) {
      diff.push({ type: 'remove', line: oldLine, lineNum: i + 1 });
    } else if (oldLine !== newLine) {
      diff.push({ type: 'change', oldLine, newLine, lineNum: i + 1 });
    } else {
      diff.push({ type: 'same', line: oldLine, lineNum: i + 1 });
    }
  }

  return diff;
}

function getDiff(fileA, fileB) {
  let contentA = '', contentB = '';
  try { contentA = fileA.startsWith('/') ? fs.readFileSync(fileA, 'utf8') : fileA; } catch (_) { contentA = fileA; }
  try { contentB = fileB.startsWith('/') ? fs.readFileSync(fileB, 'utf8') : fileB; } catch (_) { contentB = fileB; }
  return generateDiff(contentA, contentB);
}

// ─── Conflict resolution ──────────────────────────────────────────────────────

async function resolveConflict(resolution, vaultPath) {
  const { outputPath, action, content, mergedContent } = resolution;

  switch (action) {
    case 'overwrite':
      writeNote(outputPath, content);
      return { success: true, action: 'overwritten' };

    case 'skip':
      return { success: true, action: 'skipped' };

    case 'keep-both': {
      const date = new Date().toISOString().split('T')[0];
      const ext = path.extname(outputPath);
      const base = outputPath.slice(0, -ext.length);
      const newPath = `${base}_updated_${date}${ext}`;
      writeNote(newPath, content);
      return { success: true, action: 'kept-both', alternativePath: newPath };
    }

    case 'merge':
      if (!mergedContent) return { success: false, error: 'No merged content provided' };
      // Backup original first
      backupNote(outputPath);
      writeNote(outputPath, mergedContent);
      return { success: true, action: 'merged' };

    default:
      return { success: false, error: 'Unknown resolution action' };
  }
}

// ─── File helpers ─────────────────────────────────────────────────────────────

function writeNote(filePath, content) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (e) {
    console.error('[conflict] Write error:', e.message);
  }
}

function backupNote(filePath) {
  if (!fs.existsSync(filePath)) return;
  const backupPath = filePath + '.backup_' + Date.now();
  try {
    fs.copyFileSync(filePath, backupPath);
  } catch (e) {
    console.error('[conflict] Backup error:', e.message);
  }
}

function getUrlFromFile(filePath, scrapeState) {
  for (const [url, data] of Object.entries(scrapeState || {})) {
    if (data.filePath === filePath) return url;
  }
  return null;
}

// ─── Log conflict decision ────────────────────────────────────────────────────

function logConflict(vaultPath, logEntry) {
  const logFile = path.join(vaultPath, '_scrape_log.json');
  let log = [];
  try {
    if (fs.existsSync(logFile)) {
      log = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
  } catch (_) {}

  log.push({ ...logEntry, timestamp: new Date().toISOString() });

  // Keep last 1000 entries
  if (log.length > 1000) log = log.slice(-1000);

  try {
    fs.writeFileSync(logFile, JSON.stringify(log, null, 2), 'utf8');
  } catch (_) {}
}

module.exports = {
  handleConflict,
  resolveConflict,
  getDiff,
  generateDiff,
  hashContent,
  logConflict
};
