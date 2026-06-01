'use strict';
// sources/pdf.js — PDF text extraction and Obsidian note generation
const path = require('path');
const fs = require('fs');

async function scrape(config, vaultPath, log, ctrl) {
  const filePaths = config.filePaths || (config.filePath ? [config.filePath] : []);
  if (filePaths.length === 0) { log('error', 'No PDF files selected'); return []; }

  log('info', `Processing ${filePaths.length} PDF file(s)`);
  const pages = [];
  let pdfParse;

  try {
    pdfParse = require('pdf-parse');
  } catch (e) {
    log('error', 'pdf-parse not available. Run: npm install pdf-parse');
    return [];
  }

  for (const filePath of filePaths) {
    if (ctrl.abort()) break;
    if (!fs.existsSync(filePath)) {
      log('error', `File not found: ${filePath}`);
      continue;
    }

    try {
      log('info', `Parsing: ${path.basename(filePath)}`, filePath);
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer, {
        // Preserve page structure
        pagerender: renderPage
      });

      const title = path.basename(filePath, '.pdf');
      const pageCount = data.numpages || 0;
      const content = processPdfText(data.text, title);

      pages.push({
        url: `file://${filePath}`,
        title,
        content,
        sourceType: 'pdf',
        meta: {
          source_file: filePath,
          page_count: pageCount,
          imported_date: new Date().toISOString()
        }
      });

      log('success', `Extracted: ${title} (${pageCount} pages)`, filePath);
    } catch (e) {
      log('error', `Failed to parse ${path.basename(filePath)}: ${e.message}`, filePath);
    }
  }

  return pages;
}

function renderPage(pageData) {
  // Custom page renderer to preserve structure
  let render_options = {
    normalizeWhitespace: false,
    disableCombineTextItems: false
  };
  return pageData.getTextContent(render_options).then(function (textContent) {
    let lastY, text = '';
    for (const item of textContent.items) {
      if (lastY === item.transform[5] || !lastY) {
        text += item.str;
      } else {
        text += '\n' + item.str;
      }
      lastY = item.transform[5];
    }
    return text;
  });
}

function processPdfText(rawText, title) {
  if (!rawText) return '';

  const lines = rawText.split('\n');
  const result = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Detect potential headings (short lines followed by content, all caps or title case)
    const trimmed = line.trim();
    if (!trimmed) {
      result.push('');
      continue;
    }

    // Detect heading-like lines
    if (looksLikeHeading(trimmed, lines, i)) {
      result.push(`## ${trimmed}`);
      result.push('');
      continue;
    }

    // Detect code-like content
    if (looksLikeCode(trimmed)) {
      if (!inCodeBlock) {
        result.push('```');
        inCodeBlock = true;
      }
      result.push(trimmed);
      continue;
    } else if (inCodeBlock) {
      result.push('```');
      inCodeBlock = false;
    }

    result.push(trimmed);
  }

  if (inCodeBlock) result.push('```');

  // Clean up excessive blank lines
  const cleaned = result.join('\n').replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

function looksLikeHeading(line, lines, idx) {
  // Short line (under 80 chars), not ending with punctuation typical of body text
  if (line.length > 80) return false;
  if (line.endsWith('.') || line.endsWith(',') || line.endsWith(';')) return false;

  // Preceded and followed by blank lines or start/end
  const prevEmpty = idx === 0 || !lines[idx - 1].trim();
  const nextExists = idx < lines.length - 1 && lines[idx + 1].trim().length > 0;

  return prevEmpty && nextExists;
}

function looksLikeCode(line) {
  // Lines that look like commands or code
  return /^\$\s|^>\s|^#\s*\w|^\s{4}|\t/.test(line) &&
    !line.startsWith('#');
}

module.exports = { scrape };
