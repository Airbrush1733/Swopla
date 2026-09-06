'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { initialenVan } from '@/lib/format'
import type { VoorstelBalansRichting } from '@/lib/matchscore'

import {
  bevestigVoorstel,
  geefAkkoord,
  haalShopVan,
  haalVoorstelState,
  sluitOnderhandeling,
  startVoorstel,
  stuurBericht,
  weigerVoorstel,
  wijzigItemsVanZoeker,
  type ShopItemSamenvatting,
  type VoorstelStateVoorClient,
} from '@/app/(frontend)/items/[id]/ruilvoorstel-actions'

/**
 * Slide-in ruilvoorstel-paneel. EEN component voor beide situaties (besloten door Ralph:
 * "Voor beide situaties wil ik hetzelfde scherm gebruiken"): een nieuw voorstel indienen
 * (rol="zoeker", nog geen initialVoorstelId) en een bestaand voorstel onderhandelen/
 * bevestigen (rol="zoeker" met bestaand voorstel, of rol="aanbieder" die een binnengekomen
 * voorstel bekijkt). Ontwerp volgt Main.dc.html exact (zie mockup, regels 407-792); shop-tab
 * en AI-tip zijn inert in deze eerste versie, zelfde patroon als de "Bewaren"/"Delen"-iconen
 * op de productpagina (zichtbaar, tooltip legt uit dat het nog niet gebouwd is).
 *
 * Live-gevoel via polling elke 6s zolang het paneel open is en er een voorstel bestaat
 * (besloten: geen WebSockets/SSE nodig, "chat is chat", een korte vertraging mag).
 */

const GROEN = 'oklch(58% 0.15 150)'
const TEKST_GRIJS = 'oklch(45% 0.03 150)'
const RAND = 'oklch(89% 0.02 90)'

interface EigenItemMetMatch {
  id: number
  titel: string
  categorie: string
  match: number
}

interface RuilvoorstelPaneelProps {
  rol: 'zoeker' | 'aanbieder'
  viewerId: number
  itemId: number
  itemTitel: string
  tegenpartijNaam: string
  tegenpartijId: number
  eigenSelecteerbareItems?: EigenItemMetMatch[]
  initialVoorstelId: number | null
  variant?: 'zoeker-knop' | 'aanbieder-rij'
  triggerLabel?: string
}

