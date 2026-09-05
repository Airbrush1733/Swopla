'use client'

import type { DefaultCellComponentProps } from 'payload'

import { Link } from '@payloadcms/ui'
import React, { useEffect, useRef, useState } from 'react'

import { hasChildren, isExpanded, registerRow, subscribe, toggleExpanded } from './categoryTreeToggle'

// Toont subcategorieën met een insprong + pijltje (hiërarchie in één oogopslag),
// en geeft hoofdcategorieën met subcategorieën een in-/uitklap-knopje.
// Standaard staat alles ingeklapt (alleen hoofdcategorieën zichtbaar).
// Werkt samen met `defaultSort: 'slug'` op de collectie: een subcategorie-slug
// begint altijd met de slug van zijn hoofdcategorie (zie scripts/seedCategories.ts),
// dus alfabetisch sorteren op slug groepeert parent en children vanzelf.
export const CategoryNameCell: React.FC<DefaultCellComponentProps> = (props) => {
  const { cellData, collectionSlug, rowData } = props

  const id = String(rowData?.id ?? '')
  const parentRaw = rowData?.parent as number | Record<string, unknown> | string | undefined
  const parentId =
    parentRaw && typeof parentRaw === 'object'
      ? String((parentRaw as { id?: unknown }).id ?? '')
      : parentRaw
        ? String(parentRaw)
        : null
  const isSubcategorie = Boolean(parentId)

  const wrapperRef = useRef<HTMLSpanElement>(null)
  const [, forceRerender] = useState(0)

  // Meld deze rij aan bij de gedeelde registry, zodat de hoofdcategorie weet
  // dat hij (nog) subcategorieën heeft.
  useEffect(() => {
    return registerRow(id, parentId)
  }, [id, parentId])

  // Herteken deze rij zodra ergens in de tabel in-/uitgeklapt wordt.
  useEffect(() => {
    return subscribe(() => forceRerender((n) => n + 1))
  }, [])

  // Verberg deze rij als hij een subcategorie is van een (nog) niet uitgeklapte hoofdcategorie.
  useEffect(() => {
    const row = wrapperRef.current?.closest('tr')
    if (row) {
      row.style.display = isSubcategorie && parentId && !isExpanded(parentId) ? 'none' : ''
    }
  })

  const toonToggle = !isSubcategorie && hasChildren(id)

  return (
    <span ref={wrapperRef} style={{ alignItems: 'center', display: 'flex', gap: '6px', paddingLeft: isSubcategorie ? '28px' : 0 }}>
      {toonToggle && (
        <button
          aria-label={isExpanded(id) ? 'Subcategorieën inklappen' : 'Subcategorieën uitklappen'}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            toggleExpanded(id)
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: 0, width: '14px' }}
          type="button"
        >
          {isExpanded(id) ? '▼' : '▶'}
        </button>
      )}
      {isSubcategorie && <span style={{ opacity: 0.5 }}>↳</span>}
      <Link href={`/admin/collections/${collectionSlug}/${rowData?.id}`} prefetch={false}>
        {cellData as string}
      </Link>
    </span>
  )
}
