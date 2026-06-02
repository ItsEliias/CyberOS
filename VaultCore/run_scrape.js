#!/usr/bin/env node
'use strict';
// Standalone scrape runner — no Electron needed
// Usage: node run_scrape.js [outputFolder]

const path = require('path');
const fs   = require('fs');

const OUTPUT = process.argv[2]
  || path.join(require('os').homedir(), 'Documents/Personal/Obsidian/Cyber/Fresh Scrape');

const VAULT_PATH   = path.dirname(OUTPUT);
const SOURCE_NAME  = path.basename(OUTPUT);
const TARGET_URL   = 'https://publish.obsidian.md/addielamarr';

const scraper  = require('./scraper');
const processor = require('./processor');

const config = {
  sourceType:       'obsidian-publish',
  url:              TARGET_URL,
  sourceName:       SOURCE_NAME,
  outputSubfolder:  SOURCE_NAME,
  maxPages:         600,
  requestDelay:     1200,
  conflictStrategy: 'overwrite',
  updateMode:       'full',
  generateCanvas:   false,
};

async function main() {
  fs.mkdirSync(path.join(VAULT_PATH, SOURCE_NAME), { recursive: true });

  console.log(`\nVaultCore Scraper`);
  console.log(`  URL    : ${TARGET_URL}`);
  console.log(`  Output : ${path.join(VAULT_PATH, SOURCE_NAME)}`);
  console.log(`  Max    : ${config.maxPages} pages\n`);

  const stats = await scraper.runScrape(config, VAULT_PATH, (evt) => {
    if (evt.type === 'log') {
      const icon = { success: '✓', error: '✗', warning: '⚠', skipped: '–', info: 'i' }[evt.logType] || '·';
      console.log(`  ${icon} ${evt.message}`);
    } else if (evt.type === 'progress') {
      process.stdout.write(`\r  [${evt.percent}%] ${evt.current}/${evt.total} — ${(evt.currentPage || '').slice(0, 60).padEnd(60)}`);
    }
  });

  console.log(`\n\nDone.`);
  console.log(`  Saved  : ${stats.saved}`);
  console.log(`  Updated: ${stats.updated}`);
  console.log(`  Skipped: ${stats.skipped}`);
  console.log(`  Failed : ${stats.failed}`);
  console.log(`  Output : ${path.join(VAULT_PATH, SOURCE_NAME)}\n`);
}

main().catch(e => { console.error('\nFatal:', e.message); process.exit(1); });
