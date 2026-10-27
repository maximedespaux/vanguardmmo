import fs from "node:fs";
import path from "node:path";
import type { Vague } from "@/components/oasis/modele";
import CLIENT_BRUT from "@/data/donjons-client.json";
import LIEUX_BRUT from "@/data/lieux-hors-teleporteur.json";
/* LE RELEVÉ DE COMBAT EST LU ICI AUSSI, ET C'EST SANS COÛT POUR LE NAVIGATEUR :
   ce module est SERVEUR (il ouvre des fichiers avec `fs`, un composant client ne
   le peut pas), donc ses 19,6 Ko restent du côté du serveur. Le navigateur, lui,
   ne les reçoit qu'à l'ouverture d'un panneau de lieu, par le module chargé à la
   demande — cf. src/components/donjons/PanneauLieu.tsx.
   Ce qu'on en tire ici, ce sont les clés : les cent deux créatures du relevé sont
   NOMMÉES à l'écran, donc chacune doit pouvoir mener à sa fiche. */
import COMBATS_BRUT from "@/data/lieux-monstres.json";
import type { DonjonClient, EtageTour } from "@/components/donjons/donneesClient";

const CLIENT = CLIENT_BRUT as { donjons: Record<string, DonjonClient>; tourOubliee: EtageTour[] };
const LIEUX = LIEUX_BRUT as { lieux: { gros: { nom: string; niv: number; pv: number } }[] };
type FicheCombat = { nom: string; niv: number; pv: number };
const COMBATS = COMBATS_BRUT as { lieux: Record<string, { especes: FicheCombat[]; experience?: FicheCombat[] }> };

/**
 * LES 52 VAGUES DE LA PROTECTION DE L'OASIS, LUES ICI ET NULLE PART AILLEURS.
 *
 * Ce fichier vivait sous src/app/(public)/oasis/. La page /oasis a été absorbée
 * par /donjons — les deux répondaient à la même question, « dans quoi est-ce que
 * j'entre ? » — donc la lecture suit la page qui reste. L'adresse /oasis, elle,
 * redirige : elle a pu circuler.
 *
 * Le fichier fait 12 Ko. On le lit ici, côté serveur, une seule fois, et on garde
 * le résultat en mémoire — même approche que
 * src/app/api/ou-trouver. Un `import` statique aurait compilé les 12 Ko dans un
 * module JS, donc dans un paquet téléchargé et mis en cache à part ; ici ils
 * voyagent une seule fois, dans la charge de la page elle-même.
 *
 * Une phrase de l'ancien fichier disait que « le tableau part déjà rendu dans le
 * HTML pour qu'un moteur de recherche le lise ». C'est faux, et vérifié en lisant
 * le HTML servi : le rail n'affiche que sa section active, donc le tableau des 52
 * vagues n'y a jamais été. Ce qui part rendu, c'est le bloc et ses quatre entrées
 * avec leurs comptes.
 *
 * C'est aussi ce qui décide de la forme de la page : /donjons est désormais un
 * composant SERVEUR qui lit les vagues et les passe à un composant client. Un
 * « use client » ne peut pas ouvrir un fichier, et bundler ces 12 Ko dans le
 * paquet du navigateur aurait annulé tout ce qui précède.
 *
 * À savoir quand même : le tableau se filtre, donc les vagues descendent bien au
 * navigateur. Ce qu'on évite, c'est un second aller-retour et un fichier de plus
 * dans le paquet, pas le poids lui-même.
 *
 * DEUX SOURCES, ET IL FAUT SAVOIR LAQUELLE PARLE :
 *   · la structure du tour — les 52 vagues, les quantités, le multiplicateur, la
 *     prime — vient d'un RELEVÉ MAISON fait sur captures d'écran. Le client ne la
 *     porte pas : sa carte est une arène vide, le serveur pilote tout ;
 *   · les caractéristiques de chaque monstre — nom français, niveau, PV, dégâts —
 *     viennent de la table des monstres du client.
 * D'où les réserves affichées dans le bloc : ce qui vient du relevé n'est pas
 * vérifiable dans les fichiers.
 */
let CACHE: Vague[] | null = null;

export function vagues(): Vague[] {
  if (CACHE) return CACHE;
  const f = path.join(process.cwd(), "public", "wiki", "oasis-vagues.json");
  try {
    const d = JSON.parse(fs.readFileSync(f, "utf8")) as { vagues: Vague[] };
    CACHE = d.vagues.sort((a, b) => a.n - b.n);
  } catch {
    // Un fichier absent ne doit pas rendre la page inaccessible : le reste — les
    // 23 donjons, la Tour Oubliée, la mécanique, les emblèmes, les réserves —
    // vaut d'être lu sans le tableau.
    CACHE = [];
  }
  return CACHE;
}

