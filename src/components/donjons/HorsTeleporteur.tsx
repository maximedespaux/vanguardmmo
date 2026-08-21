"use client";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { Icon, type IconName } from "@/components/Icon";
import { NomObjet } from "@/components/objets/NomObjet";
import { pvCourt, TON_RANG } from "./donneesClient";
import { SousTitre } from "./FicheClient";
import { LienMonstre } from "./LienMonstre";
import TABLE from "@/data/lieux-hors-teleporteur.json";

/**
 * HORS DU TÉLÉPORTEUR — huit lieux que la grille des 23 donjons ne montre pas.
 *
 * Ce bloc existe pour une raison mesurable : le client porte 51 cartes sur
 * parchemin et douze n'étaient branchées nulle part. En les ouvrant une par une,
 * huit portent le nom IMPRIMÉ d'un lieu que la table des monstres peuple pour de
 * bon — quatre zones qui s'ouvrent avec un TICKET, quatre cartes de donjon que le
 * téléporteur ne propose pas. Le reste a été écarté, et le script d'extraction dit
 * lequel et pourquoi (scripts/extraire-lieux.mjs).
 *
 * ┌────────── CE QUI EST MONTRÉ, ET CE QUI EST TAIRE ──────────┐
 * │ MONTRÉ : la carte du client, le nom qui y est imprimé, le   │
 * │ peuplement compté, les bornes de niveau, le prix du ticket   │
 * │ — un coût d'opération, donc il reste — et ce que le client   │
 * │ envoie farmer là-bas.                                        │
 * │ TAIRE : COMMENT on entre dans les quatre donjons du bas.     │
 * │ Aucun fichier ne le dit, et l'écrire « à confirmer en jeu »  │
 * │ serait un demi-renseignement. La carte et le peuplement, eux,│
 * │ sont complets : ils disent ce que c'est et pour quel niveau.  │
 * └─────────────────────────────────────────────────────────────┘
 *
 * AUCUN CHIFFRE EN DUR, y compris dans les phrases : le nombre de lieux, les
 * comptes d'espèces, l'échelle du schéma et jusqu'à « le ticket le moins cher »
 * se recalculent sur la table. Un chiffre saisi à la main devient faux au
 * prochain relevé sans que personne ne s'en aperçoive.
 */

type Gros = { nom: string; niv: number; pv: number; rang: string; poses: number };
/**
 * UNE BANDE DE PEUPLEMENT — et une carte peut en porter plusieurs.
 *
 * ┌──────────────── CE QUE CE TYPE EMPÊCHE DE REDIRE ─────────────────┐
 * │ La carte d'Azria porte huit espèces de 73 à 115 ET trois de 190 à │
 * │ 210. On en a d'abord fait un seul intervalle « 73 à 210 » — qui   │
 * │ fait croire à une progression continue là où il y a soixante-     │
 * │ quinze niveaux de vide. Puis on a rangé la bande haute en note de │
 * │ bas de page — alors qu'elle porte plus d'emplacements de          │
 * │ réapparition qu'aucune autre zone du jeu. Ni un palier, ni une    │
 * │ curiosité : DEUX PEUPLEMENTS sur une même carte, qui servent à    │
 * │ deux moments très éloignés de la partie.                          │
 * └───────────────────────────────────────────────────────────────────┘
 *
 * `bandes` est TOUJOURS là, avec une entrée au moins : un seul chemin de dessin,
 * donc un seul comportement à vérifier. Sept lieux sur huit n'en ont qu'une, et
 * l'écran s'y comporte exactement comme avant.
 */
type Bande = {
  /** D'où vient ce peuplement, quand la carte en porte plusieurs à comparer :
   *  `flyff` pour le jeu d'origine, `airborn` pour ce que le serveur a posé.
   *  Absente sur une carte à peuplement unique — une étiquette sans rien à quoi
   *  l'opposer n'apprend rien. */
  origine?: "flyff" | "airborn";
  especes: number; poses: number; nivMin: number; nivMax: number;
  gros: Gros;
  /** Le rang de ses emplacements parmi TOUTES les zones du relevé : 1 = aucune
   *  n'en porte plus. Absent quand la bande s'étale sur plusieurs zones et n'est
   *  donc comparable à aucun total de zone (c'est le cas de Volcane). */
  rangPoses?: number;
};
type Ticket = { nom: string; icone: string | null; durees: number[]; flycoin: number | null; pnj: string | null };
/** Exporté pour le panneau de détail, qui reçoit un lieu entier. `import type` :
 *  le type disparaît à la compilation, donc pas de cycle entre les deux modules
 *  ni de dépendance qui ramènerait le panneau dans le paquet de départ. */
export type Lieu = {
  groupe: string; clef: string; nom: string; cartouche: string; carte: string;
  /** Les totaux de la CARTE ENTIÈRE, toutes bandes confondues. */
  especes: number; poses: number; nivMin: number; nivMax: number;
  /** Le plus coriace de toute la carte. L'écran ne le montre PAS tel quel dès
   *  qu'il y a deux bandes — un seul « plus coriace » y est trompeur quel que
   *  soit celui qu'on choisit, il s'en montre donc un par bande. Il sert à
   *  src/app/(public)/donjons/donnees.ts, qui l'apparie pour lier vers /monstres. */
  gros: Gros;
  bandes: Bande[];
  objets: { nom: string; icone: string | null }[];
  ticket?: Ticket | null;
};

