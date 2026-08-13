import type { IconName } from "@/components/Icon";

/**
 * Le vocabulaire du catalogue d'objets : les codes du client du jeu traduits une
 * seule fois, ici, pour que la recherche et la fiche parlent la même langue.
 *
 * Aucun accès disque dans ce fichier : il est importé par du code client comme
 * par la route API. Le chargement du catalogue vit dans `catalogue.ts`, qui lit
 * avec `fs` et ne doit jamais remonter dans un composant client.
 */

/** Un objet du catalogue réduit. Les clés sont courtes parce que le fichier en
 *  compte 12 134 : en clair il pesait 4,5 Mo au lieu de 3. */
export type ObjetFiche = {
  i: number;                    // identifiant du client
  n: string;                    // nom français
  cle: string;                  // clé technique (II_…)
  f: Famille;
  ic?: string;                  // fichier d'icône, vérifié présent sur le disque
  t?: string;                   // type en français (« Glaive (deux mains) »)
  cl?: string;                  // classe requise (code JOB_…)
  nr?: number;                  // niveau requis pour équiper
  no?: number;                  // niveau DE L'OBJET — ≠ niveau requis
  nm?: number;                  // niveau maximum d'utilisation
  g?: "Unique" | "Ultime" | "Baruna";
  d?: string;                   // description du jeu
  dn?: number; dx?: number;     // dégâts (armes) ou défense (armures)
  va?: number;                  // coefficient de vitesse d'attaque
  bm?: number;                  // bonus magique (bâtons)
  ae?: number;                  // attaque élémentaire
  el?: string;                  // élément porté
  em?: string;                  // emplacement d'équipement
  sx?: "male" | "female";
  px?: number;                  // prix de référence en penyas
  du?: number;                  // durabilité affichée
  pi?: number;                  // taille de pile
  ne?: 1;                       // NON échangeable
  li?: 1 | 2;                   // lié au personnage / à l'équipement
  pnj?: 1;                      // vendable chez un PNJ
  dl?: 1;                       // durée de vie réelle
  nou?: 1;                      // nourriture
  af?: 1;                       // nom venu des textes propres à AirFlyff
  hw?: 1;                       // absent du wiki du serveur
  re?: Record<string, number>;  // résistances élémentaires
  b?: [string, number][];       // bonus : libellé + valeur
  /**
   * D'OÙ IL VIENT — ajouté PAR LA RECHERCHE, absent du relevé.
   *
   * `objets-fiches.json` ne porte pas la provenance : elle vit dans `ou-trouver.json`,
   * lu par `provenance.ts`. `chercher()` l'agrafe aux cinquante lignes qu'il rend, et à
   * elles seules — l'attacher aux 12 134 du catalogue en mémoire serait 8 459 sources
   * gardées pour en montrer cinquante.
   *
   * C'était le trou de cette page : son sous-titre promet de chercher « par ce qui le
   * lâche », le filtre « Que lâche un monstre » existe, et une fois filtré AUCUNE des
   * cinquante cartes ne disait QUEL monstre. Jamais de taux : le nom suffit à savoir
   * où aller.
   */
  pv?: { titre: string; lignes: string[]; total: number };
  /**
   * LE RANG DE CHAQUE BONUS, ajouté PAR LA RECHERCHE comme `pv` — un entier par
   * ligne de `b`, dans le même ordre.
   *
   * « Dégâts critiques +120 » ne dit pas si c'est beaucoup. Le catalogue le sait :
   * 249 objets portent ce bonus, de +4 à +240, et la moitié d'entre eux ne dépassent
   * pas +23. `bq[i]` est le pourcentage d'objets portant LE MÊME bonus que cette
   * pièce dépasse — 0 pour la plus faible, 100 pour la plus forte. C'est ce chiffre
   * que la barre sous la pastille dessine, et il ne coûte pas un mot à l'écran :
   * il arrive par la même réponse JSON que la carte, pas dans le HTML servi.
   *
   * ON NE PASSE PAS PAR LE MAXIMUM. Les valeurs sont trop étalées pour ça : « PV
   * rendus » va jusqu'à 999 999 999 et « PV max » jusqu'à 9 999, si bien qu'une
   * barre en fraction du maximum serait invisible pour 99 % des pièces. Un RANG,
   * lui, se répartit toujours sur toute la longueur — et il répond à la question
   * qu'on se pose vraiment : est-ce que celle-là est bien fournie, ou pas.
   */
  bq?: number[];
};

