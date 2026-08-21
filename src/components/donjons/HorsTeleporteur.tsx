"use client";
import { useMemo } from "react";
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

type Palier = { zone: string; especes: number; nivMin: number; nivMax: number };
type Ticket = { nom: string; icone: string | null; durees: number[]; flycoin: number | null; pnj: string | null };
type Lieu = {
  groupe: string; clef: string; nom: string; cartouche: string; carte: string;
  especes: number; poses: number; nivMin: number; nivMax: number;
  gros: { nom: string; niv: number; pv: number; rang: string; poses: number };
  paliers?: Palier[];
  /** Les monstres d'EXPÉRIENCE posés par le serveur sur la carte : ils ne
   *  comptent pas dans les niveaux de la zone (cf. `extraire-lieux.mjs`), mais
   *  ils sont là, et c'est ce qu'un joueur de leur niveau vient chercher.
   *  Absent quand il n'y en a pas — sept lieux sur huit. */
  monstresDExperience?: { nom: string; niv: number; pv: number; poses: number }[];
  objets: { nom: string; icone: string | null }[];
  ticket?: Ticket | null;
};

const LIEUX = (TABLE as { lieux: Lieu[] }).lieux;
const NUM = { fontVariantNumeric: "tabular-nums" } as const;
const fr = (n: number) => n.toLocaleString("fr-FR");

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
            {g.lieux.map((l) => <CarteLieu key={l.clef} l={l} etalDitEnBas={etalDitEnBas} />)}
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
      `}</style>
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
 * ┌──── UN SEGMENT PAR PALIER — ET AZRIA N'EN A PLUS QU'UN ────┐
 * │ Ce bloc dessinait Azria en DEUX segments disjoints, 73–115  │
 * │ puis 190–210, en présentant le trou entre les deux comme un │
 * │ renseignement. Le second palier n'existe pas : ses trois     │
 * │ créatures portent les identifiants MI_EXP_190/200/210 — des │
 * │ monstres d'EXPÉRIENCE posés par le serveur sur la carte      │
 * │ enneigée, pas une tranche de progression. Maxime, qui y      │
 * │ joue, l'a dit ; le relevé disait autre chose, et c'est sa    │
 * │ LECTURE qui était fausse.                                    │
 * │                                                              │
 * │ `extraire-lieux.mjs` les écarte désormais des niveaux de la  │
 * │ zone et les range dans `monstresDExperience`. Azria redevient│
 * │ un segment unique, 73–115, et son plus gros monstre cesse    │
 * │ d'être un mob d'XP à 2 036 000 PV.                           │
 * │                                                              │
 * │ Le mécanisme des paliers multiples RESTE : il servira au     │
 * │ prochain lieu qui en aura de vrais.                          │
 * └──────────────────────────────────────────────────────────────┘
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
        {ordonnes.map((l) => {
          /* Les paliers quand la table en donne, sinon l'intervalle entier comme un
             palier unique : un seul chemin de dessin, donc un seul comportement. */
          const bandes = l.paliers?.length
            ? l.paliers.map((p) => ({ min: p.nivMin, max: p.nivMax, quoi: `${p.especes} espèce${p.especes > 1 ? "s" : ""} de ${p.nivMin} à ${p.nivMax}` }))
            : [{ min: l.nivMin, max: l.nivMax, quoi: `du niveau ${l.nivMin} au niveau ${l.nivMax}` }];
          return (
            <div key={l.clef} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11.5 }}>
              <span className="ht-nom" style={{ width: 116, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.nom}</span>
              <span style={{ flex: 1, minWidth: 0, height: 9, borderRadius: 3, background: "color-mix(in srgb, var(--border) 70%, transparent)", position: "relative" }}
                role="img" aria-label={`${l.nom} : ${bandes.map((b) => b.quoi).join(", puis ")}`}>
                {bandes.map((b) => (
                  <span key={b.min} style={{ position: "absolute", top: 0, bottom: 0,
                    left: `${((b.min - 1) / max) * 100}%`,
                    width: `${Math.max(1.5, ((b.max - b.min) / max) * 100)}%`,
                    borderRadius: 3, background: "var(--orange)" }} />
                ))}
              </span>
              {/* Le nombre de paliers se lit au bout de la ligne quand il y en a
                  plusieurs : sur un écran étroit les jalons s'effacent, et deux
                  segments proches redeviendraient indiscernables. */}
              <span className="ht-valeur" style={{ width: 62, textAlign: "right", flexShrink: 0, color: "var(--text-muted)", ...NUM }}>
                {l.nivMin === l.nivMax ? l.nivMin : `${l.nivMin}–${l.nivMax}`}
                {bandes.length > 1 && <span title={`${bandes.length} paliers séparés`} style={{ color: "var(--orange)" }}> ×{bandes.length}</span>}
              </span>
            </div>
          );
        })}
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
function CarteLieu({ l, etalDitEnBas }: { l: Lieu; etalDitEnBas: boolean }) {
  return (
    <div className="fx-card" style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      {/* La carte est montrée ENTIÈRE, pas recadrée : son cartouche est en bas à
          droite et c'est la preuve du nom. Un `objectFit: cover` en bandeau, comme
          sur les tuiles de donjon, l'aurait coupé — donc ici on garde le 4/3 du
          fichier. */}
      <figure style={{ margin: 0, lineHeight: 0, borderBottom: "1px solid var(--border)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={l.carte} alt={`La carte de ${l.nom}, telle qu'elle sort du client — le cartouche imprimé dit « ${l.cartouche} »`}
          loading="lazy" style={{ width: "100%", display: "block" }} />
      </figure>

      <div style={{ padding: "12px 13px 13px" }}>
        <div className="font-heading" style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 6 }}>{l.nom}</div>

        {/* ┌──── QUATORZE MOTS DE PHRASE SONT DEVENUS UNE PASTILLE ────┐
            La tuile écrivait « Le plus coriace : Tortue Tyran (super) — niv. 121,
            10,9 M PV — un seul emplacement sur la carte », en dessous d'une rangée
            de pastilles qui disait déjà les espèces, les emplacements et les niveaux.
            Les trois mots d'étiquette (« Le plus coriace : ») deviennent un
            pictogramme de crâne, le reste rentre dans la rangée, et le nom mène
            maintenant à la fiche du monstre — c'est /monstres qui les possède.
            La phrase entière reste dans le `title`, pour qui la survole.
            └──────────────────────────────────────────────────────────┘ */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", fontSize: 11.5, marginBottom: l.ticket || l.objets.length ? 9 : 0 }}>
          <Puce ic="skull" titre={`Le plus coriace de la zone : ${l.gros.nom} (${l.gros.rang}), niveau ${l.gros.niv}, ${pvCourt(l.gros.pv)} PV${l.gros.poses === 1 ? " — un seul emplacement sur la carte" : ""}`}>
            <LienMonstre nom={l.gros.nom} niv={l.gros.niv} pv={l.gros.pv} couleur={TON_RANG[l.gros.rang] ?? "var(--text)"} />
            {" "}<span style={{ color: "var(--orange)" }}>{pvCourt(l.gros.pv)}</span>
            {l.gros.poses === 1 && <> · seul</>}
          </Puce>
          {/* Le mot « espèces » reste écrit, le mot « emplacements » non : le premier
              se compte en dizaines et se lit comme un nombre d'ennemis différents, le
              second se compte en milliers et n'a de sens qu'à côté. Un pictogramme de
              grille suffit à le dire, le `title` fait le reste. */}
          <Puce ic="paw" titre="Espèces différentes posées sur la carte">{l.especes} espèces</Puce>
          <Puce ic="grid" titre={`${fr(l.poses)} emplacements de réapparition sur la carte`}>{fr(l.poses)}</Puce>
          <Puce ic="star" titre="Les niveaux rencontrés ici">niv. {l.nivMin === l.nivMax ? l.nivMin : `${l.nivMin}–${l.nivMax}`}</Puce>
          {/* LES MONSTRES D'XP, À PART DES NIVEAUX DE LA ZONE ET C'EST VOULU. Les
              compter dedans faisait annoncer Azria « jusqu'au niveau 210 » alors
              qu'elle s'arrête à 115 — trois mobs d'expérience posés sur la carte
              ne sont pas une tranche de progression. Mais ils existent, et un
              joueur de 190 vient précisément pour eux : la pastille les nomme,
              le survol donne leurs niveaux et leurs PV. */}
          {l.monstresDExperience?.length ? (
            <Puce
              ic="flame"
              titre={`Monstres d'expérience posés par Airborn sur cette carte, hors progression de la zone — ${l.monstresDExperience
                .map((m) => `${m.nom} (niv. ${m.niv}, ${pvCourt(m.pv)} PV)`)
                .join(" · ")}`}
            >
              {l.monstresDExperience.length} monstres d&apos;XP · niv.{" "}
              {l.monstresDExperience[0].niv}–{l.monstresDExperience[l.monstresDExperience.length - 1].niv}
            </Puce>
          ) : null}
        </div>

        {/* LA LIGNE DES PALIERS EST PARTIE DANS LE SCHÉMA. Elle disait « 2 paliers
            séparés : 8 espèces de 73 à 115, puis 3 espèces de 190 à 210 » — dix-huit
            mots pour un TROU, que l'échelle des niveaux dessine maintenant en laissant
            un blanc entre deux segments. Voir EchelleNiveaux. */}

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