const LIEUX = (TABLE as { lieux: Lieu[] }).lieux;
/** Sur combien de zones du relevé un rang de densité a été compté. L'écran écrit
 *  « du jeu » : il doit pouvoir dire sur quoi ce « du jeu » a été mesuré. */
const ZONES_DU_RELEVE = (TABLE as { zonesDuReleve: number }).zonesDuReleve;
/** Comment se nomme une provenance à l'écran. « Airborn » et sa teinte violette
 *  sont ceux de la fiche d'objet (src/components/objets/Fiche.tsx), qui marque
 *  déjà de cette façon ce que le serveur a ajouté : un même fait, un même signe. */
const ORIGINE: Record<string, { mot: string; couleur: string; quoi: string; titre: string }> = {
  flyff: {
    mot: "Flyff d'origine", couleur: "var(--text-muted)",
    quoi: "le peuplement du jeu d'origine",
    titre: "Ces espèces sont celles du Flyff d'origine, sur lequel le serveur est bâti",
  },
  airborn: {
    mot: "Airborn", couleur: "var(--purple)",
    quoi: "ce que le serveur a posé sur la même carte",
    titre: "Ces espèces ont été posées par Airborn sur la même carte",
  },
};

/**
 * LES NIVEAUX DE VIDE ENTRE DEUX BANDES VOISINES — un nombre par intervalle.
 *
 * C'est LE fait de la carte d'Azria, et il ne s'écrit nulle part à la main : les
 * deux peuplements se touchent ou ne se touchent pas, et l'écart se lit. Le jour
 * où le relevé les rapproche, la phrase le dit sans qu'on y revienne.
 */
const ecartsDesBandes = (bandes: Bande[]) => bandes.slice(1).map((b, i) => b.nivMin - bandes[i].nivMax);

/** Ce qu'une bande dit d'elle-même en toutes lettres — pour un lecteur d'écran,
 *  qui n'a ni le dessin ni les pastilles. */
const phraseBande = (b: Bande, seule: boolean) =>
  seule
    ? `du niveau ${b.nivMin} au niveau ${b.nivMax}`
    : `${b.especes} espèce${b.especes > 1 ? "s" : ""} de ${b.nivMin} à ${b.nivMax}${b.origine ? `, ${ORIGINE[b.origine].quoi}` : ""}`;

/** La ligne d'échelle d'un lieu, dite : ses bandes, puis le vide entre elles. */
const phraseLieu = (l: Lieu) => {
  const corps = l.bandes.map((b) => phraseBande(b, l.bandes.length === 1)).join(", puis ");
  const trous = ecartsDesBandes(l.bandes);
  return trous.length
    ? `${l.nom} : ${corps} — ${trous.map((t) => `${t} niveaux`).join(" et ")} de vide entre les peuplements`
    : `${l.nom} : ${corps}`;
};
const NUM = { fontVariantNumeric: "tabular-nums" } as const;
const fr = (n: number) => n.toLocaleString("fr-FR");
/** « le plan d'Île Corail », pas « le plan de Île Corail ». Deux des huit noms
 *  relevés commencent par une voyelle (Île Corail, Azria) et l'élision se lit
 *  autant qu'elle s'entend — un lecteur d'écran prononce ce qui est écrit. */
const de = (nom: string) => (/^[aeiouyàâäéèêëîïôöûüh]/i.test(nom) ? `d'${nom}` : `de ${nom}`);

/**
 * LE PANNEAU DE DÉTAIL, CHARGÉ SEULEMENT QUAND ON L'OUVRE.
 *
 * ┌──────────── POURQUOI `dynamic` ET PAS UN IMPORT ORDINAIRE ────────────┐
 * │ /donjons est la page la plus lourde du site. Le panneau porte le      │
 * │ relevé de combat des 102 créatures de ces huit lieux — 20,7 Ko de     │
 * │ données, plus la brique des faiblesses et le vocabulaire des          │
 * │ monstres. Un import ordinaire aurait mis tout ça dans le paquet de    │
 * │ départ, pour TOUT LE MONDE, y compris pour qui n'ouvre jamais un      │
 * │ panneau. Là, le navigateur ne le télécharge qu'au premier clic.       │
 * │ `ssr: false` : le panneau n'existe qu'après un geste, il n'a rien à   │
 * │ faire dans le HTML du serveur — et un panneau fermé rendu huit fois   │
 * │ d'avance, c'est exactement ce qu'on cherche à éviter.                 │
 * └───────────────────────────────────────────────────────────────────────┘
 */
const PanneauLieu = dynamic(() => import("./PanneauLieu"), {
  ssr: false,
  /* Le voile se pose tout de suite, sinon un clic sur un réseau lent ne produit
     rien de visible et on reclique. Il porte la même géométrie que le panneau
     pour que rien ne saute quand celui-ci arrive — et il passe par le MÊME
     PORTAIL, pour la même raison : `position: fixed` ne se cale sur la fenêtre
     que si aucun ancêtre ne porte de `transform`, et l'apparition des blocs de
     page (`@keyframes vgfade`) en applique un. Sans le portail, le voile
     d'attente s'affichait au milieu de la page au lieu de la couvrir. */
  loading: () =>
    typeof document === "undefined"
      ? null
      : createPortal(
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "88px 20px 20px" }}>
            <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Le plan arrive…</div>
          </div>,
          document.body
        ),
});

