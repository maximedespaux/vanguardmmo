import fs from "node:fs";
import path from "node:path";
// 36 Ko de dictionnaire, importés dans un module qui touche au disque : il ne peut
// donc jamais remonter dans un composant client, et ces 36 Ko ne descendent jamais
// au navigateur. C'est la même règle que `catalogue.ts`.
import DICO from "@/data/statistiques-objets.json";

/**
 * LES BONUS D'OBJET, LUS DANS LE CLIENT PLUTÔT QUE DEVINÉS.
 *
 * Le catalogue réduit (`objets-fiches.json`) porte déjà un champ `b` avec des
 * libellés français. Ils viennent d'une lecture de `propitem.txt` colonne par
 * colonne, et cette lecture se décale : `statistiques-objets.json` relève 3 codes
 * dont le libellé du relevé contredit celui du client, et un objet — la Baguette de
 * Luzaka oubliée — perdait carrément une de ses quatre lignes. Le CODE, lui, ne se
 * décale pas : `defineattribute.h` numérote les 155 statistiques et `Spec_Item.txt`
 * écrit le numéro.
 *
 * D'où ce module : `public/wiki/objets-stats.json` donne les bonus en codes `DST_*`
 * avec leurs valeurs, `src/data/statistiques-objets.json` donne le libellé français
 * de chaque code, et la fiche affiche le résultat de la jointure. Le champ `b` reste
 * le repli — il couvre douze objets que le relevé par codes n'a pas retenus.
 *
 * ┌──────── POURQUOI « EXPÉRIENCE % » ET « TAUX DE BUTIN % » RESTENT ────────┐
 * │ La consigne écarte de l'écran l'expérience, les penyas de récompense et   │
 * │ les taux de drop. Ce sont des RÉCOMPENSES : ce que rapporte un monstre,   │
 * │ ce que rend une quête. Une LIGNE DE BONUS sur une pièce d'équipement est  │
 * │ autre chose — c'est ce que la pièce fait, et c'est la raison pour laquelle │
 * │ on l'équipe. La retirer ferait mentir la fiche sur l'objet qu'elle décrit. │
 * │ Ce qui ne s'affiche pas, en revanche : `DST_ADDDROP`, le seul code employé │
 * │ dont aucune source ne donne le libellé. Un renseignement incomplet part.  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Ce fichier lit le disque : jamais importé par un composant client.
 */

/** Une ligne du dictionnaire des codes. `fr` manque pour ceux qu'aucune source ne
 *  nomme — ceux-là ne sortent pas d'ici. */
type Stat = { code: string; n: number; objets: number; fr?: string; client?: string };
const DICTIONNAIRE = DICO as unknown as { genere: string; definis: number; employes: number; stats: Stat[] };

const FR = new Map<string, string>(
  DICTIONNAIRE.stats.filter((s) => s.fr).map((s) => [s.code, s.fr as string])
);

/* Le type `Bonus` vit dans `vocabulaire.ts` : la fiche est un composant client et ne
   peut rien importer d'un module qui touche au disque, pas même un type. */
import type { Bonus } from "./vocabulaire";

type Ligne = { i: number; b?: [string, number][] };

let PAR_ID: Map<number, Bonus[]> | null = null;
let PAR_CODE: Map<string, Set<number>> | null = null;
let GENERE = "";

function charger() {
  if (PAR_ID && PAR_CODE) return { PAR_ID, PAR_CODE };
  const f = path.join(process.cwd(), "public", "wiki", "objets-stats.json");
  const d = JSON.parse(fs.readFileSync(f, "utf8")) as { genere?: string; objets: Ligne[] };
  GENERE = d.genere ?? "";
  const parId = new Map<number, Bonus[]>();
  const parCode = new Map<string, Set<number>>();
  for (const o of d.objets) {
    if (!o.b?.length) continue;
    const lignes: Bonus[] = [];
    for (const [code, v] of o.b) {
      const fr = FR.get(code);
      // Sans libellé, la ligne ne dirait qu'un code interne : elle ne s'affiche pas
      // et ne se filtre pas non plus, pour que le compte de la pastille corresponde
      // à ce qu'on voit.
      if (!fr) continue;
      lignes.push({ code, fr, v });
      const s = parCode.get(code);
      if (s) s.add(o.i); else parCode.set(code, new Set([o.i]));
    }
    if (lignes.length) parId.set(o.i, lignes);
  }
  PAR_ID = parId;
  PAR_CODE = parCode;
  return { PAR_ID, PAR_CODE };
}

/** Les bonus d'un objet, ou `null` quand le relevé par codes ne le connaît pas —
 *  l'appelant retombe alors sur le champ `b` du catalogue. */
export function bonusDe(id: number): Bonus[] | null {
  return charger().PAR_ID.get(id) ?? null;
}

/**
 * LES STATISTIQUES QU'ON PEUT DEMANDER, avec le nombre d'objets derrière chacune.
 *
 * C'est la question qu'aucun écran du site ne savait poser : « montre-moi tout ce
 * qui donne du taux critique ». Rangées par nombre d'objets décroissant — les plus
 * fournies d'abord, parce que ce sont celles qu'on cherche.
 *
 * Les comptes sont COMPTÉS sur le relevé, pas repris de la colonne `objets` du
 * dictionnaire : cette colonne a été calculée sur une autre passe, et deux nombres
 * qui devraient être égaux finissent toujours par diverger.
 */
export function statsDisponibles(): { code: string; fr: string; objets: number }[] {
  const { PAR_CODE: parCode } = charger();
  return [...parCode.entries()]
    .map(([code, ids]) => ({ code, fr: FR.get(code) as string, objets: ids.size }))
    .sort((a, b) => b.objets - a.objets || a.fr.localeCompare(b.fr, "fr"));
}

/** Les identifiants qui portent cette statistique. `null` pour un code inconnu :
 *  l'appelant ne filtre alors pas du tout, plutôt que de rendre une liste vide. */
export function idsAvecStat(code: string): Set<number> | null {
  return charger().PAR_CODE.get(code) ?? null;
}

export const dateDesStats = () => { charger(); return GENERE; };
