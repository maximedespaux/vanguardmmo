import fs from "node:fs";
import path from "node:path";
import { clefRecherche } from "./vocabulaire";

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║  « D'OÙ VIENT CET OBJET » — LE RELEVÉ LU UNE FOIS, POUR TOUT LE SITE             ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * POURQUOI CE FICHIER EXISTE. `ou-trouver.json` (1,8 Mo) était lu et mis en français
 * à TROIS endroits, chacun avec sa propre version de la même fonction :
 *
 *   · `src/app/api/ou-trouver/route.ts` → `enClair()`, avec les pourcentages
 *   · `src/lib/wiki.ts`                → `libelleSource()`, sans les pourcentages
 *   · et /objets n'en avait aucune — donc ses cartes ne disaient pas d'où venait
 *     l'objet, alors que le sous-titre de la page promet « cherche […] par ce qui le
 *     lâche ».
 *
 * Trois lectures du même relevé, trois formulations différentes du même fait, et la
 * page du catalogue laissée de côté. Ce module est la lecture unique : /wiki et /objets
 * la partagent, et la formulation d'une source est écrite à UN SEUL ENDROIT.
 *
 * LES TAUX NE PASSENT PAS. Le relevé porte des pourcentages de butin et des chances de
 * coffre : aucun ne traverse ce fichier. Ce qui sert, c'est QUI lâche et QUOI — pas à
 * quelle fréquence. C'est la règle du site, et c'est aussi ce qui distingue ce module
 * de `enClair()`, qui garde la chance pour trier.
 *
 * IL TOUCHE AU DISQUE : jamais importé par un composant client. Les libellés partagés
 * avec l'écran vivent dans `vocabulaire.ts`.
 */

export type SourceBrute = Record<string, unknown> & { type: string };
type ObjetProvenance = { nom: string; sources: SourceBrute[] };

/** Ce qu'un écran affiche : un intitulé, des lignes, et LE VRAI TOTAL. Trois lignes
 *  sans le total se lisent comme « il n'y en a que trois ». */
export type Provenance = { titre: string; lignes: string[]; total: number };

/**
 * LE « C½UR » DES RELEVÉS — un défaut d'encodage du client, réparé à la lecture.
 *
 * 407 occurrences dans les cinq relevés portent « ½ » là où le jeu écrit « œ » :
 * « Fragment de C½ur », « Boîte C½ur d'ange », « ½uf », « B½uf ». La substitution est
 * sans ambiguïté — aucun de ces textes ne parle de demi — et sans elle le site affiche
 * un nom cassé, ce qui est pire que pas de nom.
 */
export const reparer = (s: string) => s.replace(/½/g, "œ");

/**
 * UN NOM, OU RIEN. Des sources de `ou-trouver.json` et des champs de `pnj.json`
 * portent encore un code du client que le relevé n'a pas su résoudre — les trois formes
 * rencontrées sont `IDS_CHARACTER_INC_001185` (une table de textes),
 * `II_SYS_SYS_SCR_BXCAPEG` (une clé d'objet) et `WI_INSTANCE_OMINOUS` (un libellé de
 * bonus que le relevé n'a pas traduit, porté par la Clef Vampirique). Un code interne
 * n'est pas un renseignement : il disparaît, et la ligne prend une formulation
 * générique plutôt qu'un faux nom.
 *
 * LE TROISIÈME MOTIF EST GÉNÉRAL EXPRÈS, et c'est une leçon payée : une liste de
 * préfixes (`IDS_`, `II_`) laisse passer le préfixe suivant. `WI_INSTANCE_OMINOUS`
 * s'affichait en pastille parce qu'aucun préfixe connu ne le couvrait. Toute chaîne qui
 * n'est QUE des majuscules, des chiffres et des soulignés est un code du client : le
 * français n'écrit pas comme ça. Vérifié sur les six relevés — un seul champ affiché
 * correspond, celui-là.
 */
const CODE_CLIENT = /^(IDS_|II_[A-Z]|[A-Z][A-Z0-9]*_[A-Z0-9_]+$)/;

export const lisible = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const s = reparer(v).trim();
  return s && !CODE_CLIENT.test(s) ? s : null;
};

/**
 * LA CLÉ DE RAPPROCHEMENT PAR NOM, avec la ligature dépliée.
 *
 * `clefRecherche` normalise en NFD, qui ne casse PAS « œ » (il faudrait NFKD) : la
 * ligature tombait dans le filtre de ponctuation et « Cœur de shade » devenait
 * « c ur de shade ». Un joueur qui tape « coeur » ne trouvait rien, et le rapprochement
 * entre un objet et sa provenance ratait. On déplie donc les deux ligatures du français
 * — et le « ½ » du client, qui est la même lettre mal encodée — avant de normaliser.
 */
export const clefNom = (s: string) =>
  clefRecherche(reparer(s).replace(/œ/g, "oe").replace(/æ/g, "ae"));

