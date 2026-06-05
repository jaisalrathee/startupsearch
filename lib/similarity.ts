import type { Company } from "@/lib/types"

// Sparse feature vector: keys are short strings, values are weights.
type Vec = Map<string, number>

function featurize(c: Company): Vec {
  const v: Vec = new Map()
  for (const code of c.sicCodes) v.set(`sic:${code}`, 3)
  v.set(`region:${c.region}`, 1.5)
  if (c.postcode) v.set(`pc:${c.postcode}`, 1)
  for (const s of c.signals) v.set(`sig:${s}`, 2)
  // Name token features (split + lowercase, drop "ltd" etc)
  const stop = new Set(["ltd", "limited", "the", "and", "of", "uk", "co"])
  for (const token of c.name.toLowerCase().split(/[^a-z0-9]+/g)) {
    if (token.length > 2 && !stop.has(token)) {
      v.set(`tok:${token}`, (v.get(`tok:${token}`) ?? 0) + 0.5)
    }
  }
  return v
}

function magnitude(v: Vec): number {
  let sum = 0
  for (const w of v.values()) sum += w * w
  return Math.sqrt(sum)
}

function cosine(a: Vec, b: Vec): number {
  // iterate the smaller of the two
  let dot = 0
  const [small, large] = a.size <= b.size ? [a, b] : [b, a]
  for (const [k, w] of small) {
    const o = large.get(k)
    if (o) dot += w * o
  }
  const denom = magnitude(a) * magnitude(b)
  return denom === 0 ? 0 : dot / denom
}

export function rankSimilar(target: Company, pool: Company[], k = 5): Company[] {
  const tv = featurize(target)
  const scored = pool
    .filter((c) => c.number !== target.number)
    .map((c) => ({ c, score: cosine(tv, featurize(c)) }))
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, k).map((s) => s.c)
}