export type Famille = "arme" | "armure" | "bijou" | "mode" | "consommable" | "materiau" | "familier" | "divers";

/**
 * UN BONUS LU PAR SON CODE DU CLIENT.
 *
 * Le type vit ICI et non dans `stats.ts` parce que `stats.ts` lit le disque : la
 * fiche est un composant client et ne peut pas l'importer, même pour un type.
 * `code` accompagne le libellé pour que la fiche puisse renvoyer vers la recherche
 * de cette statistique — c'est ce qui fait du wiki un wiki : un bonus devient un
 * lien vers tout ce qui le porte.
 */
export type Bonus = { code: string; fr: string; v: number };

/** Le pourcentage est PORTÉ PAR LE LIBELLÉ dans le client (« Attaque % ») : laissé
 *  là et ajouté à la valeur, il donnait « Attaque % +15 % ». Il quitte le mot et
 *  reste sur le chiffre, où on le lit. Deux écrans s'en servent, d'où la fonction. */
export function libelleEtPourcent(libelle: string): { mot: string; pct: boolean } {
  const pct = libelle.trimEnd().endsWith("%");
  return { mot: pct ? libelle.replace(/\s*%$/, "") : libelle, pct };
}

/**
 * LE CHIFFRE DE COMBAT — et les 3 869 objets qui n'en ont pas.
 *
 * `dn`/`dx` viennent de `dwAbilityMin`/`dwAbilityMax`, et le client s'en sert comme
 * d'un fourre-tout : la même colonne porte des choses sans rapport selon la famille.
 * Relevé sur les 12 134 lignes du catalogue :
 *
 *   arme        1 294 objets, 0 à 2 000+      → les DÉGÂTS. Vrai.
 *   armure      1 858 objets, 344 valeurs     → la DÉFENSE. Vrai.
 *   bijou           0 objet                   → la colonne est vide.
 *   mode        3 098 objets, UNE valeur : 1  → un bouchon. « Défense 1 » sur chaque
 *                                               pièce de mode, 3 098 fois.
 *   familier      185 objets, UNE valeur : 350→ un bouchon.
 *   consommable   382 objets, jusqu'à 1 080 000 → ni dégâts ni défense, et PAS non plus
 *                                               ce que ça rend : la « Fiole de mana 25 »
 *                                               y écrit 250 alors qu'elle rend 25 PM, et
 *                                               le jus d'orange 50 000 pour 60 PV. Ce
 *                                               qu'elle rend est dans les BONUS
 *                                               (DST_MP, DST_HP), qui s'affichent, eux.
 *   divers        204 objets, et l'une des    → la ligne « Récompense PK » y met une
 *                 valeurs est `MI_VENDOR_HALLO_3` fourchette de penyas, et une autre
 *                                               un IDENTIFIANT DE MONSTRE.
 *
 * La fiche annonçait « Défense » pour les six familles. C'était faux ou vide sur
 * 3 869 objets — dont un « Défense 50 000 » sur un jus d'orange. La fonction ne rend
 * donc quelque chose que pour les deux familles où la colonne a un sens ; ailleurs
 * elle rend `null` et la ligne n'existe pas. On ne remplace pas par une réserve : un
 * nombre dont on ignore le sens n'est pas un renseignement.
 */
export function chiffreDeCombat(o: { f: Famille; dn?: number; dx?: number }):
  { label: "Dégâts" | "Défense"; court: "Dég." | "Déf."; min: number; max?: number } | null {
  if (o.dn == null || typeof o.dn !== "number") return null;
  if (o.f === "arme") return { label: "Dégâts", court: "Dég.", min: o.dn, max: o.dx };
  if (o.f === "armure") return { label: "Défense", court: "Déf.", min: o.dn, max: o.dx };
  return null;
}

