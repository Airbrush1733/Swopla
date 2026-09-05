'use client'

import type { DefaultCellComponentProps } from 'payload'

import React, { useEffect, useState } from 'react'

import { getChildCount, subscribe } from './categoryTreeToggle'

// Vervangt de ruwe parent-relatie in deze kolom door het aantal subcategorieën
// De hiërarchie zelf is al zichtbaar via de insprong/pijltjes in de
// naam-kolom, dus de losse parent-waarde voegde daar niets aan toe. Leeg voor
// rijen zonder eigen subcategorieën (waaronder alle subcategorieën zelf).
export const CategoryChildCountCell: React.FC<DefaultCellComponentProps> = (props) => {
  const { rowData } = props
  const id = String(rowData?.id ?? '')
  const [, forceRerender] = useState(0)

  // Herteken zodra de registry (bijgehouden door CategoryNameCell) bijwerkt.
  useEffect(() => subscribe(() => forceRerender((n) => n + 1)), [])

  const count = getChildCount(id)
  if (count === 0) {
    return null
  }

  return (
    <span style={{ opacity: 0.7 }}>
      {count} subcategorie{count === 1 ? '' : 'ën'}
    </span>
  )
}
