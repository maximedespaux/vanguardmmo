import fs from "node:fs";
import path from "node:path";
import type { Comment, Marchand } from "./types";

/**
 * « QUI A CET OBJET ? » — l'annuaire lu dans le sens de l'objet.
 *
 * `/api/pnj?objet=…` savait déjà répondre, mais seulement à un écran qui la lui
 * posait : la fiche d'un objet, elle, ne pouvait rien en tirer. Elle affichait à la
 * place une ligne « Vendu par un PNJ » tirée du champ `pnj` du catalogue — et ce
 * champ ne veut PAS dire ça.
 *
 * ┌──────────── LE FAUX AMI, MESURÉ ────────────┐
 * │ 1 088 objets portent le champ `pnj`. Sur les │
 * │ 571 objets réellement posés dans un étal du  │
 * │ client, 41 seulement le portent ; et sur les │
 * │ 1 088, 60 seulement sont dans un étal. Ce    │
 * │ champ dit donc autre chose (probablement     │
 * │ « un marchand te le RACHÈTE »), et la ligne  │
 * │ « Vendu par un PNJ » était fausse mille fois.│
 * │ Elle a disparu de la fiche ; ce module la    │
 * │ remplace par la vraie réponse, lue dans les  │
 * │ étals eux-mêmes.                             │
 * └─────────────────────────────────────────────┘
 *
 * Le fichier pèse 296 Ko : on le lit ici avec `fs`, une fois, et on garde l'index —
 * même modèle que `objets/catalogue.ts` et `monstres/catalogue.ts`. Ce module ne
 * doit JAMAIS être importé par un composant client.
 */

type Objet = { n: string };
type Troc = { n: string; m: string };
type Recette = { l: string; s: string | null };
type Fiche = {
  cle: string; nom: string; metier: string | null; ville: string | null;
  vend: Objet[]; troc: Troc[]; craft: Recette[];
};

/** Accents ignorés, et « ½ » comme « œ » réduits au même « oe ». ATTENTION à la
 *  raison : les DEUX relevés portent le même accident d'encodage (« C½ur » dans le
 *  catalogue d'objets comme dans celui des monstres), donc cette ligne ne rattrape
 *  aucun objet perdu — mesuré, la résolution est la même sans elle. Elle sert à
 *  tenir quand un relevé sera réparé et pas l'autre. La réparation de ce qui
 *  s'AFFICHE se fait ailleurs : `objets/catalogue.ts` au chargement, et
 *  `scripts/extraire-monstres-butin.mjs` pour le pont de butin. */
const clef = (s: string) =>
  (s || "").normalize("NFD").replace(/\p{Mn}/gu, "").toLowerCase()
    .replace(/½/g, "oe").replace(/œ/g, "oe")
    .replace(/[^a-z0-9]+/g, " ").trim();

let PAR_OBJET: Map<string, Marchand[]> | null = null;

function charger() {
  if (PAR_OBJET) return PAR_OBJET;
  const f = path.join(process.cwd(), "public", "wiki", "pnj.json");
  const tout = JSON.parse(fs.readFileSync(f, "utf8")) as Fiche[];
  const idx = new Map<string, Marchand[]>();

  const poser = (nom: string | null | undefined, p: Fiche, comment: Comment, monnaie?: string) => {
    const k = clef(nom ?? "");
    if (!k) return;
    const m: Marchand = { cle: p.cle, nom: p.nom, metier: p.metier, ville: p.ville, comment, ...(monnaie ? { monnaie } : {}) };
    const liste = idx.get(k);
    /* On dédoublonne sur NOM + NATURE + VILLE, pas sur la clé technique. Le client
       porte plusieurs entrées pour un même marchand (« Mme Hudson » deux fois pour le
       jus d'orange, avec deux clés différentes) : dédoublonner sur la clé laissait le
       même nom deux fois de suite à l'écran. Deux marchands homonymes dans DEUX villes
       restent, eux, deux lignes — c'est bien le cas de figure où le nom ne suffit pas. */
    if (!liste) idx.set(k, [m]);
    else if (!liste.some((x) => x.nom === m.nom && x.comment === comment && x.ville === m.ville)) liste.push(m);
  };

  for (const p of tout) {
    for (const r of p.craft) poser(r.s ?? r.l, p, "fabrique");
    for (const t of p.troc) poser(t.n, p, "contre un jeton", t.m);
    for (const o of p.vend) poser(o.n, p, "vend");
  }
  PAR_OBJET = idx;
  return idx;
}

/**
 * LES PNJ QUI ONT CET OBJET, l'artisan d'abord.
 *
 * L'ordre n'est pas alphabétique : « fabrique » passe devant « contre un jeton »,
 * qui passe devant « vend ». C'est l'ordre du geste — on regarde d'abord si ça se
 * fabrique, puis ce que ça coûte en jetons, et l'achat en dernier.
 *
 * Le tableau est PLAFONNÉ à huit. Certains consommables sont chez soixante
 * marchands, et soixante noms ne répondent pas mieux à la question que huit.
 */
const ORDRE: Record<Comment, number> = { fabrique: 0, "contre un jeton": 1, vend: 2 };

export function marchandsDe(nom: string | null | undefined, combien = 8): { liste: Marchand[]; total: number } {
  if (!nom) return { liste: [], total: 0 };
  const trouve = charger().get(clef(nom));
  if (!trouve?.length) return { liste: [], total: 0 };
  const liste = [...trouve].sort(
    (a, b) => ORDRE[a.comment] - ORDRE[b.comment] || a.nom.localeCompare(b.nom, "fr")
  );
  return { liste: liste.slice(0, combien), total: liste.length };
}

/** Combien d'objets distincts un PNJ propose, toutes natures confondues. COMPTÉ :
 *  c'est la mesure de ce que l'annuaire sait, et elle ne s'écrit pas à la main. */
export const nombreDObjetsChezUnPnj = () => charger().size;
