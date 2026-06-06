export type FeedCategory = 'CVE' | 'Threat Intel' | 'Security News' | 'Malware' | 'Research' | 'Custom' | 'Uptime' | 'GitHub' | 'news' | 'research' | 'community' | 'exploits' | 'cve' | 'custom';
export type FeedType = 'rss' | 'atom' | 'cve' | 'uptime' | 'github';
export type RelevanceTier = 'critical' | 'high' | 'medium' | 'low';
export type ActiveView = 'feed' | 'trends' | 'sources' | 'settings' | 'bookmarks' | 'timeline';
export type ActiveFilter = 'all' | 'high' | 'medium' | 'low' | 'starred' | 'unread';
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export interface AlertRule {
    id: string;
    regex: string;
    label: string;
    severity: AlertSeverity;
    color: string;
}
export interface FeedSource {
    id: string;
    name: string;
    url: string;
    type: FeedType;
    category: FeedCategory;
    enabled: boolean;
    color: string;
    lastFetchAt?: string;
    lastSuccess?: string;
    itemCount: number;
    errorCount: number;
    error?: string;
    pollIntervalMinutes?: number;
    successCount?: number;
    attemptCount?: number;
    consecutiveFailures?: number;
    dailyVolume?: Record<string, number>;
}
export interface CveInfo {
    id: string;
    cvss?: number;
    severity?: RelevanceTier;
}
export interface FeedItem {
    id: string;
    sourceId: string;
    sourceName: string;
    title: string;
    url: string;
    summary: string;
    publishedAt: string;
    fetchedAt: string;
    tags: string[];
    read: boolean;
    saved: boolean;
    relevanceScore: number;
    relevanceTier: RelevanceTier;
    aiSummary?: string[];
    notificationFired?: boolean;
    alertMatches?: {
        ruleId: string;
        label: string;
        severity: AlertSeverity;
        color: string;
    }[];
    cveIds?: string[];
    cveInfo?: CveInfo[];
    duplicateOf?: string;
    duplicateCount?: number;
    bookmarkTags?: string[];
}
export interface FeedState {
    sources: FeedSource[];
    items: FeedItem[];
    lastRefreshed: string | null;
    refreshing: boolean;
}
export interface RelevanceContext {
    lab?: string;
    target?: string;
    ip?: string;
    customKeywords?: string[];
    isAuto?: boolean;
}
export interface DigestConfig {
    enabled: boolean;
    hour: number;
    minute: number;
    sourceIds: string[];
    maxItemsPerSource: number;
}
export interface AppSettings {
    refreshInterval: 15 | 30 | 60 | 0;
    maxItemsPerSource: number;
    autoClearDays: number;
    notificationsEnabled: boolean;
    notificationThreshold: number;
    aiProvider: 'claude' | 'ollama';
    claudeApiKey: string;
    aiAutoSummarise: boolean;
    alertRules?: AlertRule[];
    digestConfig?: DigestConfig;
    readerLightMode?: boolean;
}