function tijdGeleden(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'Zojuist'
  if (min < 60) return `${min} min geleden`
  const uur = Math.floor(min / 60)
  if (uur < 24) return `${uur} uur geleden`
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function balansLabel(richting: VoorstelBalansRichting, rol: 'zoeker' | 'aanbieder'): string {
  if (richting === 'in_balans') return 'In balans'
  if (richting === 'voordeel_zoeker')
    return rol === 'zoeker' ? 'In jouw voordeel' : 'In hun voordeel'
  return rol === 'aanbieder' ? 'In jouw voordeel' : 'In hun voordeel'
}

const STATUS_LABELS: Record<VoorstelStateVoorClient['status'], string> = {
  bevestigd_door_a: 'Bevestigd door A',
  bevestigd_door_b: 'Bevestigd door B',
  geaccepteerd_wacht_op_bevestiging: 'Wacht op bevestiging',
  geweigerd: 'Geweigerd',
  in_onderhandeling: 'In onderhandeling',
  ingetrokken: 'Gesloten',
  verlopen: 'Verlopen',
  voltooid: 'Voltooid',
  voorgesteld: 'Nieuw voorstel',
}

function statusBadgeKleuren(status: VoorstelStateVoorClient['status']): { bg: string; fg: string } {
  if (status === 'voltooid') return { bg: 'oklch(90% 0.06 150)', fg: 'oklch(30% 0.1 150)' }
  if (status === 'geweigerd' || status === 'ingetrokken' || status === 'verlopen')
    return { bg: 'oklch(93% 0.015 90)', fg: TEKST_GRIJS }
  return { bg: 'oklch(95% 0.06 55)', fg: 'oklch(40% 0.11 55)' }
}

export default function RuilvoorstelPaneel({
  rol,
  viewerId,
  itemId,
  itemTitel,
  tegenpartijNaam,
  tegenpartijId,
  eigenSelecteerbareItems = [],
  initialVoorstelId,
  variant = rol === 'zoeker' ? 'zoeker-knop' : 'aanbieder-rij',
  triggerLabel,
}: RuilvoorstelPaneelProps) {
  const [open, setOpen] = useState(false)
  const [voorstelId, setVoorstelId] = useState<number | null>(initialVoorstelId)
  const [state, setState] = useState<VoorstelStateVoorClient | null>(null)
  const [activeTab, setActiveTab] = useState<'voorstel' | 'shop'>('voorstel')
  const [geselecteerd, setGeselecteerd] = useState<number[]>([])
  const [toelichting, setToelichting] = useState('')
  const [berichtDraft, setBerichtDraft] = useState('')
  const [sluitenConfirmOpen, setSluitenConfirmOpen] = useState(false)
  const [sluitenReden, setSluitenReden] = useState('')
  const [tipOpen, setTipOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [foutmelding, setFoutmelding] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const ververs = useCallback(async () => {
    if (!voorstelId) return
    try {
      const nieuweState = await haalVoorstelState(voorstelId)
      setState(nieuweState)
    } catch {
      // Best-effort polling -- een gemiste ververs-beurt is geen ramp, de volgende poll probeert opnieuw.
    }
  }, [voorstelId])

  useEffect(() => {
    if (!open || !voorstelId) return
    ververs()
    pollRef.current = setInterval(ververs, 6000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [open, voorstelId, ververs])

  const [shopItems, setShopItems] = useState<ShopItemSamenvatting[] | null>(null)
  const [shopLoading, setShopLoading] = useState(false)
  const [gevraagdItemIds, setGevraagdItemIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (activeTab !== 'shop' || shopItems !== null || shopLoading) return
    setShopLoading(true)
    haalShopVan(tegenpartijId, rol === 'zoeker' ? itemId : undefined)
      .then(setShopItems)
      .catch(() => setShopItems([]))
      .finally(() => setShopLoading(false))
  }, [activeTab, shopItems, shopLoading, tegenpartijId, itemId, rol])

  const sortedPool = useMemo(
    () => [...eigenSelecteerbareItems].sort((a, b) => b.match - a.match),
    [eigenSelecteerbareItems],
  )

  const nogNietGekozenPool = useMemo(() => {
    if (!state) return []
    const gekozenIds = new Set(state.itemsVanZoeker.map((i) => i.id))
    return sortedPool.filter((i) => !gekozenIds.has(i.id))
  }, [sortedPool, state])

  async function metFoutafhandeling(fn: () => Promise<void>) {
    setBusy(true)
    setFoutmelding(null)
    try {
      await fn()
    } catch (err) {
      setFoutmelding(err instanceof Error ? err.message : 'Er ging iets mis, probeer het opnieuw.')
    } finally {
      setBusy(false)
    }
  }

  function toggleSelectie(id: number) {
    setGeselecteerd((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  // Een foutmelding hoort bij het tabblad waarop de actie plaatsvond (bv. "vraag toe te voegen"
  // op het Shop-tabblad) -- bij het wisselen van tabblad ruimen we hem daarom meteen op, anders
  // blijft hij zichtbaar op een tabblad waar hij niet bij hoort, en blijft hij ook staan als je
  // wegnavigeert en terugkomt.
  function wisselTab(tab: 'voorstel' | 'shop') {
    setFoutmelding(null)
    setActiveTab(tab)
  }

  async function handleVerstuurVoorstel() {
    await metFoutafhandeling(async () => {
      const nieuwId = await startVoorstel(itemId, geselecteerd, toelichting)
      setVoorstelId(nieuwId)
    })
  }

  async function handleStuurBericht() {
    if (!voorstelId || !berichtDraft.trim()) return
    const tekst = berichtDraft.trim()
    setBerichtDraft('')
    await metFoutafhandeling(async () => {
      await stuurBericht(voorstelId, tekst)
      await ververs()
    })
  }

  async function handleVerwijderItem(id: number) {
    if (!voorstelId || !state) return
    await metFoutafhandeling(async () => {
      await wijzigItemsVanZoeker(
        voorstelId,
        state.itemsVanZoeker.filter((i) => i.id !== id).map((i) => i.id),
      )
      await ververs()
    })
  }

  async function handleVoegToe(id: number) {
    if (!voorstelId || !state) return
    await metFoutafhandeling(async () => {
      await wijzigItemsVanZoeker(voorstelId, [...state.itemsVanZoeker.map((i) => i.id), id])
      await ververs()
    })
  }

  async function handleVraagToevoegen(item: ShopItemSamenvatting) {
    await metFoutafhandeling(async () => {
      // Een voorstel-record kan al bestaan (voorstelId gezet) terwijl er 0 items in staan --
      // bv. net het laatst voorgestelde item verwijderd, zie handleVerwijderItem. Dan is er in
      // de praktijk nog niets om aan te vragen, dus dezelfde melding als "nog geen voorstel".
      if (!voorstelId || !state || state.itemsVanZoeker.length === 0) {
        throw new Error(
          'Stel eerst een voorstel voor via het tabblad "Jouw voorstel", dan kun je hier vragen om iets toe te voegen.',
        )
      }
      await stuurBericht(
        voorstelId,
        `Zou je "${item.titel}" willen toevoegen aan dit ruilvoorstel?`,
      )
      setGevraagdItemIds((prev) => new Set(prev).add(item.id))
      setActiveTab('voorstel')
      await ververs()
    })
  }

  async function handleGeefAkkoord() {
    if (!voorstelId) return
    await metFoutafhandeling(async () => {
      await geefAkkoord(voorstelId)
      await ververs()
    })
  }

  async function handleWeiger() {
    if (!voorstelId) return
    await metFoutafhandeling(async () => {
      await weigerVoorstel(voorstelId)
      await ververs()
    })
  }

  async function handleBevestig() {
    if (!voorstelId) return
    await metFoutafhandeling(async () => {
      await bevestigVoorstel(voorstelId)
      await ververs()
    })
  }

  async function handleSluiten(reden: string) {
    if (!voorstelId) return
    await metFoutafhandeling(async () => {
      await sluitOnderhandeling(voorstelId, reden)
      setSluitenConfirmOpen(false)
      setSluitenReden('')
      await ververs()
    })
  }

  const isTerminaal = state
    ? (['geweigerd', 'ingetrokken', 'verlopen', 'voltooid'] as const).includes(
        state.status as 'geweigerd' | 'ingetrokken' | 'verlopen' | 'voltooid',
      )
    : false
  const wachtOpAnder =
    !!state &&
    state.status === 'geaccepteerd_wacht_op_bevestiging' &&
    state.akkoordDoorId === viewerId
  const magBevestigen =
    !!state &&
    state.status === 'geaccepteerd_wacht_op_bevestiging' &&
    state.akkoordDoorId !== viewerId

  return (
    <>
      {variant === 'zoeker-knop' ? (
        <button
          type="button"
          className="swopla-btn swopla-btn--primair"
          style={{ width: '100%' }}
          onClick={() => setOpen(true)}
        >
          {triggerLabel ?? (voorstelId ? 'Bekijk je ruilvoorstel' : 'Stel een ruil voor')}
        </button>
      ) : (
        <div
          onClick={() => setOpen(true)}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '14px 16px',
            background: '#fff',
            border: `1px solid ${RAND}`,
            borderRadius: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'oklch(55% 0.13 280)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontFamily: 'Fredoka',
                flexShrink: 0,
              }}
            >
              {initialenVan(tegenpartijNaam, tegenpartijNaam)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{tegenpartijNaam}</div>
              <div style={{ fontSize: 11.5, color: TEKST_GRIJS }}>over &quot;{itemTitel}&quot;</div>
            </div>
          </div>
          {triggerLabel && (
            <span
              style={{
                background: GROEN,
                color: '#fff',
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {triggerLabel}
            </span>
          )}
        </div>
      )}

      {open && (
        <div style={{ display: 'contents' }}>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,20,0.4)', zIndex: 50 }}
          />

          <div
            className="rv-paneel"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              height: '100%',
              background: '#fff',
              zIndex: 51,
              boxShadow: '-12px 0 40px rgba(0,0,0,0.18)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Foutmelding als overlay midden over het hele paneel, in plaats van de kleine
                tekst onderin de footer die makkelijk over het hoofd werd gezien. Ligt los van
                activeTab: een tabwissel ruimt hem op via wisselTab hierboven, dus hij verdwijnt
                vanzelf zodra je naar een ander tabblad gaat en komt niet terug bij navigeren. */}
            {foutmelding && (
              <div
                onClick={() => setFoutmelding(null)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(20,20,20,0.55)',
                  zIndex: 60,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 28,
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: '#fff',
                    borderRadius: 14,
                    padding: '24px 26px',
                    maxWidth: 320,
                    textAlign: 'center',
                    boxShadow: '0 16px 44px rgba(0,0,0,0.28)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      lineHeight: 1.5,
                      color: 'oklch(45% 0.16 25)',
                    }}
                  >
                    {foutmelding}
                  </div>
                  <button
                    type="button"
                    onClick={() => setFoutmelding(null)}
                    style={{
                      marginTop: 16,
                      border: 'none',
                      cursor: 'pointer',
                      background: GROEN,
                      color: '#fff',
                      fontWeight: 700,
                      fontFamily: 'Fredoka',
                      fontSize: 12.5,
                      padding: '9px 22px',
                      borderRadius: 20,
                    }}
                  >
                    Oké
                  </button>
                </div>
              </div>
            )}

            {/* Header. flexWrap zodat de statusbadge/Sluiten/kruisje onder de titel vallen
                i.p.v. eroverheen als de titel op smalle schermen meerdere regels beslaat. */}
            <div
              className="rv-paneel__pad"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                rowGap: 10,
                paddingTop: 20,
                paddingBottom: 20,
                borderBottom: `1px solid ${RAND}`,
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: 'linear-gradient(180deg, oklch(94% 0.03 95), oklch(90% 0.03 95))',
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: TEKST_GRIJS,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {rol === 'aanbieder'
                      ? `Ruilvoorstel van ${tegenpartijNaam} voor`
                      : 'Ruilvoorstel voor'}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Fredoka' }}>
                    {itemTitel}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                {state && (
                  <span
                    style={{
                      background: statusBadgeKleuren(state.status).bg,
                      color: statusBadgeKleuren(state.status).fg,
                      padding: '6px 14px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {STATUS_LABELS[state.status]}
                  </span>
                )}
                {rol === 'zoeker' && voorstelId && !isTerminaal && !sluitenConfirmOpen && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span
                      onClick={() => setSluitenConfirmOpen(true)}
                      style={{
                        cursor: 'pointer',
                        color: 'oklch(55% 0.16 25)',
                        fontWeight: 600,
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Sluiten
                    </span>
                    <span
                      title="Sluiten stopt de hele onderhandeling, dit kan niet ongedaan worden gemaakt."
                      style={{ cursor: 'help', color: TEKST_GRIJS, fontSize: 12 }}
                    >
                      ⓘ
                    </span>
                  </div>
                )}
                <div
                  onClick={() => setOpen(false)}
                  style={{
                    cursor: 'pointer',
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    border: `1px solid ${RAND}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  ✕
                </div>
              </div>
            </div>

            {/* Tabbalk */}
            <div
              className="rv-paneel__pad"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 26,
                borderBottom: `1px solid ${RAND}`,
                flexShrink: 0,
              }}
            >
              <div
                onClick={() => wisselTab('voorstel')}
                style={{
                  cursor: 'pointer',
                  padding: '13px 2px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  fontFamily: 'Fredoka',
                  color: activeTab === 'voorstel' ? 'oklch(20% 0.02 150)' : TEKST_GRIJS,
                  borderBottom: `2.5px solid ${activeTab === 'voorstel' ? GROEN : 'transparent'}`,
                }}
              >
                {rol === 'aanbieder' ? `Voorstel van ${tegenpartijNaam}` : 'Jouw voorstel'}
              </div>
              <div
                onClick={() => wisselTab('shop')}
                style={{
                  cursor: 'pointer',
                  padding: '13px 2px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  fontFamily: 'Fredoka',
                  color: activeTab === 'shop' ? 'oklch(20% 0.02 150)' : TEKST_GRIJS,
                  borderBottom: `2.5px solid ${activeTab === 'shop' ? GROEN : 'transparent'}`,
                }}
              >
                Shop van {tegenpartijNaam}
              </div>
            </div>

            {/* Body */}
            <div
              className="rv-paneel__pad"
              style={{
                flex: 1,
                minHeight: 0,
                overflow: 'hidden',
                paddingTop: 24,
                paddingBottom: 24,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {activeTab === 'shop' ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    minHeight: 0,
                    gap: 16,
                  }}
                >
                  <div style={{ flexShrink: 0, fontSize: 12.5, color: TEKST_GRIJS }}>
                    Zie je iets dat je erbij wilt? Klik bij een item op de knop, dan sturen we
                    automatisch een berichtje naar {tegenpartijNaam} in de chat om het toe te
                    voegen.
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
                    {shopLoading || shopItems === null ? (
                      <div style={{ textAlign: 'center', color: TEKST_GRIJS, fontSize: 13 }}>
                        Laden...
                      </div>
                    ) : shopItems.length === 0 ? (
                      <div style={{ textAlign: 'center', color: TEKST_GRIJS, fontSize: 13 }}>
                        {tegenpartijNaam} heeft verder geen items beschikbaar.
                      </div>
                    ) : (
                      <div className="product-grid product-grid--paneel">
                        {shopItems.map((it) => {
                          const gevraagd = gevraagdItemIds.has(it.id)
                          return (
                            <div key={it.id} className="product-kaart product-kaart--statisch">
                              <div className="product-kaart__afbeelding">
                                {it.fotoUrl && <img src={it.fotoUrl} alt={it.titel} />}
                              </div>
                              <div className="product-kaart__body">
                                <div className="product-kaart__titel">{it.titel}</div>
                                <div className="product-kaart__sub">{it.categorie}</div>
                              </div>
                              <div className="paneel-shop-kaart__voettekst">
                                <button
                                  type="button"
                                  className="paneel-shop-kaart__vraag-link"
                                  disabled={busy || gevraagd}
                                  onClick={() => handleVraagToevoegen(it)}
                                >
                                  <svg
                                    width="13"
                                    height="13"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                  >
                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                                  </svg>
                                  {gevraagd ? 'Gevraagd in chat' : 'Vraag toe te voegen'}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : rol === 'zoeker' && !voorstelId ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    minHeight: 0,
                    gap: 14,
                  }}
                >
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Fredoka' }}>
                      Kies wat je aanbiedt
                    </div>
                    <div style={{ fontSize: 12.5, color: TEKST_GRIJS, marginTop: 2 }}>
                      Uit jouw shop, gesorteerd op matchpercentage met dit item.
                    </div>
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {sortedPool.length === 0 && (
                        <div style={{ fontSize: 13, color: TEKST_GRIJS }}>
                          Je hebt nog geen items in je shop om aan te bieden.
                        </div>
                      )}
                      {sortedPool.map((it) => {
                        const geselecteerdItem = geselecteerd.includes(it.id)
                        return (
                          <div
                            key={it.id}
                            onClick={() => toggleSelectie(it.id)}
                            style={{
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '12px 14px',
                              border: geselecteerdItem
                                ? `1.5px solid ${GROEN}`
                                : `1px solid ${RAND}`,
                              background: geselecteerdItem ? 'oklch(97% 0.03 150)' : '#fff',
                              borderRadius: 12,
                            }}
                          >
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 8,
                                background:
                                  'linear-gradient(180deg, oklch(94% 0.03 95), oklch(90% 0.03 95))',
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{it.titel}</div>
                              <div style={{ fontSize: 11, color: TEKST_GRIJS }}>{it.categorie}</div>
                            </div>
                            <span
                              style={{
                                background: GROEN,
                                color: '#fff',
                                padding: '6px 14px',
                                borderRadius: 20,
                                fontSize: 14,
                                fontWeight: 800,
                                flexShrink: 0,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {it.match}%
                            </span>
                            <div
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: geselecteerdItem ? GROEN : '#fff',
                                border: geselecteerdItem ? 'none' : `1.5px solid ${RAND}`,
                                color: geselecteerdItem ? '#fff' : TEKST_GRIJS,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 14,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {geselecteerdItem ? '✓' : '+'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {geselecteerd.length > 0 && (
                    <div
                      style={{
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                        borderTop: `1px solid ${RAND}`,
                        paddingTop: 14,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: GROEN }}>
                        {geselecteerd.length === 1
                          ? '1 product geselecteerd'
                          : `${geselecteerd.length} producten geselecteerd`}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: TEKST_GRIJS }}>
                          Toelichting (optioneel)
                        </div>
                        <textarea
                          value={toelichting}
                          onChange={(e) => setToelichting(e.target.value)}
                          placeholder="Voeg een toelichting toe bij je voorstel..."
                          style={{
                            background: '#fff',
                            border: `1.5px solid ${RAND}`,
                            borderRadius: 10,
                            padding: '11px 14px',
                            fontSize: 13,
                            color: 'oklch(30% 0.03 150)',
                            resize: 'vertical',
                            minHeight: 44,
                            fontFamily: 'inherit',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                    height: '100%',
                    minHeight: 0,
                    overflowY: 'auto',
                    paddingRight: 4,
                  }}
                >
                  {!state ? (
                    <div style={{ textAlign: 'center', color: TEKST_GRIJS, fontSize: 13 }}>
                      Laden...
                    </div>
                  ) : (
                    <>
                      {sluitenConfirmOpen && (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14,
                            background: 'oklch(98% 0.012 25)',
                            border: '1px solid oklch(90% 0.04 25)',
                            borderRadius: 12,
                            padding: 20,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Fredoka' }}>
                              Onderhandeling sluiten?
                            </div>
                            <div style={{ fontSize: 12, color: TEKST_GRIJS, marginTop: 4 }}>
                              Dit kan niet ongedaan worden gemaakt. {tegenpartijNaam} ziet dat je de
                              onderhandeling hebt gesloten.
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: TEKST_GRIJS }}>
                              Reden (optioneel)
                            </div>
                            <textarea
                              value={sluitenReden}
                              onChange={(e) => setSluitenReden(e.target.value)}
                              placeholder="Bijv. ik heb het item inmiddels op een andere manier weggedaan..."
                              style={{
                                background: '#fff',
                                border: `1px solid ${RAND}`,
                                borderRadius: 10,
                                padding: '11px 14px',
                                fontSize: 13,
                                minHeight: 20,
                                fontFamily: 'inherit',
                              }}
                            />
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span
                              onClick={() => setSluitenConfirmOpen(false)}
                              style={{
                                color: TEKST_GRIJS,
                                fontWeight: 600,
                                fontSize: 14,
                                cursor: 'pointer',
                              }}
                            >
                              Annuleren
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                              <span
                                onClick={() => handleSluiten('')}
                                style={{
                                  color: TEKST_GRIJS,
                                  fontWeight: 600,
                                  fontSize: 13.5,
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                }}
                              >
                                Overslaan en sluiten
                              </span>
                              <span
                                onClick={() => handleSluiten(sluitenReden)}
                                style={{
                                  background: 'oklch(55% 0.16 25)',
                                  color: '#fff',
                                  fontWeight: 700,
                                  fontSize: 14,
                                  fontFamily: 'Fredoka',
                                  padding: '11px 22px',
                                  borderRadius: 10,
                                  whiteSpace: 'nowrap',
                                  cursor: 'pointer',
                                }}
                              >
                                Sluiten
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {!sluitenConfirmOpen && state.status === 'ingetrokken' && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            background: 'oklch(96% 0.01 90)',
                            border: `1px solid ${RAND}`,
                            borderRadius: 12,
                            padding: '16px 18px',
                          }}
                        >
                          <div style={{ fontSize: 12.5, color: TEKST_GRIJS, lineHeight: 1.5 }}>
                            {rol === 'zoeker'
                              ? 'Je hebt deze onderhandeling gesloten. Er zijn geen verdere acties meer mogelijk, het gesprek hierboven blijft zichtbaar.'
                              : `${tegenpartijNaam} heeft deze onderhandeling gesloten.`}
                          </div>
                        </div>
                      )}

                      {state.status === 'geweigerd' && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            background: 'oklch(96% 0.01 90)',
                            border: `1px solid ${RAND}`,
                            borderRadius: 12,
                            padding: '16px 18px',
                          }}
                        >
                          <div style={{ fontSize: 12.5, color: TEKST_GRIJS, lineHeight: 1.5 }}>
                            {rol === 'aanbieder'
                              ? 'Je hebt dit voorstel geweigerd.'
                              : `${tegenpartijNaam} heeft dit voorstel geweigerd.`}
                          </div>
                        </div>
                      )}

                      {!sluitenConfirmOpen && (
                        <>
                          {rol === 'zoeker' ? (
                            <>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 10,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: TEKST_GRIJS,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  Jouw voorstel
                                </div>
                              </div>
                              {state.itemsVanZoeker.length === 0 && (
                                <div
                                  style={{ fontSize: 12.5, color: TEKST_GRIJS, lineHeight: 1.5 }}
                                >
                                  Je hebt nog niets geselecteerd. Kies hieronder producten uit je
                                  shop om aan dit voorstel toe te voegen.
                                </div>
                              )}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                {state.itemsVanZoeker.map((g) => (
                                  <div
                                    key={g.id}
                                    style={{
                                      width: 200,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 10,
                                      padding: 9,
                                      border: `1px solid ${RAND}`,
                                      borderRadius: 10,
                                      background: 'oklch(97% 0.03 150)',
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 7,
                                        background:
                                          'linear-gradient(180deg, oklch(94% 0.03 95), oklch(90% 0.03 95))',
                                        flexShrink: 0,
                                      }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div
                                        style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.25 }}
                                      >
                                        {g.titel}
                                      </div>
                                      <div style={{ fontSize: 10, color: TEKST_GRIJS }}>
                                        {g.categorie}
                                      </div>
                                    </div>
                                    {!isTerminaal && (
                                      <span
                                        onClick={() => handleVerwijderItem(g.id)}
                                        title="Verwijderen uit je voorstel"
                                        style={{
                                          cursor: 'pointer',
                                          flexShrink: 0,
                                          fontSize: 13,
                                          color: TEKST_GRIJS,
                                        }}
                                      >
                                        ✕
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {!isTerminaal && nogNietGekozenPool.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: TEKST_GRIJS,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.04em',
                                    }}
                                  >
                                    Meer uit jouw shop toevoegen
                                  </div>
                                  {nogNietGekozenPool.map((p) => (
                                    <div
                                      key={p.id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 8,
                                        padding: '8px 10px',
                                        border: '1px solid oklch(91% 0.015 90)',
                                        borderRadius: 8,
                                      }}
                                    >
                                      <div style={{ minWidth: 0 }}>
                                        <div
                                          style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}
                                        >
                                          {p.titel}
                                        </div>
                                        <div style={{ fontSize: 10, color: TEKST_GRIJS }}>
                                          {p.categorie}
                                        </div>
                                      </div>
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 8,
                                          flexShrink: 0,
                                        }}
                                      >
                                        <span
                                          style={{
                                            background: GROEN,
                                            color: '#fff',
                                            padding: '4px 10px',
                                            borderRadius: 20,
                                            fontSize: 12,
                                            fontWeight: 800,
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          {p.match}%
                                        </span>
                                        <span
                                          onClick={() => handleVoegToe(p.id)}
                                          title="Direct toevoegen aan jouw voorstel"
                                          style={{
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                            width: 22,
                                            height: 22,
                                            borderRadius: '50%',
                                            background: GROEN,
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 15,
                                            fontWeight: 700,
                                            lineHeight: 1,
                                          }}
                                        >
                                          +
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                                flexWrap: 'wrap',
                                background: 'oklch(98% 0.008 90)',
                                border: '1px solid oklch(91% 0.015 90)',
                                borderRadius: 14,
                                padding: 16,
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 10,
                                  minWidth: 0,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: TEKST_GRIJS,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  {tegenpartijNaam} biedt hiervoor
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                  {state.itemsVanZoeker.map((it) => (
                                    <div
                                      key={it.id}
                                      style={{
                                        background: 'oklch(94% 0.03 95)',
                                        color: 'oklch(30% 0.02 90)',
                                        fontWeight: 700,
                                        fontSize: 13,
                                        padding: '9px 16px',
                                        borderRadius: 20,
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {it.titel}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {state.status === 'voorgesteld' ||
                              state.status === 'in_onderhandeling' ? (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    flexShrink: 0,
                                  }}
                                >
                                  <div
                                    onClick={handleWeiger}
                                    style={{
                                      cursor: 'pointer',
                                      background: '#fff',
                                      border: '1.5px solid oklch(80% 0.02 90)',
                                      color: 'oklch(40% 0.03 150)',
                                      fontWeight: 700,
                                      fontSize: 12.5,
                                      fontFamily: 'Fredoka',
                                      padding: '9px 16px',
                                      borderRadius: 20,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    Weigeren
                                  </div>
                                  <div
                                    onClick={handleGeefAkkoord}
                                    style={{
                                      cursor: 'pointer',
                                      background: GROEN,
                                      color: '#fff',
                                      fontWeight: 700,
                                      fontSize: 12.5,
                                      fontFamily: 'Fredoka',
                                      padding: '9px 18px',
                                      borderRadius: 20,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    Akkoord geven
                                  </div>
                                </div>
                              ) : wachtOpAnder ? (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: 'oklch(90% 0.06 150)',
                                    color: 'oklch(30% 0.1 150)',
                                    fontWeight: 700,
                                    fontSize: 12,
                                    padding: '8px 14px',
                                    borderRadius: 20,
                                    flexShrink: 0,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  ✓ Akkoord gegeven
                                </div>
                              ) : null}
                            </div>
                          )}

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 16,
                              flexWrap: 'wrap',
                              background: 'oklch(98% 0.008 90)',
                              border: '1px solid oklch(91% 0.015 90)',
                              borderRadius: 12,
                              padding: '14px 16px',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 150 }}>
                              <div
                                style={{
                                  position: 'relative',
                                  height: 6,
                                  borderRadius: 3,
                                  background:
                                    'linear-gradient(90deg, oklch(82% 0.08 55), oklch(91% 0.02 90) 50%, oklch(78% 0.1 150))',
                                }}
                              >
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: `${state.balans.positiePercentage}%`,
                                    transform: 'translate(-50%,-50%)',
                                    width: 14,
                                    height: 14,
                                    borderRadius: '50%',
                                    background: GROEN,
                                    border: '2.5px solid #fff',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                                  }}
                                />
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  marginTop: 6,
                                  fontSize: 9,
                                  color: 'oklch(48% 0.03 150)',
                                  fontWeight: 600,
                                }}
                              >
                                <span>
                                  {rol === 'aanbieder'
                                    ? 'Jouw voordeel'
                                    : `${tegenpartijNaam}'s voordeel`}
                                </span>
                                <span>
                                  {rol === 'aanbieder'
                                    ? `${tegenpartijNaam}'s voordeel`
                                    : 'Jouw voordeel'}
                                </span>
                              </div>
                              <div
                                style={{
                                  textAlign: 'center',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: 'oklch(20% 0.02 150)',
                                  marginTop: 2,
                                }}
                              >
                                {balansLabel(state.balans.richting, rol)}
                              </div>
                            </div>
                          </div>

                          {tipOpen ? (
                            <div
                              style={{
                                alignSelf: 'flex-start',
                                maxWidth: '70%',
                                background: 'oklch(97% 0.012 150)',
                                border: '1px solid oklch(88% 0.025 150)',
                                borderRadius: 10,
                                padding: '10px 14px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                              }}
                            >
                              <div
                                onClick={() => setTipOpen(false)}
                                style={{
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 14,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    color: TEKST_GRIJS,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.03em',
                                  }}
                                >
                                  ⓘ AI-tip
                                </span>
                                <span style={{ fontSize: 11 }}>▲</span>
                              </div>
                              <div
                                style={{
                                  fontSize: 12.5,
                                  lineHeight: 1.5,
                                  color: 'oklch(30% 0.03 150)',
                                }}
                              >
                                Als de balans niet helemaal gelijk aanvoelt, vraag dan gerust of de
                                ander nog een klein extra item toevoegt.
                              </div>
                              <div style={{ fontSize: 11 }}>
                                <span
                                  title="Nog niet gebouwd"
                                  style={{ cursor: 'help', opacity: 0.7 }}
                                >
                                  Zie meer voorbeelden van AI-onderhandelhulp
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => setTipOpen(true)}
                              style={{
                                cursor: 'pointer',
                                alignSelf: 'flex-start',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <span style={{ fontSize: 12, color: 'oklch(50% 0.03 150)' }}>
                                ⓘ AI-tip: even meedenken over de balans...
                              </span>
                              <span
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  color: GROEN,
                                  fontWeight: 700,
                                  fontSize: 12,
                                }}
                              >
                                bekijk ▼
                              </span>
                            </div>
                          )}

                          <div style={{ height: 1, background: RAND, margin: '6px 0' }} />

                          {state.berichten.map((b) => {
                            const eigen = b.auteurId === viewerId
                            return (
                              <div
                                key={b.id}
                                style={{
                                  alignSelf: eigen ? 'flex-end' : 'flex-start',
                                  maxWidth: '70%',
                                  background: eigen ? GROEN : 'oklch(93% 0.03 95)',
                                  color: eigen ? '#fff' : 'inherit',
                                  borderRadius: eigen ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                  padding: '12px 16px',
                                }}
                              >
                                <div
                                  style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}
                                >
                                  {b.tekst}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: eigen ? 'oklch(88% 0.03 150)' : TEKST_GRIJS,
                                    marginTop: 6,
                                    textAlign: eigen ? 'right' : 'left',
                                  }}
                                >
                                  {tijdGeleden(b.createdAt)}
                                </div>
                              </div>
                            )
                          })}

                          {magBevestigen && (
                            <div
                              style={{
                                alignSelf: 'stretch',
                                background: 'oklch(97% 0.03 150)',
                                border: `1.5px solid ${GROEN}`,
                                borderRadius: 12,
                                padding: '14px 16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                              }}
                            >
                              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Fredoka' }}>
                                {tegenpartijNaam} gaat akkoord met dit voorstel
                              </div>
                              <div style={{ fontSize: 12.5, color: TEKST_GRIJS, lineHeight: 1.5 }}>
                                Bevestig jij de ruil ook, dan is hij definitief.
                              </div>
                              <div
                                onClick={handleBevestig}
                                style={{
                                  cursor: 'pointer',
                                  alignSelf: 'flex-start',
                                  background: GROEN,
                                  color: '#fff',
                                  fontWeight: 700,
                                  fontSize: 13,
                                  fontFamily: 'Fredoka',
                                  padding: '9px 18px',
                                  borderRadius: 10,
                                }}
                              >
                                Bevestigen
                              </div>
                            </div>
                          )}

                          {wachtOpAnder && (
                            <div
                              style={{
                                alignSelf: 'stretch',
                                background: 'oklch(97% 0.03 150)',
                                border: `1.5px solid ${GROEN}`,
                                borderRadius: 12,
                                padding: '14px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                              }}
                            >
                              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                                Jij hebt akkoord gegeven. Zodra {tegenpartijNaam} het ook bevestigt,
                                is de ruil definitief.
                              </div>
                            </div>
                          )}

                          {state.status === 'voltooid' && (
                            <div
                              style={{
                                alignSelf: 'stretch',
                                background: 'oklch(90% 0.06 150)',
                                borderRadius: 12,
                                padding: '14px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  fontFamily: 'Fredoka',
                                  color: 'oklch(30% 0.1 150)',
                                }}
                              >
                                ✓ Ruil bevestigd!
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="rv-paneel__pad"
              style={{
                borderTop: `1px solid ${RAND}`,
                paddingTop: 18,
                paddingBottom: 18,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {activeTab === 'shop' ? null : rol === 'zoeker' && !voorstelId ? (
                geselecteerd.length === 0 ? (
                  <div style={{ textAlign: 'center', fontSize: 13, color: TEKST_GRIJS }}>
                    Selecteer minstens 1 product hierboven om een voorstel te doen
                  </div>
                ) : (
                  <div
                    onClick={busy ? undefined : handleVerstuurVoorstel}
                    style={{
                      cursor: busy ? 'wait' : 'pointer',
                      opacity: busy ? 0.6 : 1,
                      textAlign: 'center',
                      background: GROEN,
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 15,
                      fontFamily: 'Fredoka',
                      padding: 14,
                      borderRadius: 12,
                    }}
                  >
                    Voorstel versturen
                  </div>
                )
              ) : voorstelId && !isTerminaal && !sluitenConfirmOpen ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#fff',
                    border: `1.5px solid ${GROEN}`,
                    borderRadius: 10,
                    padding: '6px 6px 6px 14px',
                  }}
                >
                  <input
                    value={berichtDraft}
                    onChange={(e) => setBerichtDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !busy) handleStuurBericht()
                    }}
                    placeholder="Typ een bericht..."
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      fontSize: 13,
                      padding: '9px 0',
                    }}
                  />
                  <span
                    onClick={busy ? undefined : handleStuurBericht}
                    style={{
                      flexShrink: 0,
                      cursor: busy ? 'wait' : 'pointer',
                      color: GROEN,
                      fontWeight: 700,
                      fontSize: 13,
                      padding: '8px 10px',
                    }}
                  >
                    Versturen
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