/**
 * LES DEUX GROUPES, ET CE QUI LES DISTINGUE — la façon d'y entrer.
 *
 * Les deux sous-titres qui vivaient ici (« On paie un accès pour un nombre de jours,
 * puis on farme librement » et « Le client les dessine et y pose des monstres ») ont
 * REJOINT LE SCHÉMA D'ENTRÉE en tête de page, où ils se comparent aux trois autres
 * façons d'entrer au lieu d'être découverts à mi-descente. D'où `par`, `quoi` et
 * `ancre` : le schéma les lit, cette table reste leur source unique.
 *
 * `quoi` se compte à la construction — le jour où un lieu s'ajoute au relevé, le
 * schéma d'entrée l'annonce sans qu'on y touche.
 */
const GROUPES: { clef: string; titre: string; par: string; icon: IconName; ancre: string }[] = [
  { clef: "ticket", titre: "Les zones à ticket", par: "Un ticket, au FLY SHOP", icon: "clock", ancre: "zones-ticket" },
  /* « Entrée non documentée » et pas « on ne sait pas » : c'est un fait vérifiable —
     aucun fichier du dépôt ne dit comment on entre sur ces quatre cartes — et il
     change le geste, parce qu'on les cherche sinon au téléporteur, qui ne les propose
     pas. La carte et le peuplement, eux, sont complets. */
  { clef: "client", titre: "Les cartes que le téléporteur ne propose pas", par: "Entrée non documentée", icon: "map", ancre: "cartes-client" },
];

/** Ce que le schéma d'entrée de la page affiche pour ces deux groupes, compté ici. */
export const GROUPES_HORS_TELEPORTEUR = GROUPES
  .map((g) => {
    const n = LIEUX.filter((l) => l.groupe === g.clef).length;
    return { icon: g.icon, par: g.par, quoi: `${n} ${g.clef === "ticket" ? "zones" : "cartes"}`, ancre: g.ancre, n };
  })
  .filter((g) => g.n > 0);

