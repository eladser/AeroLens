export function levenshtein(a: string, b: string): number {
  const aLen = a.length
  const bLen = b.length

  if (aLen === 0) return bLen
  if (bLen === 0) return aLen

  const matrix: number[][] = []

  for (let i = 0; i <= bLen; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= aLen; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[bLen][aLen]
}

export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase()
  const t = target.toLowerCase()

  if (q === t) return 1
  if (t.startsWith(q)) return 0.9
  if (t.includes(` ${q}`) || t.startsWith(q)) return 0.8
  if (t.includes(q)) return 0.7

  const maxLen = Math.max(q.length, t.length)
  const distance = levenshtein(q, t)
  const similarity = 1 - distance / maxLen
  const firstLetterBonus = q[0] === t[0] ? 0.1 : 0

  return Math.min(1, similarity + firstLetterBonus)
}

export interface FuzzyMatch<T> {
  item: T
  score: number
}

export function fuzzySearch<T>(
  query: string,
  items: T[],
  getSearchText: (item: T) => string,
  options: { threshold?: number; maxResults?: number } = {}
): FuzzyMatch<T>[] {
  const { threshold = 0.3, maxResults = 10 } = options

  if (!query.trim()) return []

  const results: FuzzyMatch<T>[] = []

  for (const item of items) {
    const text = getSearchText(item)
    const score = fuzzyScore(query, text)

    if (score >= threshold) {
      results.push({ item, score })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, maxResults)
}

export function isFuzzyMatch(query: string, target: string, threshold = 0.5): boolean {
  return fuzzyScore(query, target) >= threshold
}

export function findBestMatch(query: string, candidates: string[]): { match: string; score: number } | null {
  let bestMatch: string | null = null
  let bestScore = 0

  for (const candidate of candidates) {
    const score = fuzzyScore(query, candidate)
    if (score > bestScore) {
      bestScore = score
      bestMatch = candidate
    }
  }

  return bestMatch ? { match: bestMatch, score: bestScore } : null
}
