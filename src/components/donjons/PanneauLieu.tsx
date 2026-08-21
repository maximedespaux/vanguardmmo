"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/components/Icon";
import { Faiblesses } from "@/components/monstres/Graphiques";
import {
  cadence, cadenceCourte, coupMax, coupMin, ELEMENT_FR, entier, iconeElement, parSeconde,
} from "@/components/monstres/vocabulaire";
import { NomObjet } from "@/components/objets/NomObjet";
import { pvCourt, TON_RANG } from "./donneesClient";
import { LienMonstre } from "./LienMonstre";
import type { Lieu } from "./HorsTeleporteur";
import COMBATS from "@/data/lieux-monstres.json";

/**
 * LE PANNEAU D'UN LIEU — le plan en grand, qui vit là, et ce que ça frappe.
 *
 * Demande de Maxime, mot pour mot : « Sur la map donjons sur la partie "Fly Coins"
 * prévoir une zone cliquable pour voir le plan et les monstres et les informations
 * dégâts des monstres etc… ». Les huit tuiles portaient la carte au format vignette,
 * un compte d'espèces et le nom du plus coriace : de quoi RECONNAÎTRE un lieu, pas
 * de quoi décider d'y entrer. Ce panneau porte les trois choses demandées, dans
 * l'ordre où elles ont été demandées.
 *
 * ┌──── POURQUOI CE FICHIER EST À PART, ET CHARGÉ À LA DEMANDE ────┐
 * │ /donjons est la page la plus lourde du site. Le relevé de       │
 * │ combat des 102 créatures de ces huit lieux pèse 19,6 Ko, et il  │
 * │ ne sert QU'ICI. Ce module est donc importé par `next/dynamic`   │
 * │ (`ssr: false`) : ni le HTML du serveur ni le paquet de départ   │
 * │ ne le portent, le navigateur ne le télécharge qu'au premier     │
 * │ panneau ouvert, et jamais si personne n'en ouvre.               │
 * │ Corollaire : ne JAMAIS importer ce fichier autrement que par    │
 * │ `dynamic()`, sinon les 19,6 Ko repartent dans le paquet commun. │
 * └────────────────────────────────────────────────────────────────┘
 *
 * AUCUN CHIFFRE EN DUR, y compris dans les phrases : les comptes, les extrêmes et
 * jusqu'à « le plus gros n'est pas le plus dangereux » se recalculent sur le
 * relevé. Ce qui ne se calcule pas ne s'écrit pas.
 *
 * CE QUI N'EST PAS À L'ÉCRAN : l'expérience, la penya et les taux de chute. Ils ne
 * sont même pas dans le relevé — `scripts/extraire-lieux.mjs` ne les y met pas.
 * Le prix du ticket, lui, est un COÛT et il reste, sur la tuile.
 */

type Fiche = {
  nom: string; niv: number; rang: string; pv: number; vies?: number;
  atkMin: number | null; atkMax: number | null; delai: number | null;
  elem: string | null; res: Record<string, number>; poses: number;
  /* Les deux mécaniques de fin de combat, absentes quand la créature n'en a pas.
     Un tableau et non un seuil unique : une créature d'ici en porte DEUX. */
  rage?: { pv: number; x: number }[];
  soigne?: { pv: number; rend: number }[];
};
type Releve = { especes: Fiche[]; experience?: Fiche[] };

const TABLE = (COMBATS as { lieux: Record<string, Releve> }).lieux;
const NUM = { fontVariantNumeric: "tabular-nums" } as const;
const fr = (n: number) => n.toLocaleString("fr-FR");
/** « le plan d'Île Corail », pas « le plan de Île Corail » : deux des huit noms
 *  relevés commencent par une voyelle, et un lecteur d'écran prononce ce qui est
 *  écrit. Même règle que dans `HorsTeleporteur`. */
const de = (nom: string) => (/^[aeiouyàâäéèêëîïôöûüh]/i.test(nom) ? `d'${nom}` : `de ${nom}`);

const th: React.CSSProperties = {
  textAlign: "right", padding: "7px 9px", fontSize: 10.5, textTransform: "uppercase",
  letterSpacing: ".5px", color: "var(--text-muted)", fontWeight: 700, whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  textAlign: "right", padding: "7px 9px", fontSize: 12, whiteSpace: "nowrap", ...NUM,
};