/** Les familles, dans l'ordre où on cherche : ce qu'on porte d'abord. */
export const FAMILLES: { clef: Famille; label: string; icon: IconName }[] = [
  { clef: "arme", label: "Armes", icon: "sword" },
  { clef: "armure", label: "Armures", icon: "shirt-armor" },
  { clef: "bijou", label: "Bijoux", icon: "ring" },
  { clef: "mode", label: "Mode", icon: "shirt" },
  { clef: "consommable", label: "Consommables", icon: "droplet" },
  { clef: "materiau", label: "Matériaux", icon: "rock" },
  { clef: "familier", label: "Familiers", icon: "paw" },
  { clef: "divers", label: "Divers & boîtes", icon: "package" },
];

/** Une icône par type d'objet, pour que la liste se lise sans lire. */
export function iconeDeType(t: string | undefined, f: Famille): IconName {
  switch (t) {
    case "Épée à une main": case "Glaive (deux mains)": return "sword";
    case "Hache à une main": case "Doloire (deux mains)": return "pickaxe";
    case "Poing": return "fist";
    case "Sceptre de soin": return "sparkles";
    case "Arc / arbalète": return "bow";
    case "Bâton": return "spiral";
    case "Yo-yo": return "target";
    case "Baguette": return "orb";
    case "Casque": return "helmet";
    case "Armure": return "shirt-armor";
    case "Gants": case "Gants (mode)": return "gloves";
    case "Bottes": case "Chaussures (mode)": return "boots";
    case "Bouclier": case "Targe": return "shield";
    case "Grimoire": return "book";
    case "Anneau": return "ring";
    case "Boucle d'oreille": return "earring";
    case "Collier": return "necklace";
    case "Coiffe (mode)": return "hat";
    case "Tenue (mode)": return "shirt";
    case "Cape": return "cape";
    case "Masque": return "mask";
    case "Potion": return "droplet";
    case "Parchemin": return "scroll";
    case "Affiche": return "image";
    case "Matériau": return "rock";
    case "Œuf de familier": return "egg";
    case "Familier d'élevage": case "Familier ramasseur": case "Familier de soutien": return "paw";
    default: return FAMILLES.find((x) => x.clef === f)?.icon ?? "package";
  }
}

/**
 * L'arbre des métiers en français, tel que le client le nomme.
 *
 * Les huit derniers (Templier, Spadassin…) sont les classes légendaires propres
 * à AirFlyff : leurs codes ne se devinent pas (Primat = FLORIST_HERO). La
 * correspondance est prouvée par les tenues « … en Yggdrasil », dont le nom
 * français porte la classe et dont la ligne porte le code.
 */
const METIER: Record<string, string> = {
  VAGRANT: "Vagabond",
  MERCENARY: "Mercenaire", ACROBAT: "Acrobate", ASSIST: "Assistant", MAGICIAN: "Magicien",
  KNIGHT: "Chevalier", BLADE: "Lame", JESTER: "Baladin", RANGER: "Ranger",
  RINGMASTER: "Meneur", BILLPOSTER: "Moine", PSYCHIKEEPER: "Psykeeper", ELEMENTOR: "Élémentaliste",
  LORDTEMPLER_HERO: "Templier", STORMBLADE_HERO: "Spadassin", WINDLURKER_HERO: "Sylphide",
  CRACKSHOOTER_HERO: "Arbalétrier", FLORIST_HERO: "Primat", FORCEMASTER_HERO: "Chanoine",
  MENTALIST_HERO: "Envoûteur", ELEMENTORLORD_HERO: "Arcaniste",
};

/** « BLADE_HERO » → « Lame Héros ». Les paliers se suffixent, ils ne se listent pas. */
export function classeFr(code: string | undefined): string | null {
  if (!code) return null;
  if (METIER[code]) return METIER[code];
  const m = code.match(/^(.+)_(HERO|MASTER)$/);
  if (m && METIER[m[1]]) return `${METIER[m[1]]} ${m[2] === "HERO" ? "Héros" : "Maître"}`;
  return code;
}

/** L'emblème officiel de la classe. Les 37 codes rencontrés ont leur fichier :
 *  vérifié fichier par fichier au moment de réduire le catalogue. */
export const emblemeClasse = (code: string | undefined) =>
  code ? `/jeu/classes/job${code.toLowerCase().replace(/_/g, "")}.webp` : null;