/**
 * Une source du client, en français et sans chiffre de chance.
 *
 * Le `rang` sert à trier : le BUTIN d'abord, parce que c'est la question posée
 * (« qui lâche ça ? »), puis le craft, puis les coffres. Un objet présent dans quinze
 * coffres afficherait sinon quinze lignes presque identiques avant la seule qui répond.
 */
export function libelleSource(s: SourceBrute): { rang: number; texte: string } | null {
  switch (s.type) {
    case "butin": {
      const m = lisible(s.monstre);
      if (!m) return null; // « lâché par un monstre » ne dit rien : la ligne part.
      const zone = lisible((s.zones as string[] | undefined)?.[0]);
      return { rang: 0, texte: `Lâché par ${m}${zone ? ` — ${zone}` : ""}` };
    }
    case "craft": {
      const pnj = lisible(s.pnj);
      return { rang: 1, texte: pnj ? `Fabriqué chez ${pnj}` : "Fabriqué par échange" };
    }
    case "craft-maison": {
      const ing = lisible(s.ingredient);
      return ing ? { rang: 1, texte: `Fabriqué avec ${ing}` } : null;
    }
    case "cle": {
      const c = lisible(s.cle);
      return c ? { rang: 2, texte: `Coffre ouvert avec « ${c} »` } : null;
    }
    case "coffre": {
      const c = lisible(s.coffre);
      return c ? { rang: 3, texte: `Dans « ${c} »` } : null;
    }
    case "tour":
      return { rang: 4, texte: `Protection de l'Oasis, palier ${s.palier ?? "?"}` };
    case "farm": {
      const sert = lisible(s.sert);
      return sert ? { rang: 5, texte: `Sert à fabriquer ${sert}` } : null;
    }
    default:
      return null;
  }
}

/* ────────────────────────────── l'index, bâti une fois ─────────────────────────── */

export type IndexProvenance = {
  /** nom d'objet (en clé) → ses sources en français, les plus parlantes d'abord. */
  parObjet: Map<string, string[]>;
  /** nom de monstre (en clé) → ce qu'il lâche. LA MÊME TABLE LUE À L'ENVERS : c'est le
   *  seul endroit du site qui répond à « qu'est-ce que ce monstre donne ? ». */
  butinParMonstre: Map<string, string[]>;
  /** Combien de NOMS distincts portent au moins une source. Compté, jamais écrit. */
  noms: number;
};

let INDEX: IndexProvenance | null = null;

export function indexProvenance(): IndexProvenance {
  if (INDEX) return INDEX;
  const parObjet = new Map<string, string[]>();
  const butinParMonstre = new Map<string, string[]>();
  let noms = 0;

  try {
    const f = path.join(process.cwd(), "public", "wiki", "ou-trouver.json");
    const d = JSON.parse(fs.readFileSync(f, "utf8")) as { objets: ObjetProvenance[] };
    for (const o of d.objets) {
      const vues = new Set<string>();
      const lignes: { rang: number; texte: string }[] = [];
      for (const s of o.sources) {
        const l = libelleSource(s);
        if (!l || vues.has(l.texte)) continue;
        vues.add(l.texte);
        lignes.push(l);
        if (s.type === "butin" && lisible(s.monstre)) {
          const k = clefNom(s.monstre as string);
          const liste = butinParMonstre.get(k) ?? [];
          const nom = reparer(o.nom);
          if (!liste.includes(nom)) liste.push(nom);
          butinParMonstre.set(k, liste);
        }
      }
      if (!lignes.length) continue;
      lignes.sort((a, b) => a.rang - b.rang);
      const k = clefNom(o.nom);
      const deja = parObjet.get(k);
      /* Deux objets portent parfois le même nom (versions garçon/fille) : on fusionne
         leurs sources plutôt que d'en laisser une masquer l'autre. */
      if (deja) for (const l of lignes) { if (!deja.includes(l.texte)) deja.push(l.texte); }
      else { parObjet.set(k, lignes.map((l) => l.texte)); noms++; }
    }
  } catch { /* pas de relevé : les écrans se passent du bloc, ils ne cassent pas */ }

  INDEX = { parObjet, butinParMonstre, noms };
  return INDEX;
}

/**
 * LA PROVENANCE D'UN OBJET NOMMÉ, plafonnée — et le total dit.
 *
 * `combien` est petit exprès : sur une carte de résultat, une seule ligne tient, et
 * c'est celle qui répond (le butin passe devant par construction). Le compte restant
 * s'affiche à côté, parce qu'une liste coupée en silence se lit comme complète.
 */
export function provenanceDe(nom: string, combien = 1): Provenance | undefined {
  const toutes = indexProvenance().parObjet.get(clefNom(nom));
  if (!toutes?.length) return undefined;
  return { titre: "Où le trouver", lignes: toutes.slice(0, combien), total: toutes.length };
}
