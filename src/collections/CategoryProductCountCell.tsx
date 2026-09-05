'use client'

import type { DefaultCellComponentProps } from 'payload'

import React, { useEffect, useState } from 'react'

import { ensureCountsLoaded, getDirectCount } from './categoryProductCounts'
import { getChildIds, hasChildren, subscribe } from './categoryTreeToggle'

// Toont het aantal ShopItems in deze categorie. Voor een subcategorie is dit
// simpelweg haar eigen items. Voor een hoofdcategorie is dit haar eigen items
// (zeldzaam, maar toegestaan, elke knoop is een geldig eindpunt) plus alle
// items van haar subcategorieën, recursief opgeteld via de bestaande
// ouder/kind-registry uit categoryTreeToggle.ts.
export const CategoryProductCountCell: React.FC<DefaultCellComponentProps> = (props) => {
  const { rowData } = props
  const id = String(rowData?.id ?? '')
  const [, forceRerender] = useState(0)

  // Herteken bij in-/uitklappen elders in de tabel (registry-wijzigingen).
  useEffect(() => subscribe(() => forceRerender((n) => n + 1)), [])

  // Laad de ShopItems-telling eenmalig (gedeeld over alle rijen) en herteken zodra die binnen is.
  useEffect(() => {
    ensureCountsLoaded().then(() => forceRerender((n) => n + 1))
  }, [])

  function totalFor(categoryId: string): number {
    let total = getDirectCount(Number(categoryId))
    for (const childId of getChildIds(categoryId)) {
      total += totalFor(childId)
    }
    return total
  }

  const count = totalFor(id)
  const isOuderMetProducten = hasChildren(id) && count > getDirectCount(Number(id))

  if (count === 0) {
    return <span style={{ opacity: 0.4 }}>0</span>
  }

  return (
    <span>
      {count} product{count === 1 ? '' : 'en'}
      {isOuderMetProducten && <span style={{ opacity: 0.6 }}> (incl. sub)</span>}
    </span>
  )
}