export default function PanneauLieu({ lieu, onFermer }: { lieu: Lieu; onFermer: () => void }) {
  const releve: Releve | undefined = TABLE[lieu.clef];
  const fermer = useRef<HTMLButtonElement>(null);

  /* ÉCHAP FERME. Le voile se ferme déjà au clic, mais un panneau qui remplit
     l'écran sur un téléphone ne laisse pas toujours un bord de voile à viser. Le
     bouton prend le focus à l'ouverture : sans lui, la tabulation repartait du
     haut du document, derrière le voile. */
  useEffect(() => {
    fermer.current?.focus();
    const surTouche = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer]);

  const especes = releve?.especes ?? [];
  const experience = releve?.experience ?? [];
  const maxSeconde = Math.max(1, ...especes.map(parSeconde), ...experience.map(parSeconde));
  /* Le plus gros sac de points de vie et le plus fort cogneur ne sont pas toujours
     le même : quand ils diffèrent, ça se dit — c'est la phrase qui empêche de
     préparer un run sur la mauvaise barre. Quand ils coïncident, elle disparaît
     d'elle-même au lieu d'énoncer une évidence. */
  const cogneur = especes.length ? especes.reduce((a, m) => (parSeconde(m) > parSeconde(a) ? m : a)) : null;
  const plusGros = especes.length ? especes.reduce((a, m) => (m.pv > a.pv ? m : a)) : null;
  const menaceAilleurs = Boolean(cogneur && plusGros && cogneur.nom !== plusGros.nom);
  /* Comptés sur les DEUX tableaux du panneau, parce que la légende les couvre tous
     les deux — et recomptés à chaque lieu, jamais écrits. */
  const toutes = [...especes, ...experience];
  const nbRage = toutes.filter((m) => m.rage?.length).length;
  const nbSoin = toutes.filter((m) => m.soigne?.length).length;

  /**
   * ┌──── LE VOILE SORT DE LA PAGE, ET C'EST UNE CORRECTION MESURÉE ────┐
   * │ `position: fixed` ne se cale sur la fenêtre que si AUCUN ancêtre  │
   * │ ne porte de `transform` — sinon c'est cet ancêtre qui devient le  │
   * │ repère. Or `globals.css` fait entrer chaque bloc de page avec     │
   * │ `@keyframes vgfade` (`.vg-page>*>*`), qui applique un             │
   * │ `translateY(16px)`. Relevé dans le navigateur, pas supposé : le   │
   * │ voile mesurait 2 038 px de haut pour une fenêtre de 1 000, et son │
   * │ bord haut était à −110 px. Traduction à l'écran : le panneau      │
   * │ s'ouvrait quelque part au milieu de la page au lieu de se poser   │
   * │ devant, et il fallait faire défiler pour le trouver.              │
   * │ Le portail le pose sur `document.body`, hors de tout `transform`. │
   * │ Il reste enfant de ce composant côté React, donc le contexte des  │
   * │ identifiants de monstres continue de le traverser — c'est lui qui │
   * │ fait des cent deux noms des liens vers /monstres.                 │
   * │ C'est le piège déjà payé sur ce site : une modale enfermée dans   │
   * │ sa carte.                                                          │
   * └────────────────────────────────────────────────────────────────────┘
   * `document.body` est atteignable sans garde : ce module est chargé par
   * `dynamic(..., { ssr: false })`, il ne s'exécute jamais côté serveur.
   */
  return createPortal(
    <div
      onClick={onFermer}
      role="presentation"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex",
        alignItems: "center", justifyContent: "center", zIndex: 100, padding: "88px 20px 20px",
      }}
    >
      {/* La marge haute vaut la barre de navigation (68 px) plus un souffle : sans
          elle, un panneau assez haut pour remplir l'écran passe SOUS la barre et
          perd son titre. Piège déjà payé sur la fiche de donjon. */}
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${lieu.nom} : le plan, les créatures et leurs dégâts`}
        style={{
          background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14,
          padding: 20, maxWidth: 860, width: "100%", maxHeight: "calc(100vh - 108px)",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 className="font-heading" style={{ fontSize: 20, margin: 0 }}>{lieu.nom}</h2>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)", ...NUM }}>
              {lieu.especes} espèce{lieu.especes > 1 ? "s" : ""} · {fr(lieu.poses)} emplacement{lieu.poses > 1 ? "s" : ""}
              {" · "}niveau {lieu.nivMin === lieu.nivMax ? lieu.nivMin : `${lieu.nivMin} à ${lieu.nivMax}`}
            </div>
          </div>
          <button
            ref={fermer}
            type="button"
            onClick={onFermer}
            aria-label="Fermer le panneau"
            style={{
              flexShrink: 0, cursor: "pointer", fontFamily: "inherit", lineHeight: 0,
              padding: 7, borderRadius: 8, background: "var(--bg-3)",
              border: "1px solid var(--border)", color: "var(--text)",
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* ─── 1. LE PLAN ─── */}
        <Titre icon="map">Le plan</Titre>
        {/* LA HAUTEUR DU PLAN EST BRIDÉE, ET C'EST CE QUI REND LE PANNEAU LISIBLE.
            Ces cartes sont en 4/3 : à 820 px de large, le plan faisait 615 px de haut
            et remplissait l'écran à lui seul — on ouvrait « le plan ET les créatures »
            et il fallait faire défiler une page entière avant de voir la première
            créature. `maxHeight` avec une largeur automatique le réduit SANS LE
            RECADRER : le cartouche du bas reste dans l'image, et c'est lui qui prouve
            que cette carte est bien celle de ce lieu.

            Le commentaire est ICI et pas entre les attributs de l'image : un
            commentaire posé dans une liste d'attributs JSX a déjà mis six pages de ce
            site en 500. */}
        <figure style={{ margin: "0 0 16px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lieu.carte}
            alt={`Le plan ${de(lieu.nom)}, tel qu'il sort du client — le cartouche imprimé dit « ${lieu.cartouche} »`}
            style={{ display: "block", maxWidth: "100%", maxHeight: "min(48vh, 420px)", width: "auto", margin: "0 auto", borderRadius: 10, border: "1px solid var(--border)" }}
          />
          {/* Le cartouche est une CITATION de l'image, recopié tel quel : c'est la
              seule preuve que cette carte est bien celle de ce lieu — les noms de
              FICHIERS du client mentent (« town_oasis » affiche « Tour Oubliée »). */}
          <figcaption style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            Le plan tel qu&apos;il sort du client. Le cartouche imprimé dessus dit «&nbsp;{lieu.cartouche}&nbsp;».
          </figcaption>
        </figure>

        {/* ─── 2 et 3. QUI VIT LÀ, ET CE QUE ÇA FRAPPE ─── */}
        {especes.length > 0 ? (
          <>
            <Titre icon="skull" apres={`${especes.length} espèce${especes.length > 1 ? "s" : ""}`}>
              Ce qui vit ici, et ce que ça frappe
            </Titre>
            {menaceAilleurs && (
              <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text-muted)", margin: "0 0 10px" }}>
                <Icon name="info" size={13} style={{ marginRight: 6, color: "var(--gold)" }} />
                Le plus gros n&apos;est pas le plus dangereux : <b style={{ color: "var(--text)" }}>{plusGros!.nom}</b>{" "}
                porte {pvCourt(plusGros!.pv)} PV, mais c&apos;est <b style={{ color: "var(--text)" }}>{cogneur!.nom}</b>{" "}
                {/* LA CADENCE SE DIT EN FRANÇAIS, PAS EN MILLISECONDES. La phrase
                    écrivait « toutes les 3 000 ms » à dix centimètres d'une colonne
                    qui écrit « 3 s » pour le même monstre : deux unités pour un seul
                    fait, et la brute du client en prime. `cadence()` existe pour ça
                    et sert déjà dans l'infobulle de cette colonne — elle bascule
                    seule en coups par seconde quand le monstre frappe plus d'une
                    fois par seconde, ce qu'aucune de ces cent deux créatures ne fait
                    aujourd'hui mais que le relevé peut apporter demain. */}
                qui sort le plus de dégâts — {entier(coupMax(cogneur!))} par coup,{" "}
                {cadence(cogneur!.delai)}, soit {entier(parSeconde(cogneur!))} par seconde.
              </p>
            )}
            <Tableau lignes={especes} maxSeconde={maxSeconde} />
          </>
        ) : (
          /* Un lieu sans relevé de combat ne doit pas afficher un tableau vide : le
             panneau garde alors son plan et le dit en une ligne. Le cas n'existe
             pas aujourd'hui — les huit lieux sont peuplés, c'est même la condition
             pour qu'ils entrent dans la liste — mais un relevé refait demain peut
             en vider un. */
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "0 0 16px" }}>
            Le relevé de combat de ce lieu n&apos;a pas été extrait.
          </p>
        )}

        {/* LES MONSTRES D'EXPÉRIENCE, NOMMÉS POUR CE QU'ILS SONT. Ils ne comptent
            pas dans les niveaux de la zone — Azria s'arrête à 115, ces trois-là
            sont à 190, 200 et 210 — mais ils sont posés sur cette carte et un
            joueur de leur niveau vient précisément pour eux. Les fondre dans le
            tableau du dessus ferait croire à une tranche de progression ; les
            taire ferait manquer la seule raison d'y monter à 190. */}
        {experience.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Titre icon="flame" apres={`${experience.length}`}>
              Posés là pour l&apos;expérience, hors progression de la zone
            </Titre>
            <Tableau lignes={experience} maxSeconde={maxSeconde} />
          </div>
        )}

        {/* ─── CE QUE LES QUÊTES ENVOIENT CHERCHER ICI ─── */}
        {lieu.objets.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Titre icon="gift" apres={`${lieu.objets.length}`}>À chercher ici</Titre>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {lieu.objets.map((o) => (
                <span
                  key={o.nom}
                  style={{
                    /* Marge SYMÉTRIQUE, et c'est mesuré : sur les 46 objets que
                       ces lieux envoient chercher, UN SEUL porte une icône dans le
                       relevé. La marge gauche réduite des étiquettes à icône
                       décalait donc 45 noms sur 46. Quand l'icône est là, la
                       gouttière du `flex` lui fait sa place. */
                    fontSize: 12, padding: "4px 10px", borderRadius: 7,
                    background: "var(--bg-3)", border: "1px solid var(--border)",
                    display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0,
                  }}
                >
                  {/* `NomObjet` mène à la fiche ET à la provenance, et il ne charge
                      cette dernière qu'à l'ouverture de sa bulle : vingt objets sur
                      un panneau, c'est vingt requêtes évitées à l'ouverture. */}
                  <NomObjet nom={o.nom} icone={o.icone} taille={18} />
                </span>
              ))}
            </div>
          </div>
        )}

        {/* LA LÉGENDE N'EXISTE QUE SI LES PASTILLES EXISTENT, ET ELLE SE COMPTE.
            Une flamme et des étincelles ne se devinent pas ; un mot les nomme une
            fois pour tout le tableau, au lieu de vingt-deux fois dedans. Quatre des
            huit lieux n'ont ni rage ni soin — la ligne y disparaît d'elle-même
            plutôt que d'annoncer une mécanique absente. */}
        {(nbRage > 0 || nbSoin > 0) && (
          <p style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.7, margin: "12px 0 0", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "3px 10px" }}>
            {nbRage > 0 && (
              <span>
                <Icon name="flame" size={11} style={{ color: "var(--red)", marginRight: 4 }} />
                <b style={{ color: "var(--text)", ...NUM }}>{nbRage}</b> entre{nbRage > 1 ? "nt" : ""} en rage sous ce pourcentage de PV : les dégâts sont multipliés à partir de là.
              </span>
            )}
            {nbSoin > 0 && (
              <span>
                <Icon name="sparkles" size={11} style={{ color: "var(--green)", marginRight: 4 }} />
                <b style={{ color: "var(--text)", ...NUM }}>{nbSoin}</b> se soigne{nbSoin > 1 ? "nt" : ""} une fois arrivé{nbSoin > 1 ? "s" : ""} à ce seuil — le franchir d&apos;un seul coup l&apos;empêche.
              </span>
            )}
          </p>
        )}

        <p style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.6, margin: "16px 0 0" }}>
          Dégâts et cadence <b>lus</b> dans la table des monstres du client, jamais déduits. Les
          faiblesses se lisent dans les cinq colonnes de résistance, pas dans la roue élémentaire —
          plusieurs monstres de ce jeu résistent à trois éléments à la fois. Ce que le serveur ajoute
          en combat, lui, n&apos;est dans aucun fichier.
        </p>

        <button
          type="button"
          onClick={onFermer}
          className="font-heading"
          style={{
            marginTop: 16, width: "100%", padding: 10, borderRadius: 8, background: "var(--bg-3)",
            border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer", fontSize: 13,
          }}
        >
          Fermer
        </button>
      </div>
    </div>,
    document.body
  );
}