/**
 * La couleur d'un grade — MESURÉE sur le cadre du jeu, pas choisie.
 *
 * Les deux cadres 32×32 que le client pose sur l'icône tranchent la question. Pixels
 * dominants relevés dans les fichiers, opacité pleine :
 *   item_edgeunique   → 41,255,41  (vert pur)            → var(--green)
 *   item_edgeultimate → 255,255,0 puis 230,156,0 (ambre) → var(--gold)
 * `GRADE_TON` de `components/jeu/Rarete.tsx` donnait `--orange` à l'ultime, et le
 * même objet changeait donc de couleur selon la brique qui l'affichait. C'est réglé :
 * Rarete.tsx dit `--gold` comme ici, ces deux tables ne se contredisent plus. Les
 * CADRES eux-mêmes viennent de Rarete.tsx (`IconeGrade`) — il n'y a plus de table de
 * chemins ici, c'était la même chose écrite deux fois.
 */
export const COULEUR_GRADE: Record<string, string> = {
  Unique: "var(--green)",
  Ultime: "var(--gold)",
};

/**
 * LES QUATRE DÉS DE STATISTIQUE DU JEU — `FOR`, `DEX`, `INT`, `END`.
 *
 * Ce sont les tuiles que le client dessine dans la fenêtre de personnage, et elles
 * portent déjà le libellé en français. Un bonus « Force +10 » n'a donc pas besoin
 * qu'on écrive « Force » : le dé du jeu le dit, et il le dit comme le joueur en a
 * l'habitude. C'est vrai des quatre statistiques de base et d'elles seules — les
 * autres bonus (Précision, Taux critique…) n'ont pas de tuile.
 *
 * Vérifié image par image avant de brancher : les quatre fichiers portent bien les
 * trois lettres annoncées, en blanc sur ardoise.
 */
export const DE_STAT: Record<string, string> = {
  Force: "/jeu/interface/statdice_str.webp",
  Dextérité: "/jeu/interface/statdice_dex.webp",
  Intelligence: "/jeu/interface/statdice_int.webp",
  Endurance: "/jeu/interface/statdice_sta.webp",
};

/** L'étiquette « Ultime » telle que le client la dessine (badge ambre). Le grade
 *  Unique n'a pas d'équivalent dans le dossier : on ne lui en invente pas. */
export const BADGE_ULTIME = "/jeu/interface/icon_ultimate.webp";

/** Le cadenas du client, pour ce qui est lié ou non échangeable. */
export const CADENAS = "/jeu/interface/lock.webp";

/**
 * CE QU'ON NE DEVINE PAS EN JOUANT : COMMENT ON SAIT QU'UN OBJET EST D'AIRFLYFF.
 *
 * La phrase existait DEUX FOIS, en deux versions qui ne disaient pas la même chose —
 * 37 mots dans la bulle du filtre de /wiki, 44 dans celle de /objets, et l'une des deux
 * oubliait les monstres. Un même fait écrit deux fois finit par diverger : il est écrit
 * ici, une fois, et les deux filtres l'affichent. 81 mots servis deviennent 34.
 *
 * Le fait, lui, est de ceux que la brique `Invisible` existe pour porter : aucun écran
 * du jeu ne montre cette différence, elle ne se lit que dans les fichiers du client.
 */
export const MARQUEUR_AIRFLYFF =
  "Aucun écran du jeu ne dit ce qu’AirFlyff a ajouté. Le client, lui, le dit par " +
  "l’espace de noms : IDS_AIRFLYFF_TXT_ et IDS_PROPITEM_NEWSERV_ pour ce que le serveur " +
  "a ajouté, IDS_PROPITEM_TXT_ pour le Flyff d’origine — et NEWSERV sur les monstres.";

