import type { FeedSource, FeedItem, RelevanceContext, RelevanceTier, AlertRule } from '../shared/types';
export declare function extractCveIds(text: string): string[];
export declare function computeTier(score: number): RelevanceTier;
export declare const DEFAULT_SOURCES: FeedSource[];
export declare function loadSources(): FeedSource[];
export declare function saveSources(sources: FeedSource[]): void;
export declare function loadCache(): FeedItem[];
export declare function saveCache(items: FeedItem[]): void;
export declare function fetchUrl(url: string): Promise<string>;
export declare function probeFeed(url: string): Promise<{
    ok: true;
    type: 'rss' | 'atom';
    title: string;
    count: number;
} | {
    ok: false;
    error: string;
}>;
export declare function fetchAllFeeds(allSources: FeedSource[], existingItems: FeedItem[], ctx: RelevanceContext, maxPerSource?: number): Promise<FeedItem[]>;
export declare function applyAlertRules(items: FeedItem[], rules: AlertRule[]): FeedItem[];
export declare function deduplicateItems(items: FeedItem[]): FeedItem[];
export declare function saveItemToVault(item: FeedItem, vaultPath: string): boolean;