/**
 * LE TABLEAU DES CRÉATURES — trié du plus dangereux au moins, pas par niveau.
 *
 * Le niveau est déjà porté deux fois ailleurs (l'échelle du bloc et l'entête de ce
 * panneau) ; ce que ce tableau seul peut dire, c'est QUI FAIT MAL. L'ordre est donc
 * celui des dégâts par seconde, et il est fixé à l'extraction.
 *
 * Le tableau défile DANS SON PROPRE CADRE : sinon c'est le panneau entier qui gagne
 * une barre horizontale sur un téléphone, et le plan part avec.
 */
function Tableau({ lignes, maxSeconde }: { lignes: Fiche[]; maxSeconde: number }) {
  /* La colonne des vies ne s'affiche que si une créature en a plusieurs. Aucune
     n'en a dans ces huit lieux aujourd'hui — une colonne de « 1 » sur vingt-sept
     lignes n'apprend rien —, mais le jour où une zone en gagne une, elle apparaît
     sans qu'on y touche. */
  const aVies = lignes.some((m) => (m.vies ?? 1) > 1);
  return (
    <div style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 660 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th style={{ ...th, textAlign: "left" }}>Créature</th>
            <th style={th}>Niv.</th>
            <th style={th}>PV</th>
            {aVies && <th style={th}>Vies</th>}
            <th style={th} title="Les deux bornes du coup, telles que le client les donne">Par coup</th>
            <th style={th} title="Le délai entre deux coups, lu dans le client">Cadence</th>
            <th style={th} title="Le coup le plus fort divisé par le délai : c'est ce qui compare un gros coup lent et un petit coup rapide">Par seconde</th>
            <th style={{ ...th, textAlign: "left" }}>Élément</th>
            <th style={th} title="Le nombre de points de réapparition sur la carte, pas le nombre de monstres : c'est le serveur qui décide du rythme">Emplac.</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((m, i) => {
            const ic = iconeElement(m.elem);
            const ps = parSeconde(m);
            const bas = coupMin(m);
            const haut = coupMax(m);
            return (
              <tr key={`${m.nom}|${m.niv}|${m.pv}`} style={{ borderTop: i ? "1px solid color-mix(in srgb, var(--border) 45%, transparent)" : "none" }}>
                <td style={{ ...td, textAlign: "left", whiteSpace: "normal", minWidth: 170, fontWeight: 600 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {ic && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ic} alt="" title={`Élément : ${ELEMENT_FR[m.elem!] ?? m.elem}`} width={15} height={15}
                        style={{ objectFit: "contain", flexShrink: 0 }} />
                    )}
                    {/* LE NOM MÈNE À SA FICHE — les monstres appartiennent à
                        /monstres, ce panneau ne garde d'eux que ce qui fait décider
                        d'entrer. `LienMonstre` résout l'identifiant sur la clé
                        nom + niveau + PV, posée côté serveur. */}
                    <LienMonstre nom={m.nom} niv={m.niv} pv={m.pv} couleur={TON_RANG[m.rang] ?? "var(--text)"} />
                  </span>
                  {/* LE RANG NE S'ÉCRIT QUE QUAND IL N'EST PAS « NORMAL ». Il
                      s'écrivait sur chaque ligne, et l'Île Corail affichait alors
                      vingt-sept fois le mot « NORMAL » — vingt-sept mots pour dire
                      que rien ne sort du lot. « Normal » est le rang par défaut du
                      jeu : le nommer n'apprend rien, tandis que « capitaine » ou
                      « boss » change ce qu'on emmène.
                      Le rang reste porté par la COULEUR du nom dans les deux cas,
                      comme partout ailleurs sur le site.
                      Le rang sous le nom et non à côté : sur un téléphone la colonne
                      des créatures est la seule qui se replie, et « capitaine »
                      collé au nom faisait passer chaque ligne sur trois. */}
                  {m.rang !== "normal" && (
                    <span style={{ display: "block", fontSize: 10.5, fontWeight: 400, textTransform: "uppercase", letterSpacing: ".5px", color: TON_RANG[m.rang] ?? "var(--gold)" }}>
                      {m.rang}
                    </span>
                  )}
                  <Seuils m={m} />
                </td>
                <td style={{ ...td, color: "var(--text-muted)" }}>{m.niv}</td>
                <td style={{ ...td, fontWeight: 700, color: "var(--orange)" }}>{pvCourt(m.pv)}</td>
                {aVies && (
                  <td style={{ ...td, color: (m.vies ?? 1) > 1 ? "var(--red)" : "var(--text-muted)", fontWeight: (m.vies ?? 1) > 1 ? 700 : 400 }}>
                    {m.vies ?? 1}
                  </td>
                )}
                <td style={td}>
                  {/* LES DEUX BORNES, PAS SEULEMENT LA HAUTE : sur ces créatures
                      l'écart va de 5 % (361–380) à 456 % (1 000–5 567). Annoncer la
                      seule borne haute ferait préparer un run sur un coup qui ne
                      tombe presque jamais ; n'annoncer que la basse ferait mourir. */}
                  {haut ? (bas === haut ? entier(haut) : `${entier(bas)}–${entier(haut)}`) : "—"}
                </td>
                <td style={{ ...td, color: "var(--text-muted)" }} title={cadence(m.delai) ?? undefined}>
                  {cadenceCourte(m.delai) ?? "—"}
                </td>
                <td style={{ ...td, fontWeight: 700, color: "var(--red)", minWidth: 88 }}>
                  {ps ? entier(ps) : "—"}
                  <Barre part={ps / maxSeconde} />
                </td>
                <td style={{ ...td, textAlign: "left", whiteSpace: "normal" }}>
                  <Faiblesses res={m.res} />
                </td>
                <td style={{ ...td, color: "var(--text-muted)" }}>{fr(m.poses)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * CE QUI ARRIVE DANS LES DERNIERS POUR-CENT — la rage et le soin.
 *
 * ┌──── POURQUOI ILS SONT LÀ, ALORS QUE LE RESTE DU CLIENT NE L'EST PAS ────┐
 * │ La règle de /donjons est écrite dans LienMonstre.tsx : la page ne garde │
 * │ des monstres que « ce qui fait DÉCIDER d'entrer — les PV à sortir, la   │
 * │ faiblesse, UNE RAGE SCRIPTÉE », et pointe la fiche pour tout le reste.  │
 * │ La fiche de donjon l'applique déjà (« Rage sous X % de PV : ×N          │
 * │ dégâts ») ; ce panneau, lui, n'en disait rien — sur 33 créatures qui    │
 * │ entrent en rage et 6 qui se soignent, comptées sur le relevé.           │
 * │ Ce sont les deux seuls faits de ce tableau qui changent l'ORDRE des     │
 * │ gestes et pas seulement leur quantité : garder les soins pour le seuil  │
 * │ de rage, et franchir le seuil de soin d'un seul coup pour qu'il ne      │
 * │ parte pas. Une colonne de plus aurait coûté 60 px sur une table qui     │
 * │ défile déjà à 375 px — ils tiennent donc sous le nom, là où le rang     │
 * │ s'écrit, et seulement quand ils existent.                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * L'ICÔNE ET LA TEINTE SONT CELLES DE LA MAISON, pas des nouvelles : flamme rouge
 * pour la rage, étincelles vertes pour le soin — les mêmes que la fiche de monstre
 * et que la recherche. Le SEUIL s'écrit, parce qu'aucune icône ne dit « 10 % » ;
 * le multiplicateur et le montant rendu passent dans l'infobulle, comme la cadence
 * complète juste à côté.
 *
 * UN SEUIL NE S'ÉCRIT QU'UNE FOIS, MÊME QUAND LE RELEVÉ LE PORTE DEUX FOIS.
 * Le Capitaine Merel de l'Île Corail a DEUX rages au même seuil — 20 % ×2 et
 * 20 % ×2,5. Comme la pastille n'écrit que le seuil (le multiplicateur est dans
 * l'infobulle), elles se rendaient en « 20 % 20 % » : deux étiquettes que rien
 * ne distingue à l'œil, et React signalait deux enfants de même clé, donc un
 * rendu où l'une des deux peut disparaître sans prévenir. On regroupe donc par
 * seuil : une pastille par valeur de PV, et l'infobulle nomme TOUS les
 * multiplicateurs de ce seuil, du plus faible au plus fort. Rien du relevé n'est
 * jeté — la fiche du monstre, elle, garde une ligne par entrée parce qu'elle
 * écrit le multiplicateur à côté et qu'elles s'y distinguent.
 *
 * La clé porte le rang dans la liste et non le seuil : deux entrées de même
 * valeur ne peuvent plus se télescoper, quelle que soit la prochaine fouille.
 */
function Seuils({ m }: { m: Fiche }) {
  /** Un groupe par seuil de PV, dans l'ordre où le relevé les donne. */
  function parSeuil<T extends { pv: number }>(liste: T[]): { pv: number; tout: T[] }[] {
    const out: { pv: number; tout: T[] }[] = [];
    for (const e of liste) {
      const deja = out.find((g) => g.pv === e.pv);
      if (deja) deja.tout.push(e);
      else out.push({ pv: e.pv, tout: [e] });
    }
    return out;
  }
  const rage = parSeuil(m.rage ?? []);
  const soigne = parSeuil(m.soigne ?? []);
  if (!rage.length && !soigne.length) return null;
  /** « ×2 » ; « ×2 et ×2,5 » ; « ×2, ×2,5 et ×3 » — jamais une liste nue. */
  const et = (bouts: string[]) =>
    bouts.length < 2 ? (bouts[0] ?? "") : `${bouts.slice(0, -1).join(", ")} et ${bouts[bouts.length - 1]}`;
  return (
    <span style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 2, fontSize: 10.5, fontWeight: 400, ...NUM }}>
      {rage.map((g, i) => (
        <span key={`r${i}`}
          title={`Sous ${g.pv} % de ses PV, ses dégâts passent à ${et([...g.tout].sort((a, b) => a.x - b.x).map((r) => `×${r.x.toLocaleString("fr-FR")}`))}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--red)" }}>
          <Icon name="flame" size={11} />{g.pv}&nbsp;%
        </span>
      ))}
      {soigne.map((g, i) => (
        <span key={`s${i}`}
          title={`Sous ${g.pv} % de ses PV, il rend ${et([...g.tout].sort((a, b) => a.rend - b.rend).map((s) => `${s.rend} %`))} de sa vie`}
          style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--green)" }}>
          <Icon name="sparkles" size={11} />{g.pv}&nbsp;%
        </span>
      ))}
    </span>
  );
}

function Titre({ icon, apres, children }: { icon: IconName; apres?: string; children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
      <span><Icon name={icon} size={12} style={{ marginRight: 5 }} />{children}</span>
      {apres && <span style={{ textTransform: "none", letterSpacing: 0, ...NUM }}>{apres}</span>}
    </div>
  );
}

/**
 * La barre de la colonne « par seconde ». UNE SEULE TEINTE, celle que la colonne
 * emploie déjà pour son chiffre : c'est la LONGUEUR qui porte la grandeur, jamais
 * la couleur (le vert et le doré ne se distinguent pas pour un daltonien protan).
 * Plancher à 1,5 % pour qu'une valeur dix fois plus faible que la première garde une
 * barre — une absence se lirait comme une donnée manquante. `aria-hidden` parce que
 * le nombre exact est juste au-dessus.
 */
function Barre({ part }: { part: number }) {
  return (
    <span aria-hidden="true" style={{ display: "block", height: 3, marginTop: 4, borderRadius: 2, background: "color-mix(in srgb, var(--border) 70%, transparent)" }}>
      <span style={{ display: "block", height: "100%", borderRadius: 2, background: "var(--red)", width: `${Math.max(1.5, Math.min(100, part * 100))}%` }} />
    </span>
  );
}
