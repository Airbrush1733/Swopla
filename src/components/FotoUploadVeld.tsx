'use client'

import React, { useRef, useState } from 'react'

interface FotoItem {
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

/**
 * Foto-upload als één rustige dropzone (sleep-of-klik), zoals in de mockup -- geen los
 * technisch bestandsveld. Eenmaal gekozen foto's tonen als kleine thumbnails eronder, elk met
 * een verwijderknopje. De echte upload gaat native mee met de form-submit (hidden
 * <input type="file" name="fotos">); toevoegen/verwijderen synchroniseert die input via een
 * DataTransfer, omdat een FileList zelf niet muteerbaar is.
 */
export default function FotoUploadVeld() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [fotos, setFotos] = useState<FotoItem[]>([])
  const [sleepActief, setSleepActief] = useState(false)

  function synchroniseerInput(items: FotoItem[]) {
    const overdracht = new DataTransfer()
    items.forEach((item) => overdracht.items.add(item.file))
    if (inputRef.current) inputRef.current.files = overdracht.files
  }

  function voegToe(bestanden: File[]) {
    const nieuwe = bestanden
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({ file, url: URL.createObjectURL(file) }))
    if (nieuwe.length === 0) return
    const samen = [...fotos, ...nieuwe]
    setFotos(samen)
    synchroniseerInput(samen)
  }

  function verwijder(index: number) {
    URL.revokeObjectURL(fotos[index].url)
    const overig = fotos.filter((_, i) => i !== index)
    setFotos(overig)
    synchroniseerInput(overig)
  }

  return (
    <div>
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
          {fotos.length === 0
            ? 'Sleep foto’s hierheen of klik om te uploaden'
            : 'Sleep meer foto’s hierheen of klik om toe te voegen'}
        </div>
        <div className="foto-dropzone__subtekst">Minimaal 1 foto</div>
      </div>

      {fotos.length > 0 && (
        <div className="foto-upload__thumbs">
          {fotos.map((foto, i) => (
            <div key={foto.url} className="foto-upload__thumb">
              <img src={foto.url} alt="" />
              <button
                type="button"
                className="foto-upload__verwijder"
                onClick={(e) => {
                  e.stopPropagation()
                  verwijder(i)
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
