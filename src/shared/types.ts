export type FeedCategory = 'news' | 'research' | 'community' | 'exploits' | 'cve' | 'custom'
export type FeedType = 'rss' | 'atom' | 'cve'

export interface FeedSource {
  id: string
  name: string
  url: string
  type: FeedType
  category: FeedCategory
  enabled: boolean
  color: string
}

export interface FeedItem {
  id: string
  sourceId: string
  sourceName: string
  title: string
  url: string
  summary: string
  publishedAt: string
  tags: string[]
  read: boolean
  saved: boolean
  relevanceScore: number
}

export interface FeedState {
  sources: FeedSource[]
  items: FeedItem[]
  lastRefreshed: string | null
  refreshing: boolean
}

export interface RelevanceContext {
  lab?: string
  target?: string
}
