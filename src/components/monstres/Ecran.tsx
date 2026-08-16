"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Bulle, Invisible } from "@/components/Bulle";
import { useCardFx } from "@/components/VgFx";
import { RechercheMonstres } from "./Recherche";
import { ContenusBoss, Faiblesses, ProvenanceMonstres, SchemaVies } from "./Graphiques";
import {
  cadence, cadenceCourte, coupMax, court, ELEMENT_FR, entier, iconeElement, tonRang,
  type Compteurs, type LigneClassement,
} from "./vocabulaire";

/**
 * LES TROIS FAÇONS D'ARRIVER SUR UN MONSTRE.
 *
 * On cherche par nom quand on sait déjà qui on affronte. On lit le classement
 * quand on prépare un run et qu'on veut savoir à quoi on s'attaque. On regarde
 * les frappeurs quand on est tank et que la question est « est-ce que je tiens ».
 *
 * Le classement et les frappeurs sont calculés côté serveur et passés en
 * propriétés : ils ne bougent jamais, les recalculer à chaque affichage aurait
 * relu 1 124 lignes pour un résultat identique.
 *
 * ┌───────────── CE QUI A QUITTÉ CETTE PAGE ─────────────┐
 * │ L'avertissement sur le butin ordinaire coiffait la    │
 * │ page entière pour expliquer l'absence des TAUX de     │
 * │ butin. On ne montre plus de taux : l'explication      │
 * │ n'avait plus d'objet, elle est partie avec eux.       │
 * │ Le paragraphe de six lignes sur les vies est devenu   │
 * │ un schéma (`SchemaVies`) — même fait, deux blocs      │
 * │ dessinés, zéro phrase.                                │
 * │ La rangée de six tuiles est devenue un schéma         │
 * │ d'emboîtement (`ProvenanceMonstres`) plus quatre      │
 * │ constats : les deux tuiles qui étaient des FILTRES ne │
 * │ se distinguaient pas des quatre qui n'étaient que des │
 * │ chiffres, et le fait qui les relie — tout monstre à   │
 * │ plusieurs vies est du contenu AirFlyff — ne se lisait │
 * │ nulle part.                                           │
 * └──────────────────────────────────────────────────────┘
 */

type Onglet = "chercher" | "boss" | "frappeurs";