export function HorsTeleporteur() {
  /* UN SEUL PANNEAU MONTÉ À LA FOIS, ET AUCUN TANT QU'ON N'A PAS CLIQUÉ : c'est
     un état ici, pas un état par tuile. Huit panneaux repliés d'avance auraient
     alourdi la page la plus lourde du site de huit tableaux de créatures. */
  const [sel, setSel] = useState<Lieu | null>(null);
  const parGroupe = useMemo(
    () => GROUPES.map((g) => ({ ...g, lieux: LIEUX.filter((l) => l.groupe === g.clef) })).filter((g) => g.lieux.length),
    []
  );
  const tickets = LIEUX.filter((l) => l.ticket?.flycoin);
  /* « Le moins cher n'est pas le plus bas niveau » ne s'écrit que si c'est VRAI
     dans les données du jour : on compare le ticket le moins cher et celui de la
     zone au niveau minimum le plus bas. Le jour où les prix changent, la phrase
     disparaît d'elle-même au lieu de mentir. */
  const moinsCher = tickets.length ? tickets.reduce((a, l) => (l.ticket!.flycoin! < a.ticket!.flycoin! ? l : a)) : null;
  const plusBas = tickets.length ? tickets.reduce((a, l) => (l.nivMin < a.nivMin ? l : a)) : null;
  const prixNeSuitPas = moinsCher && plusBas && moinsCher.clef !== plusBas.clef;
  /* UN MÊME VENDEUR, OU RIEN. La phrase disait « les quatre étals ne sont côte à côte
     nulle part en jeu » — et c'était faux, contredit par le bloc lui-même : chaque
     ligne de ticket imprime « au FLY SHOP », les quatre. Il n'y a QU'UN étal, un seul
     PNJ (`MaFl_FLYcoin`) dans tout pnj.json porte ce nom. Le compte « quatre » était en
     plus écrit à la main dans la phrase.
     Ce qui est vrai se calcule : si tous les tickets relevés partent du même PNJ, on le
     dit — c'est ce qui évite de chercher quatre marchands. S'ils se dispersent un jour,
     la phrase disparaît au lieu de mentir dans l'autre sens. */
  const etals = [...new Set(tickets.map((l) => l.ticket!.pnj).filter(Boolean))];
  const memeEtal = tickets.length > 1 && etals.length === 1 ? etals[0]! : null;
  /* « au FLY SHOP » ÉTAIT ÉCRIT CINQ FOIS SUR LE MÊME ÉCRAN : une fois par ligne de
     ticket, puis une fois dans la phrase du bas. On ne le retire des lignes QUE si la
     phrase du bas s'affiche ET nomme l'étal — sinon le seul endroit où on apprenait
     chez qui acheter disparaîtrait. Les deux conditions se calculent, donc le jour où
     les étals se dispersent, chaque ligne reprend le sien. */
  const etalDitEnBas = Boolean(prixNeSuitPas && memeEtal);

  if (!LIEUX.length) return null;

  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
        <h2 className="font-heading" style={{ fontSize: 18, margin: 0 }}>
          <Icon name="compass" size={16} style={{ marginRight: 7, color: "var(--orange)" }} />
          Hors du téléporteur
        </h2>
        <span style={{ fontSize: 12.5, color: "var(--text-muted)", ...NUM }}>{LIEUX.length} lieux</span>
      </div>
      {/* CE PARAGRAPHE PORTAIT UNE PASTILLE « INVISIBLE EN JEU », ET ELLE N'AVAIT PAS
          LIEU D'ÊTRE. Elle disait que `town_oasis.webp` affiche « Tour Oubliée B5 » et
          que `dungeon_sanpres_1.webp` affiche « USS Darkon » — deux noms de fichiers du
          client, exacts tous les deux (vérifiés sur les images), mais qui n'apprennent
          rien à un joueur : il ne voit jamais un nom de fichier, et savoir lequel mentait
          ne change aucun de ses gestes. C'est la comptabilité du site, pas un fait du jeu.

          La brique `<Invisible enJeu>` est réservée à ce que l'écran de jeu cache ou
          contredit — la barre d'un boss qui annonce 2 Md quand il faut en sortir 30, une
          gemme dont le nom ne correspond pas à son effet. L'y user pour une note de
          méthode la dévalue partout ailleurs. La note reste où elle sert : dans le
          commentaire de tête de ce fichier et dans scripts/extraire-lieux.mjs. */}
      {/* CE PARAGRAPHE EST PARTI, et ce n'est pas une perte : il énonçait la MÉTHODE
          de ce bloc — le cartouche fait foi, un lieu vide n'entre pas dans la liste.
          C'est vrai, c'est écrit dans le commentaire de tête et dans le script
          d'extraction, et ça ne change aucun geste de joueur. Le fait, lui, est déjà
          servi : l'`alt` de chaque carte nomme son cartouche, et chaque tuile affiche
          son peuplement compté. Le paragraphe ne faisait que promettre ce que les
          tuiles montrent juste en dessous. */}
      <div style={{ height: 12 }} />

      {/* LE SCHÉMA DES NIVEAUX. Il remplace huit intervalles écrits en chiffres :
          « niv 43–69 » et « niv 129–165 » se lisent comme équivalents dans une
          phrase, deux segments posés sur le même axe se comparent d'un regard —
          et l'ordre dans lequel ces lieux servent apparaît sans qu'on l'écrive. */}
      <EchelleNiveaux />

      {parGroupe.map((g) => (
        /* `scrollMarginTop` : la barre de navigation est fixe et haute de 68 px, une
           ancre sans marge pose le titre du groupe dessous. Même valeur que les
           autres cibles de la page. */
        <div key={g.clef} id={g.ancre} style={{ marginTop: 20, scrollMarginTop: 88 }}>
          {/* Le `apres` portait la façon d'y entrer ; elle est montée dans le schéma
              d'entrée, en tête de page. Reste le compte, qui n'y était pas. */}
          <SousTitre icon={g.icon} apres={`${g.lieux.length}`}>{g.titre}</SousTitre>
          {/* `min(270px,100%)` ET PAS `270px` : la page pose 32 px de marge de chaque
              côté et ce bloc 22 de plus, soit 108 px perdus. Sur un écran de 375 px
              il reste 267 px, sur un 360 il en reste 252 — moins que le minimum de
              la piste, qui déborde alors du cadre. `.vg-main` est en `overflow-x:
              clip`, donc rien ne le signale : la tuile est simplement coupée à
              droite. Le `min()` laisse la piste se réduire sous son minimum quand la
              place manque, et ne change RIEN au-delà de 270 px. */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(270px,100%),1fr))", gap: 12 }}>
            {g.lieux.map((l) => <CarteLieu key={l.clef} l={l} etalDitEnBas={etalDitEnBas} onOuvrir={() => setSel(l)} />)}
          </div>
        </div>
      ))}

      {prixNeSuitPas && (
        /* LES SOIXANTE MOTS SONT DEVENUS DOUZE. Le paragraphe reprenait, en phrases,
           quatre nombres que les tuiles de ticket affichent déjà chacune : prix et
           niveau minimum. Ce qui n'est nulle part ailleurs, et qui seul change le
           geste, c'est le CONSTAT — le prix ne suit pas le niveau, donc on ne choisit
           pas son ticket au flair. Les deux noms suffisent à le prouver. */
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6, margin: "16px 0 0" }}>
          <Icon name="info" size={13} style={{ marginRight: 6, color: "var(--gold)" }} />
          Le prix ne suit pas le niveau : <b style={{ color: "var(--text)" }}>{moinsCher!.nom}</b> est
          le moins cher, <b style={{ color: "var(--text)" }}>{plusBas!.nom}</b> le plus bas.
          {memeEtal ? <> Tous au {memeEtal}.</> : null}
        </p>
      )}

      {/* Sur un téléphone, la colonne de noms du schéma mangeait la barre : à 360 px de
          large il ne restait qu'une cinquantaine de pixels pour porter l'intervalle,
          et deux lieux voisins devenaient indiscernables. La colonne se resserre, et
          la règle des jalons — qui ne sert qu'à situer l'axe — s'efface : le
          nombre exact est de toute façon écrit au bout de chaque ligne. */}
      <style>{`
        @media(max-width:560px){
          .ht-nom{width:80px !important}
          .ht-valeur{width:52px !important}
          .ht-jalons{display:none !important}
        }
        .ht-plan:hover .ht-appel,.ht-plan:focus-visible .ht-appel{color:var(--orange)}
        .ht-plan:focus-visible{outline:2px solid var(--orange);outline-offset:-2px}
      `}</style>

      {/* LE PANNEAU EST RENDU ICI, À LA RACINE DU BLOC, ET PAS DANS LA TUILE. Il se
          pose en `position: fixed` : le mettre dans la carte le ferait enfermer par
          le premier ancêtre qui porte un `transform` — piège déjà payé sur ce site,
          une modale s'était retrouvée coincée dans sa carte. */}
      {sel && <PanneauLieu lieu={sel} zonesDuReleve={ZONES_DU_RELEVE} onFermer={() => setSel(null)} />}
    </div>
  );
}