/**
 * LE PONT VERS /monstres — un identifiant de fiche par créature nommée ici.
 *
 * RÈGLE DE LA MAISON : les monstres appartiennent à /monstres. Cette page dit ce
 * qu'il faut pour DÉCIDER d'entrer (combien de PV, faible à quoi, une rage), et
 * elle doit pouvoir renvoyer à la fiche complète. Elle ne pouvait pas : ni
 * `donjons-client.json` ni `lieux-hors-teleporteur.json` ne portent l'identifiant
 * `MI_…` que /monstres/[id] attend.
 *
 * ┌──── POURQUOI PAS UN APPARIEMENT PAR NOM SEUL ────┐
 * │ Des noms cités sur cette page désignent DEUX      │
 * │ créatures du catalogue : « Araignée mutante » en  │
 * │ désigne quatre. Un lien par nom seul aurait mené  │
 * │ une fois sur deux à la mauvaise fiche.            │
 * │ La clé est donc nom + niveau + PV, et elle tranche│
 * │ 185 des 188 MENTIONS — 179 clés distinctes, dont  │
 * │ 177 résolues. Les DEUX clés qui restent (Lézard   │
 * │ Prestigieux, Elin) sont de VRAIS jumeaux : mêmes  │
 * │ niveau, mêmes PV, deux identifiants, et l'une est │
 * │ nommée deux fois d'où trois mentions sans lien.   │
 * │ Aucun critère ne les sépare, donc pas de lien —   │
 * │ un lien qui se trompe est pire qu'un nom qui      │
 * │ reste du texte.                                   │
 * └──────────────────────────────────────────────────┘
 *
 * Le nombre de mentions a plus que doublé le jour où les panneaux des huit lieux
 * hors téléporteur se sont ouverts : ils nomment les 102 créatures du relevé de
 * combat, là où la page n'en citait qu'une par lieu. Les trois mentions sans lien
 * n'ont pas bougé — ce sont toujours les deux mêmes paires de jumeaux.
 *
 * Le catalogue fait 612 Ko et il est lu ICI, côté serveur. Et on n'en garde QUE
 * les créatures que cette page nomme : la table complète ferait 1 124 lignes dans
 * la charge de la page pour 179 utiles. Les clés attendues sont donc récoltées
 * d'abord dans les trois relevés de la page, puis cherchées dans le catalogue.
 */
let IDS: Record<string, string> | null = null;

/** Les créatures que /donjons nomme : les trois relevés, dans l'ordre où ils servent. */
function clefsAttendues(): Set<string> {
  const s = new Set<string>();
  for (const d of Object.values(CLIENT.donjons)) {
    for (const m of d.monstres) s.add(clefMonstre(m.nom, m.niv, m.pv));
    for (const m of d.horsCarte ?? []) s.add(clefMonstre(m.nom, m.niv, m.pv));
  }
  for (const e of CLIENT.tourOubliee) s.add(clefMonstre(e.boss, e.niv, e.pv));
  for (const l of LIEUX.lieux) s.add(clefMonstre(l.gros.nom, l.gros.niv, l.gros.pv));
  /* Le panneau d'un lieu à ticket nomme TOUTES ses créatures, pas seulement la
     plus coriace : les cent deux lignes du relevé de combat entrent donc dans la
     table. Un `Set` : la plus coriace y était déjà, elle n'y sera pas deux fois. */
  for (const c of Object.values(COMBATS.lieux)) {
    for (const m of [...c.especes, ...(c.experience ?? [])]) s.add(clefMonstre(m.nom, m.niv, m.pv));
  }
  return s;
}

/** La clé d'appariement, la même des deux côtés : le nom, le niveau, les PV. */
export const clefMonstre = (nom: string, niv: number, pv: number) => `${nom}|${niv}|${pv}`;

export function idsMonstres(): Record<string, string> {
  if (IDS) return IDS;
  const table: Record<string, string> = {};
  const attendues = clefsAttendues();
  try {
    const brut = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "public", "wiki", "monstres.json"), "utf8")
    ) as unknown;
    const liste = (Array.isArray(brut) ? brut : (brut as { monstres?: unknown[] }).monstres ?? []) as {
      id: string; nom: string; niv?: number; pv?: number;
    }[];
    /* On compte les candidats AVANT d'écrire : une clé qui rassemble deux
       identifiants est effacée plutôt qu'attribuée au premier venu. */
    const vus = new Map<string, Set<string>>();
    for (const m of liste) {
      const k = clefMonstre((m.nom ?? "").trim(), m.niv ?? -1, m.pv ?? -1);
      if (!attendues.has(k)) continue;
      if (!vus.has(k)) vus.set(k, new Set());
      vus.get(k)!.add(m.id);
    }
    for (const [k, ids] of vus) if (ids.size === 1) table[k] = [...ids][0];
  } catch {
    // Catalogue illisible : les noms restent du texte, la page ne tombe pas pour ça.
  }
  IDS = table;
  return IDS;
}
