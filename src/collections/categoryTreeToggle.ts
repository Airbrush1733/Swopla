'use client'

// Kleine, in-memory (client-side, per paginabezoek) registry die bijhoudt:
// - welke hoofdcategorieën zijn uitgeklapt (standaard: geen, dus alles dicht)
// - hoeveel subcategorieën een categorie daadwerkelijk heeft (ontdekt terwijl
//   de rijen van de lijst renderen, want een los tabelcelletje kent alleen
//   zijn eigen rij, niet de rest van de tabel)
// Gebruikt door CategoryNameCell.tsx (insprong/pijltje/toggle) en
// CategoryChildCountCell.tsx (aantal subcategorieën i.p.v. de ruwe parent-waarde).
// Bewust geen persistentie (localStorage). Reset bij een pagina-refresh,
// dat is prima voor dit soort simpele weergavegemak.

type Id = string

const expandedIds = new Set<Id>()
const childCounts = new Map<Id, number>()
const childIdsByParent = new Map<Id, Set<Id>>()
const listeners = new Set<() => void>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

export function registerRow(id: Id, parentId: Id | null): () => void {
  if (parentId) {
    childCounts.set(parentId, (childCounts.get(parentId) ?? 0) + 1)
    const ids = childIdsByParent.get(parentId) ?? new Set<Id>()
    ids.add(id)
    childIdsByParent.set(parentId, ids)
    notify()
  }
  return () => {
    if (parentId) {
      const next = (childCounts.get(parentId) ?? 1) - 1
      if (next <= 0) {
        childCounts.delete(parentId)
      } else {
        childCounts.set(parentId, next)
      }
      const ids = childIdsByParent.get(parentId)
      if (ids) {
        ids.delete(id)
        if (ids.size === 0) childIdsByParent.delete(parentId)
      }
      notify()
    }
  }
}

// Directe kind-id's van een categorie (niet recursief), gebruikt door
// CategoryProductCountCell.tsx om het aantal producten van subcategorieën
// mee te tellen bij een hoofdcategorie.
export function getChildIds(id: Id): Id[] {
  return Array.from(childIdsByParent.get(id) ?? [])
}

export function getChildCount(id: Id): number {
  return childCounts.get(id) ?? 0
}

export function hasChildren(id: Id): boolean {
  return getChildCount(id) > 0
}

export function isExpanded(id: Id): boolean {
  return expandedIds.has(id)
}

export function toggleExpanded(id: Id): void {
  if (expandedIds.has(id)) {
    expandedIds.delete(id)
  } else {
    expandedIds.add(id)
  }
  notify()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