/**
 * L'ÉCHELLE DES NIVEAUX — un segment par lieu, tous sur le même axe.
 *
 * Le maximum de l'axe se LIT dans la table (le plus haut niveau rencontré),
 * arrondi à la dizaine supérieure — il ne se fixe pas à la main, sinon un lieu
 * ajouté plus haut sortirait de l'axe sans que rien ne le signale.
 *
 * UNE SEULE TEINTE, celle du bloc. C'est la position et la LONGUEUR du segment
 * qui portent le renseignement, jamais la couleur — le vert et le doré ne se
 * distinguent pas pour un daltonien protan. Plancher à 1,5 % de largeur pour
 * qu'un lieu à niveau unique (Mine de Dekanes, tout entière au niveau 30) garde
 * un repère visible au lieu de disparaître.
 *
 * ┌──── UN SEGMENT PAR BANDE, ET LE TROU EST LE RENSEIGNEMENT ────┐
 * │ Azria a été dessinée successivement en un segment 73–210      │
 * │ (une progression continue qui n'existe pas : soixante-quinze  │
 * │ niveaux de vide au milieu), puis en un segment 73–115 (la     │
 * │ moitié de la carte effacée, dont la zone la plus fournie du   │
 * │ jeu). Ni l'un ni l'autre. Deux segments, et le blanc entre    │
 * │ eux dit exactement ce qu'il faut savoir : on revient sur      │
 * │ cette carte soixante-quinze niveaux plus tard.                │
 * │ Le bout de ligne écrit alors les DEUX intervalles au lieu     │
 * │ d'un seul — « 73–210 » se lirait comme un continuum, ce que   │
 * │ le dessin dément juste à côté.                                │
 * └───────────────────────────────────────────────────────────────┘
 */
function EchelleNiveaux() {
  const max = Math.ceil(Math.max(...LIEUX.map((l) => l.nivMax)) / 10) * 10;
  const jalons = [1, Math.round(max / 4), Math.round(max / 2), Math.round((max * 3) / 4), max];
  const ordonnes = [...LIEUX].sort((a, b) => a.nivMin - b.nivMin || a.nivMax - b.nivMax);
  return (
    <figure style={{ margin: 0, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
      <figcaption style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".6px", color: "var(--text-muted)", marginBottom: 9 }}>
        À quel niveau chacun sert
      </figcaption>
      <div style={{ display: "grid", gap: 5 }}>
        {ordonnes.map((l) => (
            <div key={l.clef} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11.5 }}>
              <span className="ht-nom" style={{ width: 116, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.nom}</span>
              <span style={{ flex: 1, minWidth: 0, height: 9, borderRadius: 3, background: "color-mix(in srgb, var(--border) 70%, transparent)", position: "relative" }}
                role="img" aria-label={phraseLieu(l)}>
                {l.bandes.map((b) => (
                  <span key={b.nivMin} style={{ position: "absolute", top: 0, bottom: 0,
                    left: `${((b.nivMin - 1) / max) * 100}%`,
                    width: `${Math.max(1.5, ((b.nivMax - b.nivMin) / max) * 100)}%`,
                    borderRadius: 3, background: "var(--orange)" }} />
                ))}
              </span>
              {/* UN INTERVALLE PAR BANDE, EMPILÉS. Écrire « 73–210 » au bout d'une
                  ligne qui dessine deux segments séparés donnerait le continuum que
                  le dessin dément ; et sur un écran étroit les jalons s'effacent,
                  donc le bout de ligne est le seul endroit où les bornes se lisent. */}
              <span className="ht-valeur" style={{ width: 62, textAlign: "right", flexShrink: 0, color: "var(--text-muted)", lineHeight: 1.35, ...NUM }}>
                {l.bandes.map((b) => (
                  <span key={b.nivMin} style={{ display: "block" }}>
                    {b.nivMin === b.nivMax ? b.nivMin : `${b.nivMin}–${b.nivMax}`}
                  </span>
                ))}
              </span>
            </div>
        ))}
      </div>
      {/* La règle des jalons s'aligne sur la colonne de noms (116 px + 9 de gouttière)
          et sur celle des valeurs (62 + 9) : sans ces marges, le « 1 » se posait sous
          le nom du lieu au lieu du début de l'axe. */}
      <div className="ht-jalons" aria-hidden="true" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginTop: 6, paddingLeft: 125, paddingRight: 71, ...NUM }}>
        {jalons.map((j) => <span key={j}>{j}</span>)}
      </div>
    </figure>
  );
}

