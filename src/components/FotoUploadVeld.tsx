'use client'

import React, { useRef, useState } from 'react'

interface BestaandeFoto {
  id: number
  url: string
}

interface NieuweFoto {
  file: File
  url: string
}

function FotoIcoon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="10" r="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4 17l5.5-5.5a2 2 0 0 1 2.8 0L18 17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export interface FotoUploadVeldProps {
  /**
   * Al bestaande, al opgeslagen foto's (voor het bewerken van een item). Leeg bij "Item
   * toevoegen". Verwijderen van een bestaande foto haalt hem alleen los van dit item (via het
   * meegestuurde `behouden_foto_ids`-veld), het Media-record zelf wordt niet verwijderd, zie
   * de toelichting bij `wijzigItem` in shop/[id]/bewerken/actions.ts.
   */
  bestaandeFotos?: BestaandeFoto[]
}

/**
 * Foto-upload als één rustige dropzone (sleep-of-klik), zoals in de mockup -- geen los
 * technisch bestandsveld. Zowel bestaande (bij bewerken) als nieuw gekozen foto's tonen als
 * kleine thumbnails, elk met een verwijderknopje. Nieuwe foto's gaan native mee met de
 * form-submit (hidden <input type="file" name="fotos">, gesynchroniseerd via DataTransfer,
 * omdat een FileList zelf niet muteerbaar is); welke bestaande foto's zijn blijven staan gaat
 * mee via een los hidden veld (`behouden_foto_ids`), omdat die niet via een file-input kunnen.
 */
export default function FotoUploadVeld({ bestaandeFotos = [] }: FotoUploadVeldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [behouden, setBehouden] = useState<BestaandeFoto[]>(bestaandeFotos)
  const [nieuwe, setNieuwe] = useState<NieuweFoto[]>([])
  const [sleepActief, setSleepActief] = useState(false)

  function synchroniseerInput(items: NieuweFoto[]) {
    const overdracht = new DataTransfer()
    items.forEach((item) => overdracht.items.add(item.file))
    if (inputRef.current) inputRef.current.files = overdracht.files
  }

  function voegToe(bestanden: File[]) {
    const toegevoegd = bestanden
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({ file, url: URL.createObjectURL(file) }))
    if (toegevoegd.length === 0) return
    const samen = [...nieuwe, ...toegevoegd]
    setNieuwe(samen)
    synchroniseerInput(samen)
  }

  function verwijderNieuwe(index: number) {
    URL.revokeObjectURL(nieuwe[index].url)
    const overig = nieuwe.filter((_, i) => i !== index)
    setNieuwe(overig)
    synchroniseerInput(overig)
  }

  function verwijderBestaande(id: number) {
    setBehouden((prev) => prev.filter((f) => f.id !== id))
  }

  const totaalAantal = behouden.length + nieuwe.length

  return (
    <div>
      <input
        type="hidden"
        name="behouden_foto_ids"
        value={behouden.map((f) => f.id).join(',')}
        readOnly
      />
      <input
        ref={inputRef}
        type="file"
        name="fotos"
        accept="image/*"
        multiple
        onChange={(e) => voegToe(Array.from(e.target.files ?? []))}
        style={{ display: 'none' }}
      />

      <div
        className={`foto-dropzone${sleepActief ? ' is-sleep-actief' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setSleepActief(true)
        }}
        onDragLeave={() => setSleepActief(false)}
        onDrop={(e) => {
          e.preventDefault()
          setSleepActief(false)
          voegToe(Array.from(e.dataTransfer.files ?? []))
        }}
      >
        <div className="foto-dropzone__icoon">
          <FotoIcoon />
        </div>
        <div className="foto-dropzone__tekst">
          {totaalAantal === 0
            ? 'Sleep foto’s hierheen of klik om te uploaden'
            : 'Sleep meer foto’s hierheen of klik om toe te voegen'}
        </div>
        <div className="foto-dropzone__subtekst">Minimaal 1 foto</div>
      </div>

      {totaalAantal > 0 && (
        <div className="foto-upload__thumbs">
          {behouden.map((foto) => (
            <div key={`bestaand-${foto.id}`} className="foto-upload__thumb">
              <img src={foto.url} alt="" />
              <button
                type="button"
                className="foto-upload__verwijder"
                onClick={(e) => {
                  e.stopPropagation()
                  verwijderBestaande(foto.id)
                }}
                aria-label="Foto verwijderen"
              >
                ×
              </button>
            </div>
          ))}
          {nieuwe.map((foto, i) => (
            <div key={foto.url} className="foto-upload__thumb">
              <img src={foto.url} alt="" />
              <button
                type="button"
                className="foto-upload__verwijder"
                onClick={(e) => {
                  e.stopPropagation()
                  verwijderNieuwe(i)
                }}
                aria-label="Foto verwijderen"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
