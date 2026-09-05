'use client'

// Eén keer alle ShopItems ophalen (paginated, alleen het categorie-veld nodig)
// en per categorie-id tellen, in plaats van per rij in de Categories-lijst
// een aparte API-aanroep te doen. Gebruikt door CategoryProductCountCell.tsx.
// Bewust geen persistentie — cache leeft alleen voor deze paginabezoek.

const directCounts = new Map<number, number>()
let loaded = false
let loading: Promise<void> | null = null

async function loadCounts(): Promise<void> {
  const counts = new Map<number, number>()
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const res = await fetch(`/api/shop-items?limit=200&page=${page}&depth=0`, {
      credentials: 'same-origin',
    })
    if (!res.ok) break
    const data = await res.json()
    for (const doc of data.docs ?? []) {
      const raw = doc.categorie
      const catId = typeof raw === 'number' ? raw : Number((raw as { id?: unknown })?.id)
      if (Number.isFinite(catId)) {
        counts.set(catId, (counts.get(catId) ?? 0) + 1)
      }
    }
    hasNextPage = Boolean(data.hasNextPage)
    page += 1
  }

  directCounts.clear()
  counts.forEach((value, key) => directCounts.set(key, value))
  loaded = true
}

export function ensureCountsLoaded(): Promise<void> {
  if (loaded) return Promise.resolve()
  if (!loading) {
    loading = loadCounts().finally(() => {
      loading = null
    })
  }
  return loading
}

export function getDirectCount(categoryId: number): number {
  return directCounts.get(categoryId) ?? 0
}
