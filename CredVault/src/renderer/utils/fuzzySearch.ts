// CredVault — Fuzzy search with match-character highlighting

export interface FuzzyMatch {
  matched: boolean
  indices: number[]   // indices of matched characters in the haystack
}

/** Returns true if all chars of needle appear in order in haystack */
export function fuzzyMatch(needle: string, haystack: string): FuzzyMatch {
  if (!needle) return { matched: true, indices: [] }
  const n = needle.toLowerCase()
  const h = haystack.toLowerCase()
  const indices: number[] = []
  let ni = 0
  for (let hi = 0; hi < h.length && ni < n.length; hi++) {
    if (h[hi] === n[ni]) {
      indices.push(hi)
      ni++
    }
  }
  return { matched: ni === n.length, indices }
}

/**
 * Splits haystack into segments [{text, highlight}].
 * highlight=true means this segment matched a search character.
 */
export interface Segment {
  text: string
  highlight: boolean
}

export function highlightSegments(haystack: string, indices: number[]): Segment[] {
  const set = new Set(indices)
  const segments: Segment[] = []
  let i = 0
  while (i < haystack.length) {
    if (set.has(i)) {
      // collect consecutive highlighted chars
      let j = i
      while (j < haystack.length && set.has(j)) j++
      segments.push({ text: haystack.slice(i, j), highlight: true })
      i = j
    } else {
      let j = i
      while (j < haystack.length && !set.has(j)) j++
      segments.push({ text: haystack.slice(i, j), highlight: false })
      i = j
    }
  }
  return segments
}