export function EcranMonstres({ boss, frappeurs, compteurs, total, agressifs, viesMaison, objetsLaches }: {
  boss: LigneClassement[]; frappeurs: LigneClassement[]; compteurs: Compteurs; total: number;
  /* `groupes` n'est plus reçu : les contenus se comptent sur les lignes affichées
     (`ContenusBoss`), et les comptes du catalogue entier posés sous un tableau de 94
     lignes se lisaient comme les comptes de ce tableau. Un tableau de quinze couples
     nom/nombre en moins dans le payload de la page, aussi. */
  /** Compté sur le catalogue, jamais écrit : cf. `catalogue.faits()`. */
  agressifs: number;
  /** Combien de ceux qui se relèvent portent la marque du serveur. Le schéma d'en-tête
   *  s'en sert pour choisir sa phrase — cf. `ProvenanceMonstres`. */
  viesMaison: number;
  /** Combien d'objets distincts le relevé rattache à un monstre — la mesure du pont
   *  vers le catalogue d'objets, comptée elle aussi. */
  objetsLaches: number;
}) {
  useCardFx();
  const [onglet, setOnglet] = useState<Onglet>("chercher");
  /**
   * LE FILTRE DEMANDÉ PAR UNE TUILE.
   *
   * `numero` ne sert qu'à faire remonter la recherche : sans lui, cliquer deux fois
   * sur la même tuile ne rejouerait rien, et cliquer sur une autre laisserait l'état
   * précédent. C'est plus court qu'une synchronisation par effet, et il n'y a aucun
   * état de recherche à préserver — on vient justement de le remplacer.
   */
  const [demande, setDemande] = useState<{ provenance?: "maison" | "base"; vies?: boolean; numero: number }>({ numero: 0 });
  const roi = boss[0];

  const filtrer = (d: { provenance?: "maison" | "base"; vies?: boolean }) => {
    setDemande({ ...d, numero: demande.numero + 1 });
    setOnglet("chercher");
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>

      {/* D'OÙ VIENT CE CATALOGUE — un schéma, et les deux seuls filtres qui comptent.
          Les six tuiles d'avant se ressemblaient trait pour trait, alors que deux
          d'entre elles étaient des BOUTONS et les quatre autres des constats. Pire :
          le fait qui relie les deux boutons — les 94 monstres qui se relèvent sont
          TOUS du contenu AirFlyff — ne se lisait nulle part, et une rangée de
          pastilles ne sait pas dire « celui-là est dedans ». Trois barres à la même
          échelle le disent d'un regard, et les deux dernières restent des filtres. */}
      <ProvenanceMonstres
        total={total} maison={compteurs.maison} vies={compteurs.vies} viesMaison={viesMaison}
        surMaison={() => filtrer({ provenance: "maison" })}
        surVies={() => filtrer({ vies: true })} />

      {/* Ce qui reste en tuiles est ce à quoi AUCUN filtre du catalogue ne correspond
          — un bouton qui ne fait rien est pire qu'un chiffre. « Attaquent à vue » a
          rejoint la rangée : c'était une phrase flottante sous les tuiles alors que
          c'est le même genre de fait, un compte sur le catalogue. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 9 }}>
        <Chiffre icon="paw" valeur={entier(agressifs)} ton="var(--gold)" quoi={
          <Invisible enJeu={`Dans le Flyff d'origine, une bonne partie des monstres attend d'être frappée. Ici ils sont ${entier(agressifs)} sur ${entier(total)} : l'agressivité a cessé d'être une information de fiche, c'est la règle.`}>
            <span>attaquent à vue</span>
          </Invisible>
        } />
        <Chiffre icon="heart" valeur={entier(compteurs.milliard)} quoi="au-delà du milliard de PV" ton="var(--orange)" />
        <Chiffre icon="flame" valeur={entier(compteurs.rage)} quoi="entrent en rage" ton="var(--red)" />
        {/* ┌──── « OBJETS » DISAIT 106, LE CATALOGUE EN MONTRE 108 ────┐
               Les deux comptes sont JUSTES, et c'est bien le problème :
               ils ne comptent pas la même chose et aucun ne le disait.
               Ici on compte des NOMS (`indexButin().size`) ; le filtre
               « Que lâche un monstre » de /objets compte des LIGNES DE
               CATALOGUE. Recalculé sur les données : deux noms sont
               portés par deux fiches chacun — « Pierre des Héros »
               (ids 10245 et 18170) et « Épée Entanalle » (18145 au
               niveau 30, 18146 au niveau 1). 106 noms, 108 fiches.
               Un joueur qui lit 106 puis clique le filtre voit 108
               cartes ; le mot « noms » suffit à lever la surprise, et
               la bulle dit le reste pour qui la cherche.               */}
        <Chiffre icon="package" valeur={entier(objetsLaches)} ton="var(--green)" quoi={
          <Bulle quoi={<>On compte des <b>noms</b>. Le catalogue en montre deux de plus : « Pierre des Héros » et « Épée Entanalle » existent chacune en deux versions, à deux niveaux requis.</>}>
            <span>noms d&apos;objets dans leur butin</span>
          </Bulle>
        } />
      </div>

      <div className="vg-subtabs" style={{ margin: 0 }}>
        {([["chercher", "Chercher"], ["boss", "Les boss par PV à sortir"], ["frappeurs", "Ceux qui frappent le plus fort"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setOnglet(k)} className={`vg-subtab ${onglet === k ? "active" : ""}`}>{l}</button>
        ))}
      </div>

      {onglet === "chercher" && (
        <RechercheMonstres key={demande.numero}
          departProvenance={demande.provenance ?? ""} departVies={demande.vies ?? false} />
      )}

      {onglet === "boss" && (
        <div style={{ display: "grid", gap: 14 }}>
          {/* Le schéma remplace le paragraphe : deux rangées à la même échelle
              disent en une image ce que six lignes disaient en mots. Il est dessiné
              sur le PREMIER du classement — le cas extrême du catalogue, et celui
              qui fait le plus croire à un bug quand le boss remonte à plein. */}
          {roi && (
            <div className="glass-card" style={{ padding: "14px 16px", display: "grid", gap: 9 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <Link href={`/monstres/${roi.id}`} className="font-heading" style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", textDecoration: "none" }}>
                  {roi.nom}
                </Link>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{roi.groupe}</span>
              </div>
              <SchemaVies pv={roi.pv} vies={roi.vies ?? 1} pvEff={roi.pvEff} />
            </div>
          )}

          <TableauBoss lignes={boss} colonne="pvEff" />

          {/* De quel contenu viennent CES lignes-là — le même comptage que le
              tableau, par construction. Les pastilles qui étaient ici portaient les
              comptes du catalogue entier sous un tableau qui n'en montre que 94 :
              « Chambres Secrètes 16 » sous sept lignes de Chambres Secrètes. */}
          <div>
            <div className="font-heading" style={{ fontSize: 12.5, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--orange)", margin: "4px 0 9px" }}>
              Les contenus reconstitués
            </div>
            <ContenusBoss lignes={boss} />
          </div>
        </div>
      )}

      {onglet === "frappeurs" && (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
            <Invisible enJeu="Un monstre ordinaire frappe toutes les 3 à 6 secondes. Les boss des Chambres Secrètes sont à 250–375 ms, et certains boss du Chaos à 101 ms : le même chiffre par coup n'est plus le même combat.">
              <span>Les {frappeurs.length} plus violents du catalogue, par coup</span>
            </Invisible>
          </div>
          <TableauBoss lignes={frappeurs} colonne="degats" />
        </div>
      )}
    </div>
  );
}

/**
 * Une tuile de compteur — un CONSTAT, et rien d'autre.
 *
 * Elle savait aussi être un bouton, du temps où « ajoutés par AirFlyff » et « se
 * relèvent » vivaient dans cette rangée. Ces deux-là sont passés dans le schéma
 * d'emboîtement, qui dit en plus comment ils se contiennent : la tuile n'a plus
 * besoin de faire deux métiers, et une tuile qui ne peut pas être cliquable ne
 * risque plus de ressembler à une tuile qui l'est.
 */
function Chiffre({ icon, valeur, quoi, ton = "var(--text)" }: {
  icon: Parameters<typeof Icon>[0]["name"]; valeur: string;
  /** Du JSX accepté : c'est ce qui permet d'y poser une bulle « hors jeu ». */
  quoi: React.ReactNode;
  ton?: string;
}) {
  return (
    <div className="fx-card" style={{
      background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12,
      padding: "12px 13px", minWidth: 0, textAlign: "left",
    }}>
      <div className="font-heading" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 20, fontWeight: 700, color: ton, fontVariantNumeric: "tabular-nums" }}>
        <Icon name={icon} size={15} style={{ color: ton, opacity: 0.85 }} />{valeur}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{quoi}</div>
    </div>
  );
}

/**
 * Le classement, en tableau et non en cartes : ici on COMPARE des chiffres entre
 * eux, et des cartes côte à côte ne s'alignent pas. Il défile dans son propre
 * conteneur — sinon c'est la page entière qui gagne une barre horizontale sur un
 * téléphone.
 */
function TableauBoss({ lignes, colonne }: { lignes: LigneClassement[]; colonne: "pvEff" | "degats" }) {
  const th: React.CSSProperties = {
    textAlign: "right", padding: "8px 10px", fontSize: 11, textTransform: "uppercase",
    letterSpacing: ".6px", color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    textAlign: "right", padding: "8px 10px", fontSize: 12.5, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
  };
  /* La barre du classement. « 30 Md » et « 24 Md » se lisent comme deux nombres
     voisins ; deux barres montrent tout de suite le rapport de force. Elle ne
     s'ajoute QUE dans la colonne qui trie — une barre dans une colonne qu'on ne
     classe pas invite à comparer des lignes qui ne sont pas rangées pour ça.

     Une seule teinte, celle que la colonne emploie déjà pour son chiffre : c'est
     la LONGUEUR qui porte la grandeur, jamais la couleur. Et `aria-hidden`, parce
     que le nombre exact est juste au-dessus. */
  const valeurTriee = (m: LigneClassement) => (colonne === "pvEff" ? m.pvEff : coupMax(m));
  const maxTrie = Math.max(1, ...lignes.map(valeurTriee));
  const Barre = ({ m, teinte }: { m: LigneClassement; teinte: string }) => (
    <span aria-hidden="true" style={{ display: "block", height: 3, marginTop: 5, borderRadius: 2, background: "color-mix(in srgb, var(--border) 70%, transparent)" }}>
      {/* Plancher à 1,5 % : sans lui, une ligne 6 000 fois plus faible que la
          première n'a plus de barre du tout, et l'absence se lit comme un trou
          dans les données plutôt que comme « très peu ». */}
      <span style={{ display: "block", height: "100%", borderRadius: 2, background: teinte, width: `${Math.max(1.5, (valeurTriee(m) / maxTrie) * 100)}%` }} />
    </span>
  );
  return (
    <div className="glass-card" style={{ padding: 0, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th style={{ ...th, textAlign: "left", width: 34 }}>#</th>
            <th style={{ ...th, textAlign: "left" }}>Monstre</th>
            <th style={th}>Niv.</th>
            <th style={th}>
              {colonne === "pvEff" ? (
                /* La pastille est sur l'EN-TÊTE de la colonne, à l'endroit exact
                   où le chiffre se lit — et une seule fois pour 94 lignes, sinon
                   plus rien n'est marqué. */
                <Invisible enJeu="La barre de vie du jeu n'annonce que les PV d'une vie. Multiplie par le nombre de vies : c'est ce que cette colonne fait.">
                  <span>PV à sortir</span>
                </Invisible>
              ) : "PV"}
            </th>
            <th style={th}>Vies</th>
            <th style={th}>Dégâts / coup</th>
            <th style={th}>
              {/* L'UNITÉ EST EXPLIQUÉE UNE FOIS, EN TÊTE DE COLONNE, et non répétée
                  quatre-vingt-quatorze fois en toutes lettres. « 1 coup toutes les
                  3,5 s » sur chaque ligne, c'était près de cinq cents mots pour une
                  donnée qui tient en deux signes. */}
              <Bulle quoi="« 3,5 s » est l'intervalle entre deux coups ; « 9,9/s » un nombre de coups par seconde, pour les quelques boss qui frappent plus d'une fois dans la seconde. Le détail en clair est dans l'infobulle de chaque ligne.">
                <span>Cadence</span>
              </Bulle>
            </th>
            <th style={{ ...th, textAlign: "left" }}>Élément</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((m, i) => {
            const ic = iconeElement(m.elem);
            return (
              <tr key={m.id} style={{ borderTop: i ? "1px solid color-mix(in srgb, var(--border) 50%, transparent)" : "none" }}>
                <td style={{ ...td, textAlign: "left", color: "var(--text-muted)" }}>{i + 1}</td>
                <td style={{ ...td, textAlign: "left", whiteSpace: "normal", minWidth: 200 }}>
                  <Link href={`/monstres/${m.id}`} style={{ color: "var(--text)", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {ic && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ic} alt="" title={ELEMENT_FR[m.elem!] ?? ""} width={15} height={15} style={{ objectFit: "contain", flexShrink: 0 }} />
                    )}
                    {m.nom}
                  </Link>
                  {m.groupe && <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)" }}>{m.groupe}</span>}
                </td>
                <td style={{ ...td, color: tonRang(m.rang) }}>{m.niv ?? "—"}</td>
                <td style={{ ...td, fontWeight: 700, minWidth: 96, color: colonne === "pvEff" ? "var(--orange)" : "var(--text)" }}>
                  {court(colonne === "pvEff" ? m.pvEff : m.pv)}
                  {colonne === "pvEff" && <Barre m={m} teinte="var(--orange)" />}
                </td>
                <td style={{ ...td, color: (m.vies ?? 0) > 1 ? "var(--red)" : "var(--text-muted)", fontWeight: (m.vies ?? 0) > 1 ? 700 : 400 }}>
                  {m.vies ?? "1"}
                </td>
                <td style={{ ...td, fontWeight: colonne === "degats" ? 700 : 400, minWidth: colonne === "degats" ? 96 : undefined, color: colonne === "degats" ? "var(--red)" : "var(--text)" }}>
                  {coupMax(m) ? court(coupMax(m)) : "—"}
                  {colonne === "degats" && <Barre m={m} teinte="var(--red)" />}
                </td>
                <td style={{ ...td, color: "var(--text-muted)" }} title={cadence(m.delai) ?? undefined}>{cadenceCourte(m.delai) ?? "—"}</td>
                <td style={{ ...td, textAlign: "left" }}><Faiblesses res={m.res} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