/** La tuile d'un lieu : sa carte d'abord — c'est elle qui le fait reconnaître. */
function CarteLieu({ l, etalDitEnBas, onOuvrir }: { l: Lieu; etalDitEnBas: boolean; onOuvrir: () => void }) {
  return (
    <div className="fx-card" style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      {/* ┌──── LA ZONE CLIQUABLE EST LA CARTE, ET UN VRAI `<button>` ────┐
          Demande de Maxime : « prévoir une zone cliquable pour voir le
          plan et les monstres ». C'est la carte qui la porte, pour deux
          raisons : c'est l'objet dont on veut la version en grand, et
          c'est la seule partie de la tuile qui NE CONTIENT AUCUN AUTRE
          CONTRÔLE. Rendre la tuile entière cliquable aurait mis un lien
          de monstre et jusqu'à vingt bulles d'objet À L'INTÉRIEUR d'un
          bouton — du HTML invalide, et un clic sur un objet qui aurait
          ouvert le panneau par-dessus sa bulle.
          Un `<button>` et pas un `<div onClick>` : le clavier, le focus
          visible et l'annonce du geste viennent avec, gratuitement.
          └──────────────────────────────────────────────────────────────┘ */}
      <button
        type="button"
        className="ht-plan"
        onClick={onOuvrir}
        aria-label={`Ouvrir le plan ${de(l.nom)} en grand, avec ses ${l.especes} espèces et leurs dégâts`}
        style={{ display: "block", width: "100%", padding: 0, margin: 0, border: "none", borderBottom: "1px solid var(--border)", background: "transparent", color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer" }}
      >
        {/* La carte est montrée ENTIÈRE, pas recadrée : son cartouche est en bas à
            droite et c'est la preuve du nom. Un `objectFit: cover` en bandeau, comme
            sur les tuiles de donjon, l'aurait coupé — donc ici on garde le 4/3 du
            fichier. C'est aussi pourquoi l'appel au clic est posé SOUS l'image et
            non par-dessus : un bandeau en bas aurait recouvert le cartouche. */}
        {/* UN `<span>` ET PAS UN `<figure>` : le contenu d'un `<button>` est du
            contenu de PHRASE, et `<figure>` est du contenu de FLUX — l'imbriquer
            ici produit le même HTML invalide que celui qu'on évite plus bas en
            gardant les liens de monstre et les bulles d'objet HORS du bouton.
            Rien ne se perd : cette image n'a pas de légende dans la tuile, le
            `<figure>` n'emballait donc rien. Celui du panneau, lui, en a une et
            reste un vrai `<figure>`. */}
        <span style={{ display: "block", lineHeight: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={l.carte} alt={`La carte ${de(l.nom)}, telle qu'elle sort du client — le cartouche imprimé dit « ${l.cartouche} »`}
            loading="lazy" style={{ width: "100%", display: "block" }} />
        </span>
        {/* Cinq mots, et ils disent le geste ET ce qu'on y gagne. La phrase
            complète est dans l'`aria-label` : elle nomme le lieu et compte ses
            espèces, ce qu'un lecteur d'écran a besoin d'entendre et qu'un œil lit
            déjà deux lignes plus bas. */}
        <span className="ht-appel" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 11px 6px", fontSize: 11.5, color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
          <Icon name="eye" size={12} style={{ color: "var(--orange)", flexShrink: 0 }} />
          Le plan et les créatures
          <Icon name="chevron-right" size={12} style={{ marginLeft: "auto", flexShrink: 0 }} />
        </span>
      </button>

      <div style={{ padding: "12px 13px 13px" }}>
        <div className="font-heading" style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 6 }}>{l.nom}</div>

        {/* ┌──── UNE RANGÉE DE PASTILLES PAR PEUPLEMENT, ET C'EST LE MÊME DESSIN ────┐
            Sept lieux sur huit n'ont qu'une bande : leur tuile est celle d'avant,
            au pixel près. Azria en a deux, et les deux rangées disent alors ce
            qu'une seule ne pouvait pas — huit espèces jusqu'à 115, puis trois de
            190 à 210 sur la même carte.
            LE « PLUS CORIACE » EST DANS LA RANGÉE, DONC IL Y EN A UN PAR BANDE.
            Sur une carte à deux peuplements, un seul est trompeur quel qu'il soit :
            annoncer le Mammouth Cannibale (115) cache un adversaire vingt fois plus
            gros posé au même endroit ; annoncer le Hyoubi (210) fait fuir un joueur
            de 90 que la carte accueille pourtant. Deux, un par bande, disent le vrai.
            └─────────────────────────────────────────────────────────────────────────┘ */}
        {l.bandes.length > 1 && <DeuxPeuplements l={l} />}
        <div style={{ display: "grid", gap: 7, marginBottom: l.ticket || l.objets.length ? 9 : 0 }}>
          {l.bandes.map((b) => <RangeeBande key={b.nivMin} b={b} seule={l.bandes.length === 1} />)}
        </div>

        {l.ticket && <LigneTicket t={l.ticket} sansEtal={etalDitEnBas} />}

        {l.objets.length > 0 && (
          <div style={{ marginTop: 9 }}>
            {/* Huit mots devenus trois : les objets dessous sont des `NomObjet`, donc
                chacun dit déjà où il mène. Ce que l'étiquette apporte, c'est POURQUOI
                cette liste est là — les quêtes du client y envoient — et ça tient dans
                le `title`. */}
            <div title="Les objets que les quêtes du client envoient chercher dans cette zone"
              style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".6px", color: "var(--text-muted)", marginBottom: 6 }}>
              À chercher ici · {l.objets.length}
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {l.objets.map((o) => (
                <span key={o.nom} style={{ fontSize: 11.5, padding: "3px 8px", borderRadius: 7, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
                  <NomObjet nom={o.nom} icone={o.icone} taille={16} />
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** « 1re », « 9e » — l'ordinal français, pour situer un rang sans le paraphraser. */
const ordinal = (n: number) => (n === 1 ? "1re" : `${n}e`);

/**
 * CE QUE DEUX PEUPLEMENTS SUR UNE MÊME CARTE VEULENT DIRE, EN UNE LIGNE.
 *
 * Cette phrase ne s'affiche que là où elle est vraie, et TOUS ses nombres se
 * comptent : le nombre de bandes, les niveaux de vide entre elles, le rang de la
 * plus fournie et sur combien de zones ce rang a été mesuré. Le jour où le relevé
 * rapproche les deux peuplements ou en pose un troisième, la phrase suit.
 *
 * CE QU'ELLE DOIT FAIRE COMPRENDRE, et que ni la carte ni les niveaux ne disent
 * seuls : on vient ici DEUX FOIS, à soixante-quinze niveaux d'écart, et la seconde
 * visite n'est pas une visite de curiosité — c'est le terrain de farm le plus
 * fourni du serveur. Aucun chiffre d'expérience n'est nécessaire pour le dire :
 * ce sont des emplacements de monstres, comptés.
 */
function DeuxPeuplements({ l }: { l: Lieu }) {
  const trous = ecartsDesBandes(l.bandes);
  /* La bande que rien ne dépasse dans tout le relevé, s'il y en a une ici. */
  const tete = l.bandes.find((b) => b.rangPoses === 1);
  return (
    <p style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.55, margin: "0 0 8px" }}>
      <Icon name="layers" size={12} style={{ marginRight: 5, color: "var(--orange)" }} />
      <b style={{ color: "var(--text)" }}>{l.bandes.length} peuplements</b> sur la même carte,{" "}
      {trous.map((t) => `${t}`).join(" et ")} niveaux de vide entre eux.
      {tete && (
        <>
          {" "}Celui de {tete.nivMin} à {tete.nivMax} porte{" "}
          <b style={{ color: "var(--text)", ...NUM }}>{fr(tete.poses)} emplacements</b> — plus qu&apos;aucune
          autre des {ZONES_DU_RELEVE} zones du relevé.
        </>
      )}
    </p>
  );
}

/**
 * UNE RANGÉE DE PASTILLES PAR PEUPLEMENT.
 *
 * ┌─────────── QUATORZE MOTS DE PHRASE SONT DEVENUS UNE PASTILLE ───────────┐
 * │ La tuile écrivait « Le plus coriace : Tortue Tyran (super) — niv. 121,  │
 * │ 10,9 M PV — un seul emplacement sur la carte », en dessous d'une rangée │
 * │ qui disait déjà les espèces, les emplacements et les niveaux. Les trois │
 * │ mots d'étiquette deviennent un pictogramme de crâne, le reste rentre    │
 * │ dans la rangée, et le nom mène à la fiche du monstre — c'est /monstres  │
 * │ qui les possède. La phrase entière reste dans le `title`.               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * L'ÉTIQUETTE DE PROVENANCE NE PARAÎT QUE QUAND IL Y A DE QUOI COMPARER. Sur une
 * carte à peuplement unique, « Flyff d'origine » posé tout seul n'oppose rien à
 * rien et ne change aucun geste ; le relevé ne l'écrit d'ailleurs pas.
 */
function RangeeBande({ b, seule }: { b: Bande; seule: boolean }) {
  const o = b.origine ? ORIGINE[b.origine] : null;
  /* « sur la carte » ne se dit que s'il n'y a qu'un peuplement : sinon ce compte
     est celui de la BANDE, pas de la carte, et les deux se lisent l'un sous
     l'autre à trois lignes d'écart. */
  const empl = `${fr(b.poses)} emplacements de réapparition${seule ? " sur la carte" : " dans ce peuplement"}`;
  return (
    <div>
      {!seule && o && (
        <div
          title={o.titre}
          style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", color: o.couleur, marginBottom: 4 }}
        >
          {o.mot}
        </div>
      )}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", fontSize: 11.5 }}>
        <Puce ic="skull" titre={`Le plus coriace ${seule ? "de la zone" : "de ce peuplement"} : ${b.gros.nom} (${b.gros.rang}), niveau ${b.gros.niv}, ${pvCourt(b.gros.pv)} PV${b.gros.poses === 1 ? " — un seul emplacement sur la carte" : ""}`}>
          <LienMonstre nom={b.gros.nom} niv={b.gros.niv} pv={b.gros.pv} couleur={TON_RANG[b.gros.rang] ?? "var(--text)"} />
          {" "}<span style={{ color: "var(--orange)" }}>{pvCourt(b.gros.pv)}</span>
          {b.gros.poses === 1 && <> · seul</>}
        </Puce>
        {/* Le mot « espèces » reste écrit, le mot « emplacements » non : le premier
            se compte en dizaines et se lit comme un nombre d'ennemis différents, le
            second se compte en milliers et n'a de sens qu'à côté. Un pictogramme de
            grille suffit à le dire, le `title` fait le reste. */}
        <Puce ic="paw" titre="Espèces différentes posées sur la carte">{b.especes} espèce{b.especes > 1 ? "s" : ""}</Puce>
        <Puce ic="grid" titre={b.rangPoses ? `${empl} — ${ordinal(b.rangPoses)} zone du relevé sur ${ZONES_DU_RELEVE}` : empl}>{fr(b.poses)}</Puce>
        {/* LE SUPERLATIF SEUL S'AFFICHE, ET C'EST LA DIFFÉRENCE AVEC UN RANG. « 9e
            sur 65 » n'apprend rien à qui cherche où farmer ; « aucune zone du jeu
            n'en porte plus » change la destination. Le rang complet reste dans le
            `title` de la pastille voisine, pour toutes les bandes. */}
        {b.rangPoses === 1 && (
          <Puce ic="trophy" titre={`Aucune des ${ZONES_DU_RELEVE} zones du relevé ne porte plus d'emplacements de réapparition que ce peuplement : ${fr(b.poses)}.`}>
            la plus fournie du jeu
          </Puce>
        )}
        <Puce ic="star" titre="Les niveaux rencontrés ici">niv. {b.nivMin === b.nivMax ? b.nivMin : `${b.nivMin}–${b.nivMax}`}</Puce>
      </div>
    </div>
  );
}

/**
 * LE TICKET — son icône du jeu, ses durées, et le prix de la journée.
 *
 * Le prix est un COÛT, pas une récompense : c'est ce qu'il faut sortir pour
 * entrer, donc il reste à l'écran. Les durées viennent des noms d'objets eux-mêmes
 * (« Ticket Azria (7 jours) ») : celles qui n'existent pas ne s'affichent pas —
 * Sombrésia n'a qu'un ticket d'un jour dans le relevé.
 */
function LigneTicket({ t, sansEtal }: {
  t: Ticket;
  /** Vrai quand la phrase du bas du bloc nomme déjà l'étal commun : on ne le répète pas. */
  sansEtal?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 9, padding: "7px 10px", fontSize: 11.5 }}>
      {t.icone ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/jeu/icones/${t.icone}`} alt="" width={22} height={22}
          style={{ objectFit: "contain", imageRendering: "pixelated", flexShrink: 0 }} />
      ) : null}
      <span style={{ minWidth: 0, flex: 1, lineHeight: 1.45 }}>
        {/* Le nom EXACT du relevé, suffixe compris : c'est la clé qui retrouve la
            fiche et la provenance. Les autres durées sont listées à côté, et on
            retire celle du jour — elle est déjà dans le nom, et « (1 jour) · 1 j »
            se lisait comme un bégaiement. */}
        <NomObjet nom={`${t.nom} (1 jour)`} />
        {t.durees.filter((d) => d !== 1).length > 0 && (
          <span style={{ color: "var(--text-muted)" }}>
            {" "}· aussi en {t.durees.filter((d) => d !== 1).map((d) => `${d} jours`).join(" et ")}
          </span>
        )}
        {t.flycoin != null && (
          <span style={{ display: "block", ...NUM }}>
            <b style={{ color: "var(--gold)" }}>{fr(t.flycoin)} FlyCoins</b>
            <span style={{ color: "var(--text-muted)" }}> la journée{t.pnj && !sansEtal ? `, au ${t.pnj}` : ""}</span>
          </span>
        )}
      </span>
    </div>
  );
}

function Puce({ ic, titre, children }: { ic: IconName; titre?: string; children: React.ReactNode }) {
  return (
    <span title={titre} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 5, padding: "2px 7px", color: "var(--text-muted)", ...NUM }}>
      <Icon name={ic} size={11} />{children}
    </span>
  );
}

/** Les mots par lesquels une recherche doit atteindre ce bloc : ses noms de lieu,
 *  plus les deux façons d'y entrer. Recomposé depuis la table — un lieu ajouté
 *  demain devient cherchable sans qu'on y pense. */
export const MOTS_HORS_TELEPORTEUR = ["ticket", "flycoin", ...LIEUX.map((l) => l.nom)]
  .join(" ")
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .toLowerCase();

/* `LIEUX_HORS_TELEPORTEUR` a été retiré avec le sous-titre à compteurs de la page :
   il n'avait qu'un appelant, et le compte de ces lieux se lit maintenant à deux
   endroits qui le calculent chacun sur la table — le titre du bloc (« 8 lieux ») et
   le schéma d'entrée, via `GROUPES_HORS_TELEPORTEUR`. Une troisième constante pour
   le même nombre n'aurait fait qu'un endroit de plus à oublier. */
