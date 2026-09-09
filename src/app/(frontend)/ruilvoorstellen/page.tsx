import Link from 'next/link'
import React from 'react'

import RuilvoorstelPaneel from '@/components/RuilvoorstelPaneel'
import { AFGERONDE_STATUSSEN } from '@/lib/ruilvoorstel-status'
import { getPayloadClient, getViewer } from '@/lib/viewer'
import type {
  ProposalMessage,
  ProposalVersion,
  ShopItem,
  TradeProposal,
  User,
} from '@/payload-types'

/**
 * Ruilvoorstellen-overzicht (via Nav, zie concept-samenvatting.md -> "Ruilvoorstellen:
 * overzichtsscherm (besloten, nieuw)"): lijst van al je voorstellen, actief en afgerond, in
 * twee gescheiden groepen. Vervangt de tijdelijke, item-gebonden lijst die tot nu toe alleen
 * op de eigen productpagina stond (zie items/[id]/page.tsx -> "Binnengekomen ruilvoorstellen"),
 * die blijft daar overigens gewoon bestaan als secundaire ingang.
 *
 * Elke rij opent, via RuilvoorstelPaneel (variant="overzicht-rij", nieuw toegevoegd, zie dat
 * bestand), hetzelfde slide-in paneel dat ook vanaf de productpagina gebruikt wordt (besloten
 * door Ralph: "voor beide situaties wil ik hetzelfde scherm gebruiken").
 *
 * "Onbeantwoord" (het lichtgevende bolletje, besloten in concept-samenvatting.md) is hier
 * afgeleid uit bestaande data (auteur van het laatste ProposalMessage != viewer) in plaats van
 * een nieuw "gelezen"-veld op ProposalMessages: elk voorstel heeft altijd minstens 1 bericht,
 * omdat startVoorstel() in ruilvoorstel-actions.ts er bij het aanmaken meteen een stuurt, dus
 * dit is nooit een lege staat om apart te hoeven afhandelen. Impliciete keuze, niet eerder met
 * Ralph besproken: bij "Afgerond" wordt de bolletje-indicator altijd uitgezet, ook als het
 * laatste bericht van de tegenpartij was, een gesloten/voltooid voorstel vraagt geen actie meer.
 */

interface RijData {
  voorstel: TradeProposal
  tegenpartijNaam: string
  tegenpartijId: number
  rol: 'aanbieder' | 'zoeker'
  itemsSamenvatting: string
  laatsteActiviteitISO: string
  onbeantwoord: boolean
}

function itemTitels(items: (number | ShopItem)[] | null | undefined): string[] {
  return (items ?? [])
    .map((i) => (typeof i === 'object' ? i.titel : null))
    .filter((t): t is string => Boolean(t))
}

function kortSamenvatting(titels: string[]): string {
  if (titels.length === 0) return 'nog geen items gekozen'
  if (titels.length <= 2) return titels.join(', ')
  return `${titels.slice(0, 2).join(', ')} +${titels.length - 2}`
}

function naamVan(gebruiker: number | User | null | undefined): { id: number; naam: string } {
  if (!gebruiker || typeof gebruiker === 'number') return { id: gebruiker ?? 0, naam: 'Onbekend' }
  return { id: gebruiker.id, naam: gebruiker.naam ?? gebruiker.email }
}

