"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Invisible } from "@/components/Bulle";
import { useCardFx } from "@/components/VgFx";
import { RechercheMonstres } from "./Recherche";
import { Faiblesses, SchemaVies } from "./Graphiques";
import {
  cadence, coupMax, court, ELEMENT_FR, entier, iconeElement, tonRang,
  type Compteurs, type Monstre,
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
 * └──────────────────────────────────────────────────────┘
 */

type Onglet = "chercher" | "boss" | "frappeurs";

export function EcranMonstres({ boss, frappeurs, compteurs, total, groupes, agressifs, objetsLaches }: {
  boss: Monstre[]; frappeurs: Monstre[]; compteurs: Compteurs; total: number;
  groupes: { nom: string; n: number }[];
  /** Compté sur le catalogue, jamais écrit : cf. `catalogue.faits()`. */
  agressifs: number;
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

      {/* Ce que le catalogue contient, en chiffres. C'est ce qui donne l'échelle :
          « 142 monstres au-dessus du milliard de PV » dit plus sur le haut niveau
          d'AirFlyff qu'un paragraphe.

          DEUX D'ENTRE EUX SONT MAINTENANT DES BOUTONS. « Ajoutés par AirFlyff » est la
          spécificité du serveur et « se relèvent » son piège le plus coûteux : on
          lisait les deux nombres et il fallait redescendre chercher le filtre qui va
          avec. La tuile EST le filtre. Les trois autres restent des constats — aucun
          filtre du catalogue ne leur correspond, et un bouton qui ne fait rien est
          pire qu'un chiffre. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(146px,1fr))", gap: 9 }}>
        <Chiffre icon="paw" valeur={entier(total)} quoi="monstres" />
        <Chiffre icon="sparkles" valeur={entier(compteurs.maison)} quoi="ajoutés par AirFlyff" ton="var(--purple)"
          onClick={() => filtrer({ provenance: "maison" })} />
        <Chiffre icon="skull" valeur={entier(compteurs.vies)} quoi="se relèvent" ton="var(--red)"
          onClick={() => filtrer({ vies: true })} />
        <Chiffre icon="heart" valeur={entier(compteurs.milliard)} quoi="au-delà du milliard de PV" ton="var(--orange)" />
        <Chiffre icon="flame" valeur={entier(compteurs.rage)} quoi="entrent en rage" ton="var(--gold)" />
        <Chiffre icon="package" valeur={entier(objetsLaches)} quoi="objets nommés dans leur butin" ton="var(--green)" />
      </div>

      <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
        <Invisible enJeu={`Dans le Flyff d'origine, une bonne partie des monstres attend d'être frappée. Ici ils sont ${entier(agressifs)} sur ${entier(total)} à attaquer à vue : l'agressivité a cessé d'être une information de fiche, c'est la règle.`}>
          <span>Plus aucun monstre passif</span>
        </Invisible>
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

          {/* Les regroupements par donjon : de quel contenu on parle quand on voit
              un boss remonter dans le classement. */}
          <div>
            <div className="font-heading" style={{ fontSize: 12.5, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--orange)", margin: "4px 0 9px" }}>
              Les contenus reconstitués
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {groupes.map((g) => (
                <span key={g.nom} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 11px", fontSize: 12.5, display: "inline-flex", gap: 6, alignItems: "center" }}>
                  {g.nom}
                  <b style={{ color: "var(--gold)", fontVariantNumeric: "tabular-nums" }}>{g.n}</b>
                </span>
              ))}
            </div>
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

/** Une tuile de compteur — et un BOUTON quand un filtre du catalogue lui correspond.
 *  Le pointillé sous le libellé est le seul signal qu'on peut cliquer : sans lui, une
 *  tuile cliquable et une tuile morte se ressemblent trait pour trait. */
function Chiffre({ icon, valeur, quoi, ton = "var(--text)", onClick }: {
  icon: Parameters<typeof Icon>[0]["name"]; valeur: string; quoi: string; ton?: string;
  onClick?: () => void;
}) {
  const cadre: React.CSSProperties = {
    background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12,
    padding: "12px 13px", minWidth: 0, textAlign: "left",
  };
  const dedans = (
    <>
      <div className="font-heading" style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 20, fontWeight: 700, color: ton, fontVariantNumeric: "tabular-nums" }}>
        <Icon name={icon} size={15} style={{ color: ton, opacity: 0.85 }} />{valeur}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2, borderBottom: onClick ? "1px dotted var(--orange)" : undefined, display: "inline-block" }}>
        {quoi}
      </div>
    </>
  );
  if (!onClick) return <div className="fx-card" style={cadre}>{dedans}</div>;
  return (
    <button className="fx-card" onClick={onClick} aria-label={`Chercher : ${quoi}`}
      style={{ ...cadre, cursor: "pointer", fontFamily: "inherit", color: "inherit", width: "100%", display: "block" }}>
      {dedans}
    </button>
  );
}

/**
 * Le classement, en tableau et non en cartes : ici on COMPARE des chiffres entre
 * eux, et des cartes côte à côte ne s'alignent pas. Il défile dans son propre
 * conteneur — sinon c'est la page entière qui gagne une barre horizontale sur un
 * téléphone.
 */
function TableauBoss({ lignes, colonne }: { lignes: Monstre[]; colonne: "pvEff" | "degats" }) {
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
  const valeurTriee = (m: Monstre) => (colonne === "pvEff" ? m.pvEff : coupMax(m));
  const maxTrie = Math.max(1, ...lignes.map(valeurTriee));
  const Barre = ({ m, teinte }: { m: Monstre; teinte: string }) => (
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
            <th style={th}>Cadence</th>
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
                <td style={{ ...td, color: "var(--text-muted)" }}>{cadence(m.delai) ?? "—"}</td>
                <td style={{ ...td, textAlign: "left" }}><Faiblesses res={m.res} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
