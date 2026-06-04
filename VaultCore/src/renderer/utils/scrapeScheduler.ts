// VaultCore — Scrape Scheduler
// Interval-based scrape triggers. Survives app restarts by checking last-scrape times on startup.

import type { ScrapingSource, SourceInterval } from '../types/vaultcore';

const INTERVAL_MS: Record<SourceInterval, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  manual: Infinity,
};

/**
 * Returns true if a source is overdue for scraping based on its last scrape time.
 */
export function isOverdue(source: ScrapingSource): boolean {
  if (!source.enabled) return false;
  if (source.interval === 'manual') return false;

  const intervalMs = INTERVAL_MS[source.interval];
  if (!source.lastScrapeAt) return true;

  const lastScrape = new Date(source.lastScrapeAt).getTime();
  const now = Date.now();
  return now - lastScrape >= intervalMs;
}

/**
 * Returns sources that are overdue (should be scraped immediately on startup).
 */
export function getOverdueSources(sources: ScrapingSource[]): ScrapingSource[] {
  return sources.filter(isOverdue);
}

/**
 * Returns the next scheduled run time for a source, or null for manual.
 */
export function getNextRunTime(source: ScrapingSource): Date | null {
  if (!source.enabled || source.interval === 'manual') return null;

  const intervalMs = INTERVAL_MS[source.interval];
  if (!source.lastScrapeAt) return new Date();

  const lastScrape = new Date(source.lastScrapeAt).getTime();
  return new Date(lastScrape + intervalMs);
}

/**
 * Returns a human-readable string for when a source will next run.
 */
export function formatNextRun(source: ScrapingSource): string {
  const next = getNextRunTime(source);
  if (!next) return 'Manual only';

  const now = Date.now();
  const diff = next.getTime() - now;

  if (diff <= 0) return 'Overdue';

  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `in ${days}d ${hours % 24}h`;
  if (hours > 0) return `in ${hours}h ${mins % 60}m`;
  return `in ${mins}m`;
}

/**
 * Format interval label.
 */
export function formatInterval(interval: SourceInterval): string {
  const map: Record<SourceInterval, string> = {
    hourly: 'Every hour',
    daily: 'Every day',
    weekly: 'Every week',
    manual: 'Manual',
  };
  return map[interval];
}

/**
 * Determine scrape priority order for "Scrape All" (overdue first, then by interval).
 */
export function sortByPriority(sources: ScrapingSource[]): ScrapingSource[] {
  return [...sources].sort((a, b) => {
    const aOverdue = isOverdue(a);
    const bOverdue = isOverdue(b);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    const order: SourceInterval[] = ['hourly', 'daily', 'weekly', 'manual'];
    return order.indexOf(a.interval) - order.indexOf(b.interval);
  });
}