export default async function RuilvoorstellenOverzichtPage() {
  const viewer = await getViewer()
  if (!viewer) {
    return (
      <div className="pagina pagina--smal">
        <h1>Ruilvoorstellen</h1>
        <p className="pagina__intro">Log in om je ruilvoorstellen te bekijken.</p>
        <Link href="/inloggen" className="swopla-btn swopla-btn--primair">
          Naar inloggen
        </Link>
      </div>
    )
  }

  const viewerId = viewer.id

  const payload = await getPayloadClient()

  const voorstellenRes = await payload.find({
    collection: 'trade-proposals',
    where: {
      or: [{ deelnemer_a: { equals: viewerId } }, { deelnemer_b: { equals: viewerId } }],
    },
    depth: 1,
    limit: 200,
    sort: '-updatedAt',
  })
  const voorstellen = voorstellenRes.docs as TradeProposal[]

  const rijen: RijData[] = await Promise.all(
    voorstellen.map(async (voorstel) => {
      const [versieRes, berichtRes] = await Promise.all([
        payload.find({
          collection: 'proposal-versions',
          where: { voorstel: { equals: voorstel.id } },
          sort: '-createdAt',
          limit: 1,
          depth: 1,
        }),
        payload.find({
          collection: 'proposal-messages',
          where: { voorstel: { equals: voorstel.id } },
          sort: '-createdAt',
          limit: 1,
          depth: 0,
        }),
      ])

      const versie = versieRes.docs[0] as ProposalVersion | undefined
      const laatsteBericht = berichtRes.docs[0] as ProposalMessage | undefined

      const aanbieder = naamVan(voorstel.deelnemer_a)
      const zoeker = naamVan(voorstel.deelnemer_b)
      const rol: 'aanbieder' | 'zoeker' = aanbieder.id === viewerId ? 'aanbieder' : 'zoeker'
      const tegenpartij = rol === 'aanbieder' ? zoeker : aanbieder

      const itemsVanAanbieder = itemTitels(versie?.items_van_a)
      const itemsVanZoeker = itemTitels(versie?.items_van_b)
      const jouwTitels = rol === 'aanbieder' ? itemsVanAanbieder : itemsVanZoeker
      const hunTitels = rol === 'aanbieder' ? itemsVanZoeker : itemsVanAanbieder

      const laatsteAuteurId =
        laatsteBericht && typeof laatsteBericht.auteur === 'object'
          ? laatsteBericht.auteur.id
          : laatsteBericht?.auteur

      return {
        voorstel,
        tegenpartijNaam: tegenpartij.naam,
        tegenpartijId: tegenpartij.id,
        rol,
        itemsSamenvatting: `Jij: ${kortSamenvatting(jouwTitels)} • Zij: ${kortSamenvatting(hunTitels)}`,
        laatsteActiviteitISO: laatsteBericht?.createdAt ?? voorstel.updatedAt,
        onbeantwoord: laatsteAuteurId !== undefined && laatsteAuteurId !== viewerId,
      }
    }),
  )

  const actief = rijen
    .filter((r) => !AFGERONDE_STATUSSEN.has(r.voorstel.status))
    .sort((a, b) => {
      if (a.onbeantwoord !== b.onbeantwoord) return a.onbeantwoord ? -1 : 1
      return new Date(b.laatsteActiviteitISO).getTime() - new Date(a.laatsteActiviteitISO).getTime()
    })
  const afgerond = rijen
    .filter((r) => AFGERONDE_STATUSSEN.has(r.voorstel.status))
    .sort(
      (a, b) =>
        new Date(b.laatsteActiviteitISO).getTime() - new Date(a.laatsteActiviteitISO).getTime(),
    )

  function renderRij(rij: RijData, onbeantwoord: boolean) {
    const contextItemId =
      typeof rij.voorstel.context_item === 'object'
        ? rij.voorstel.context_item.id
        : rij.voorstel.context_item
    const contextItemTitel =
      typeof rij.voorstel.context_item === 'object' ? rij.voorstel.context_item.titel : ''

    return (
      <RuilvoorstelPaneel
        key={rij.voorstel.id}
        rol={rij.rol}
        viewerId={viewerId}
        itemId={contextItemId}
        itemTitel={contextItemTitel}
        tegenpartijNaam={rij.tegenpartijNaam}
        tegenpartijId={rij.tegenpartijId}
        initialVoorstelId={rij.voorstel.id}
        variant="overzicht-rij"
        statusVoorRij={rij.voorstel.status}
        laatsteActiviteitISO={rij.laatsteActiviteitISO}
        onbeantwoord={onbeantwoord}
        itemsSamenvatting={rij.itemsSamenvatting}
      />
    )
  }

  return (
    <div className="pagina">
      <h1>Ruilvoorstellen</h1>

      {rijen.length === 0 ? (
        <p className="pagina__intro">
          Je hebt nog geen ruilvoorstellen. Ga naar <Link href="/">Ontdekken</Link> om iets te
          vinden om voor te ruilen.
        </p>
      ) : (
        <>
          <section style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Actief</h2>
            {actief.length === 0 ? (
              <p style={{ color: 'var(--swopla-grijs)', fontSize: 13.5 }}>
                Geen actieve ruilvoorstellen.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {actief.map((rij) => renderRij(rij, rij.onbeantwoord))}
              </div>
            )}
          </section>

          <section style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Afgerond</h2>
            {afgerond.length === 0 ? (
              <p style={{ color: 'var(--swopla-grijs)', fontSize: 13.5 }}>
                Nog geen afgeronde ruilvoorstellen.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {afgerond.map((rij) => renderRij(rij, false))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
