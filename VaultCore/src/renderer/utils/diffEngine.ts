// VaultCore — Diff Engine
// LCS-based change detection for notes. Classifies as new/updated/unchanged.

import type { NoteDiff } from '../types/vaultcore';

/**
 * Compute the LCS length of two arrays using dynamic programming.
 * Operates on string arrays (lines).
 */
function lcsLength(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  // Use two rows to save memory
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(curr[j - 1], prev[j]);
      }
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }

  return prev[n];
}

/**
 * Compute the change percentage between two content strings.
 * Returns 0 for identical, 100 for entirely different.
 */
export function computeChangePercent(oldContent: string, newContent: string): number {
  if (oldContent === newContent) return 0;
  if (!oldContent || !newContent) return 100;

  const oldLines = oldContent.split('\n').filter((l) => l.trim().length > 0);
  const newLines = newContent.split('\n').filter((l) => l.trim().length > 0);

  if (oldLines.length === 0 && newLines.length === 0) return 0;

  const maxLines = Math.max(oldLines.length, newLines.length);
  const lcs = lcsLength(oldLines, newLines);
  const similarity = lcs / maxLines;
  return Math.round((1 - similarity) * 100);
}

/**
 * Classify a note diff based on existence and content change.
 */
export function classifyNoteDiff(
  path: string,
  oldContent: string | null,
  newContent: string
): NoteDiff {
  if (oldContent === null) {
    return {
      path,
      type: 'new',
      newFirstLine: firstMeaningfulLine(newContent),
      changePercent: 100,
    };
  }

  if (oldContent === newContent) {
    return {
      path,
      type: 'unchanged',
      changePercent: 0,
    };
  }

  const changePercent = computeChangePercent(oldContent, newContent);

  return {
    path,
    type: 'updated',
    oldFirstLine: firstMeaningfulLine(oldContent),
    newFirstLine: firstMeaningfulLine(newContent),
    changePercent,
  };
}

/**
 * Get the first meaningful non-frontmatter line.
 */
function firstMeaningfulLine(content: string): string {
  const lines = content.split('\n');
  let inFrontmatter = false;
  let fmDone = false;

  for (const line of lines) {
    if (!fmDone && line.trim() === '---') {
      inFrontmatter = !inFrontmatter;
      if (!inFrontmatter) fmDone = true;
      continue;
    }
    if (inFrontmatter) continue;
    const trimmed = line.trim();
    if (trimmed.length > 0) return trimmed.slice(0, 120);
  }

  return '';
}

/**
 * Format a change percent as a human-readable string.
 */
export function formatChangePercent(pct: number): string {
  if (pct === 0) return 'unchanged';
  if (pct < 10) return `~${pct}% changed`;
  if (pct < 50) return `${pct}% changed`;
  return `${pct}% changed (major)`;
}