/**
 * L'EMPLACEMENT DU CORPS — et le « (mode) » qui était collé aux mauvais codes.
 *
 * Trois paires de codes du client désignent le même endroit du corps sur deux couches
 * différentes (l'équipement et le costume). La table portait un suffixe « (mode) » sur
 * l'un des deux membres de chaque paire, et le rapprochement avec la famille de
 * l'objet — qui, elle, vient d'un autre champ — montre que les trois paires étaient
 * INVERSÉES. Compté sur les 12 134 lignes :
 *
 *   PARTS_BOOTS        645 objets, 100 % de MODE   ← était écrit « Pieds »
 *   PARTS_FOOT         451 objets,  95 % d'ARMURE  ← était écrit « Pieds (mode) »
 *   PARTS_GLOVE        569 objets, 100 % de MODE   ← était écrit « Mains »
 *   PARTS_HAND         437 objets,  98 % d'ARMURE  ← était écrit « Mains (mode) »
 *   PARTS_CLOTH        648 objets, 100 % de MODE   ← était écrit « Buste »
 *   PARTS_UPPER_BODY   452 objets,  95 % d'ARMURE  ← était écrit « Buste (mode) »
 *
 * Soit 3 202 objets dont le marqueur de couche était à l'envers.
 *
 * LE SUFFIXE NE REVIENT PAS À L'ENVERS, IL PART. Deux raisons. D'abord aucun des deux
 * codes n'est pur — PARTS_FOOT porte 23 pièces de mode — donc le code du slot ne peut
 * pas porter ce marqueur de façon sûre. Ensuite le TYPE de l'objet, affiché juste à
 * côté sur la fiche, le dit déjà et le dit juste : « Chaussures (mode) » contre
 * « Bottes ». Écrire « Chaussures (mode) · Pieds (mode) » était un doublon, et un
 * doublon dont une moitié se trompait 3 202 fois. Ce qui reste — l'endroit du corps —
 * est vrai des deux couches.
 */
const EMPLACEMENT: Record<string, string> = {
  PARTS_RWEAPON: "Main droite", PARTS_SHIELD: "Main gauche",
  PARTS_CAP: "Tête", PARTS_HAT: "Tête", PARTS_MASK: "Visage",
  PARTS_CLOTH: "Buste", PARTS_UPPER_BODY: "Buste",
  PARTS_GLOVE: "Mains", PARTS_HAND: "Mains",
  PARTS_BOOTS: "Pieds", PARTS_FOOT: "Pieds",
  PARTS_CLOAK: "Dos", PARTS_RING1: "Doigt", PARTS_NECKLACE1: "Cou",
  PARTS_EARRING1: "Oreilles", PARTS_RIDE: "Monture", PARTS_BULLET: "Munitions",
};
export const emplacementFr = (e: string | undefined) => (e ? EMPLACEMENT[e] ?? null : null);

/**
 * LES CINQ RÉSISTANCES, dans l'ordre des pastilles du jeu — et le dessin que le
 * client leur donne.
 *
 * `image` a été ajoutée parce que le mot seul se répétait : les cinq mêmes
 * libellés sur chaque fiche d'armure, alors que le client dessine ses cinq
 * éléments et que ces images servent déjà sur /monstres et sur le World Boss. Le
 * même élément a donc la même image d'un écran à l'autre, ce qui est tout
 * l'intérêt.
 *
 * ATTENTION AU NOM : le catalogue d'objets appelle la cinquième « foudre », la
 * table des monstres l'appelle « electricite », et le fichier du client s'appelle
 * `element-electricite.webp`. La colonne garde son nom de données, l'image suit
 * le nom du fichier — les confondre affichait une image absente.
 */
export const RESISTANCES: { clef: string; label: string; couleur: string; image: string }[] = [
  { clef: "feu", label: "Feu", couleur: "#F87171", image: "/jeu/mecaniques/element-feu.webp" },
  { clef: "eau", label: "Eau", couleur: "#4EA8FF", image: "/jeu/mecaniques/element-eau.webp" },
  { clef: "vent", label: "Vent", couleur: "#33D6A6", image: "/jeu/mecaniques/element-vent.webp" },
  { clef: "terre", label: "Terre", couleur: "#4ADE80", image: "/jeu/mecaniques/element-terre.webp" },
  { clef: "foudre", label: "Foudre", couleur: "#FFD24A", image: "/jeu/mecaniques/element-electricite.webp" },
];

/**
 * L'ÉLÉMENT PORTÉ PAR UNE PIÈCE — et une traduction qui manquait.
 *
 * Le champ `el` du catalogue n'est pas en français : il porte le code du client,
 * `FIRE`, `WATER`, `ELECTRICITY`, `EARTH`, `WIND`. La fiche l'affichait tel quel,
 * donc 223 objets annonçaient « Élément porté : FIRE ». Un code interne n'est pas
 * un renseignement — la table le traduit et lui donne son dessin du jeu.
 *
 * `null` dès qu'un code inconnu se présente : la ligne garde alors son texte brut
 * plutôt que d'hériter du dessin d'un autre élément. Sur un élément d'arme, on le
 * croirait.
 *
 * LE CHEMIN DE L'IMAGE N'EST PLUS RECOPIÉ ICI. Cette table portait les cinq mêmes
 * `/jeu/mecaniques/element-*.webp` que `RESISTANCES` juste au-dessus : deux listes de
 * chemins à tenir d'accord dans le MÊME fichier, ce qui est le défaut qu'on venait de
 * corriger ailleurs. Seul le CODE du client et le LIBELLÉ restent ici, parce qu'eux
 * seuls sont propres à cette table — l'image se demande à `elementParNom`.
 *
 * ET LES DEUX MOTS DE LA FOUDRE SONT GARDÉS EXPRÈS : le catalogue écrit sa résistance
 * « foudre », le builder écrit « Électricité », et `SectionsObjets.tsx` explique la
 * différence au joueur (« celui qu'on cherche en jeu est foudre »). Unifier ici
 * effacerait une distinction que le site documente. Ce qui devait cesser, c'est que le
 * mot choisi décide de ce que la RECHERCHE trouve : les deux sont indexés.
 */
const CODE_ELEMENT: Record<string, { clef: string; label: string }> = {
  FIRE: { clef: "feu", label: "Feu" },
  WATER: { clef: "eau", label: "Eau" },
  WIND: { clef: "vent", label: "Vent" },
  EARTH: { clef: "terre", label: "Terre" },
  ELECTRICITY: { clef: "foudre", label: "Électricité" },
};

export const elementPorte = (el: string | undefined) => {
  const c = el ? CODE_ELEMENT[el.trim().toUpperCase()] : undefined;
  const img = c ? elementParNom(c.clef) : null;
  return c && img ? { label: c.label, image: img.image } : null;
};

/**
 * LE MÊME ÉLÉMENT SOUS SES QUATRE NOMS — une seule table pour tout le site.
 *
 * Trois relevés nomment la foudre de trois façons différentes, et c'est mesuré :
 *   · `objets-fiches.json`  écrit la résistance « foudre » ;
 *   · `monstres.json`       écrit l'élément « electricite » ;
 *   · `competences.json`    écrit la famille « Foudre », avec sa majuscule ;
 *   · le fichier du client s'appelle `element-electricite.webp`.
 *
 * Chaque écran qui voulait montrer un élément se refaisait donc sa petite table, et
 * `src/lib/wiki.ts` en portait une quatrième — cinq entrées recopiées à la main, dont
 * une avec le commentaire « ATTENTION AU NOM » parce que la confusion avait déjà
 * affiché une image absente. Une seule fonction, tolérante aux accents et à la casse,
 * et le piège se ferme pour de bon.
 *
 * `null` sur un nom inconnu, et sur « aucun » : 170 monstres n'ont pas d'élément, et
 * leur en prêter un serait pire que de n'en montrer aucun.
 */
const PAR_NOM = new Map<string, { label: string; image: string }>();
for (const r of RESISTANCES) {
  const e = { label: r.label, image: r.image };
  PAR_NOM.set(r.clef, e);
  // Le nom de fichier sert de second alias : c'est lui que la table des monstres emploie.
  PAR_NOM.set(r.image.replace(/^.*element-|\.webp$/g, ""), e);
}

export function elementParNom(nom: string | undefined | null): { label: string; image: string } | null {
  if (!nom) return null;
  const k = nom.normalize("NFD").replace(/\p{Mn}/gu, "").toLowerCase().trim();
  return PAR_NOM.get(k) ?? null;
}

/**
 * Comparaison tolérante aux accents : le jeu écrit « Ame de démon » sans
 * circonflexe et un joueur tape « Âme ». Sans cette normalisation, la moitié
 * des recherches ne trouve rien. Même fonction que /api/ou-trouver.
 */
export const clefRecherche = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/*
 * IL Y AVAIT ICI `penyas(n)`, qui mettait un prix du client en forme (« 2 Md »).
 * Le champ `px` reste dans les données, mais plus aucun écran ne l'affiche : les
 * montants ne servent pas, et un prix de PNJ n'a de toute façon rien à voir avec le
 * marché entre joueurs. Ce qui sert, c'est de savoir qu'un PNJ le vend — pas combien.
 */
