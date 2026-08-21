// ════════════════════════════════════════════════════════════════════════════
//  LE CONTRAT DU MOTEUR DE DÉGÂTS
//
//  Un moteur de dégâts qui rend un nombre nu est inutilisable : personne ne peut
//  dire si le nombre est bon. Celui-ci rend donc une LISTE DE TERMES, et chaque
//  terme porte trois choses — sa valeur, l'endroit d'où le chiffre sort, et le
//  degré de confiance qu'on lui accorde. L'écran peut alors montrer le calcul
//  ligne par ligne au lieu de l'affirmer.
//
//  LA RÈGLE QUI GOUVERNE TOUT LE MODULE, posée par Maxime :
//  « un dégât faux est pire qu'un dégât absent ». Quand un facteur manque dans
//  les relevés du client, le moteur ne l'estime pas : il le pousse dans
//  `nonPrisEnCompte` et le calcul continue sans lui, en le disant.
// ════════════════════════════════════════════════════════════════════════════

/**
 * D'où vient un chiffre, et ce qu'on peut en attendre.
 *
 * · `client`         — lu tel quel dans un fichier du client Airborn. C'est un
 *                      fait : la valeur est celle que le serveur emploie.
 * · `flyff-officiel` — la FORME du calcul vient du Flyff officiel (c'est ce que
 *                      Flyffulator applique). Airborn a changé des valeurs :
 *                      un terme marqué ainsi n'est PAS confirmé sur ce serveur.
 * · `inconnu`        — ni l'un ni l'autre. Un terme `inconnu` ne doit jamais
 *                      entrer dans un produit : il part dans `nonPrisEnCompte`.
 */
export type Certitude = "client" | "flyff-officiel" | "inconnu";

/** L'unité dans laquelle un terme se lit, pour que l'écran l'écrive juste. */
export type Unite = "points" | "pourcent" | "facteur" | "ms" | "parSeconde";

/** Une ligne du calcul. C'est l'unité de preuve du moteur. */
export type Terme = {
  /** Identifiant stable, pour qu'un écran puisse styler ou masquer une ligne. */
  cle: string;
  /** Ce qu'on écrit à l'écran, en français. */
  libelle: string;
  valeur: number;
  /** Deuxième valeur quand le terme est une fourchette (min…max). */
  valeurMax?: number;
  unite: Unite;
  /** Le fichier, la colonne, la ligne. Assez précis pour aller vérifier. */
  source: string;
  certitude: Certitude;
  /** Ce qu'il faut savoir en plus, quand le chiffre seul induirait en erreur. */
  note?: string;
};

/**
 * Le résultat d'un calcul complet.
 *
 * `degatsMin`/`degatsMax` sont la fourchette, jamais un nombre unique : les
 * armes et les compétences du client portent toutes deux bornes, et écraser la
 * fourchette en moyenne cache la moitié de l'information.
 */
export type Resultat = {
  /** La phrase qui dit ce qui a été calculé, y compris contre quoi. */
  quoi: string;
  degatsMin: number;
  degatsMax: number;
  degatsMoyen: number;
  /** Le calcul, dans l'ordre où il s'applique. */
  termes: Terme[];
  /** Les réserves à afficher AVEC le nombre. Non facultatives. */
  reserves: string[];
  /** Ce que le client ne dit pas, et qui manque donc au résultat. */
  nonPrisEnCompte: string[];
  /** Intervalle entre deux coups, en millisecondes. `null` = pas dans le relevé. */
  cadenceMs: number | null;
  degatsParSeconde: number | null;
  /** Coups nécessaires pour vider la cible, quand la cible est connue. */
  coupsPourTuer: number | null;
  secondesPourTuer: number | null;
};

// ════════════════════════════════════════════════════════════════════════════
//  CE QUE LE MOTEUR ATTEND DU LOT VOISIN — src/lib/statistiques/**
//
//  Au moment d'écrire ce module, `src/lib/statistiques/**` n'existait pas. Le
//  moteur travaille donc contre l'interface ci-dessous, qui est le strict
//  minimum dont un calcul de dégâts a besoin. Le lot voisin n'a rien à changer
//  ici : il lui suffit d'exposer une fonction qui rend un `Combattant`.
//
//  QUATRE EXIGENCES, et aucune n'est cosmétique :
//
//  1. LES QUATRE STATISTIQUES SONT DES TOTAUX, points investis PLUS tous les
//     bonus d'équipement, déjà résolus. Le moteur ne connaît pas l'ordre dans
//     lequel `DST_STR` (plat) et `DST_STR_PERCENT` (proportionnel) se composent
//     — c'est au lot des statistiques de trancher, et de le documenter là-bas.
//
//  2. `bonus` NE CONTIENT PAS `DST_STR`, `DST_DEX`, `DST_INT`, `DST_STA` ni
//     leurs variantes `_PERCENT`, ni `DST_STAT_ALLUP` : ces cinq-là sont DÉJÀ
//     dans les quatre totaux. Les laisser dans `bonus` les compterait deux fois.
//     Tous les autres codes `DST_*` y sont, additionnés, dans l'unité du client.
//
//  3. LES QUATRE TOTAUX *PLATS* SONT DEMANDÉS EN PLUS, et c'est la demande qui
//     pèse le plus lourd sur un dégât. Un « total plat » vaut les points investis
//     plus les bonus PLATS (`DST_STR`, `DST_STAT_ALLUP`), SANS les variantes en
//     pourcentage. Cinq formules du moteur ont besoin de ce chiffre-là et pas du
//     total : l'apport de la statistique à l'attaque ordinaire, la mise à
//     l'échelle d'une compétence, la vitesse d'attaque, le taux critique et le
//     taux de touche. Toutes les cinq lisent, chez le Flyff officiel, une valeur
//     qui EXCLUT le pourcentage.
//     MESURÉ, pour qu'on voie l'enjeu : Électrocution niveau 5 sur Elun, avec
//     900 points investis, +120 d'Intelligence plate et +20 % portés par la
//     Baguette en Yggdrasil, rend 36 192 en lisant le total (1 224) et 30 865 en
//     lisant le total plat (1 020). L'écart est de 17 %.
//     Les quatre champs sont FACULTATIFS : quand ils manquent le moteur retombe
//     sur les totaux et repart avec `RESERVE_STATS_PLATES`. Il ne peut pas
//     retrouver le chiffre lui-même, puisque l'exigence 2 lui interdit de voir
//     les codes `_PERCENT`.
//     LE RACCORDEMENT EST DÉJÀ FAIT DE L'AUTRE CÔTÉ : `src/lib/statistiques`
//     rend `attributs.Force.total`, qu'il documente lui-même comme « somme sans
//     aucun pourcentage : c'est la valeur employée par les formules dérivées »,
//     et garde le pourcentage à part dans `pourcent` et `lectures`. Le lot voisin
//     est donc arrivé à la même conclusion de son côté. Le branchement à écrire
//     est littéralement :
//         forcePlate        ← attributs.Force.total
//         endurancePlate    ← attributs.Endurance.total
//         dexteritePlate    ← attributs["Dextérité"].total
//         intelligencePlate ← attributs.Intelligence.total
//     et les quatre champs `force`/`endurance`/`dexterite`/`intelligence` gardent
//     le total avec pourcentage, pour l'affichage et pour les formules qui le
//     veulent vraiment.
//
//  4. LES PALIERS D'ACCESSOIRE REMPLACENT, ILS NE S'ADDITIONNENT PAS. Un bijou
//     amélioré ne cumule pas les gains de ses paliers : le palier atteint donne
//     la valeur, un point final. La preuve tient dans le relevé : les Boucles
//     d'Oreille Harpe portent « Attaque » 1 000 aux paliers 20 À 30 — onze
//     paliers de suite à la même valeur. Sommés, ils annonceraient 11 000
//     d'attaque.
//     MESURÉ sur le moteur : un `DST_ATKPOWER` de 1 000 contre un Ripper donne
//     6 316 de moyenne, le même à 11 000 en donne 16 821 — deux fois et demie
//     trop. Le moteur ne peut PAS détecter la faute, il ne reçoit qu'une somme :
//     c'est donc au lot des statistiques de ne sommer que les paliers d'objets
//     DIFFÉRENTS, et jamais les paliers successifs d'un même objet.
// ════════════════════════════════════════════════════════════════════════════

/** Les cinq éléments d'Airborn, écrits comme `monstres.json` les écrit. */
export type Element = "feu" | "eau" | "vent" | "terre" | "electricite";

/** Une arme en main, telle que le moteur a besoin de la lire. */
export type ArmeEquipee = {
  /** La clé `II_*` du client, pour retrouver la ligne d'origine. */
  cle: string;
  nom: string;
  /** `t2` du relevé — WEAPON_ONESWORD, WEAPON_TWOAXE, WEAPON_BOW… */
  categorie: string;
  /** `wt` du relevé — MELEE_SWD, RANGE_BOW, MAGIC_WAND… */
  typeArme: string;
  /** `dn` — dwAbilityMin. Dégâts mini de l'arme, tels qu'écrits. */
  degatsMin: number;
  /** `dx` — dwAbilityMax. */
  degatsMax: number;
  /** `va` — dwAttackSpeed. Un petit décimal, 0,025 à 0,085. */
  vitesse: number;
  /** Le +N. Il est RECOPIÉ, jamais compté : voir `PALIER_NON_CALCULABLE`. */
  upgrade: number;
  /** L'élément posé sur l'arme par une pierre, et son palier. */
  element: Element | null;
  paliersElement: number;
};

/** Les quatre statistiques, nommées comme le combattant les porte. */
export type ChampStat = "force" | "endurance" | "dexterite" | "intelligence";

/**
 * Le porteur du calcul. C'est la forme que `src/lib/statistiques/**` doit rendre.
 */
export type Combattant = {
  niveau: number;
  /** La clé de `propJob.inc` — VAGRANT, BLADE_HERO, ELEMENTOR_MASTER… */
  classe: string;
  /** TOTAUX, bonus d'équipement compris. Voir les quatre exigences ci-dessus. */
  force: number;
  endurance: number;
  dexterite: number;
  intelligence: number;
  /**
   * LES TOTAUX PLATS — points investis plus les bonus PLATS, SANS les variantes
   * en pourcentage. Facultatifs, et c'est bien dommage : cinq formules les
   * veulent (exigence 3). Absents, le moteur emploie les totaux et le dit.
   */
  forcePlate?: number;
  endurancePlate?: number;
  dexteritePlate?: number;
  intelligencePlate?: number;
  /** Les autres bonus, par code `DST_*`, additionnés. */
  bonus: Record<string, number>;
  armeDroite: ArmeEquipee | null;
  armeGauche: ArmeEquipee | null;
};

/**
 * LA STATISTIQUE À FAIRE ENTRER DANS UNE FORMULE D'ÉCHELLE.
 *
 * Un seul endroit décide, pour que les cinq formules concernées lisent la même
 * chose : le total plat quand le lot des statistiques l'a fourni, le total sinon.
 * `plate` dit lequel des deux a été employé — l'appelant s'en sert pour joindre
 * `RESERVE_STATS_PLATES` au résultat quand la réponse est `false`.
 */
export function statPourEchelle(c: Combattant, champ: ChampStat): { valeur: number; plate: boolean } {
  const plates: Record<ChampStat, number | undefined> = {
    force: c.forcePlate,
    endurance: c.endurancePlate,
    dexterite: c.dexteritePlate,
    intelligence: c.intelligencePlate,
  };
  const v = plates[champ];
  return typeof v === "number" ? { valeur: v, plate: true } : { valeur: c[champ], plate: false };
}

/** La cible, telle que `public/wiki/monstres.json` la décrit. */
export type Cible = {
  id: string;
  nom: string;
  niveau: number;
  rang: string;
  /** `pvEff` du relevé : PV × vies. C'est ce qu'il faut réellement sortir. */
  pointsDeVie: number;
  /** Le nombre de vies, quand le monstre en a plusieurs. */
  vies: number | null;
  defense: number;
  resistanceMagique: number;
  esquive: number;
  /** Les cinq colonnes, telles quelles. `null` = colonne illisible. */
  resistances: Partial<Record<Element, number | null>>;
  element: string | null;
  /** `delai` — l'intervalle entre deux coups DU MONSTRE, en ms. */
  delaiMs: number | null;
};

// ── Les phrases qui accompagnent obligatoirement un chiffre ────────────────

/**
 * LA RÉSERVE PRINCIPALE. Elle part avec tout résultat qui traverse une défense.
 * Elle reprend mot pour mot la réserve déjà posée dans `data.json` (`SRC.reserve`)
 * pour que le site ne dise pas deux choses différentes du même sujet.
 */
export const RESERVE_DEFENSE =
  "La formule de réduction par la défense n'a PAS été confirmée sur Airborn : sa forme vient du Flyff officiel. Le nombre affiché est la somme de ce qui est ÉCRIT dans le client, pas un dégât mesuré en jeu.";

/** Le +N d'amélioration. Le texte est celui de `MECH.arme.nonCalculable`. */
export const PALIER_NON_CALCULABLE =
  "propEnchant.inc ne donne que des coefficients ; ce qu'ils multiplient n'est écrit dans aucun fichier du client. Le +N est donc annoncé comme non compté, jamais estimé.";

/**
 * LES STATISTIQUES TOTALES EMPLOYÉES FAUTE DE MIEUX. Voir l'exigence 3.
 * Elle part avec tout résultat dont une échelle a lu un total au lieu d'un total
 * plat — c'est-à-dire, aujourd'hui, tous.
 */
export const RESERVE_STATS_PLATES =
  "Les statistiques employées dans les mises à l'échelle sont les TOTAUX, pourcentages compris. La forme du Flyff officiel lit à cet endroit une valeur qui EXCLUT les variantes en pourcentage (DST_STR_PERCENT et compagnie). Le nombre affiché est donc surévalué de tout ce que ces pourcentages rapportent — 17 % sur un porteur de Baguette en Yggdrasil. Le moteur ne peut pas corriger seul : il lui faut les quatre totaux plats.";

/**
 * L'ORDRE DES BONUS D'ATTAQUE. Le client donne les valeurs, pas leur place dans
 * la formule. Elle part avec tout résultat où un `_RATE` et un plat coexistent.
 */
export const RESERVE_ORDRE_BONUS =
  "L'ordre retenu est : d'abord le multiplicateur d'Attaque % (DST_ATKPOWER_RATE), ensuite l'ajout d'Attaque plate (DST_ATKPOWER). Le client n'écrit nulle part lequel des deux vient en premier ; l'ordre inverse donne 2,3 % de plus sur un porteur d'Épée en Yggdrasil. Un pourcentage ne s'additionne jamais à un absolu : les deux sont bien appliqués séparément, mais leur ORDRE est une hypothèse.";

/**
 * LES PALIERS D'ACCESSOIRE. Voir l'exigence 4. Elle part avec tout résultat qui
 * emploie un bonus susceptible de venir d'un palier de bijou.
 */
export const RESERVE_PALIERS_ACCESSOIRE =
  "Un palier d'accessoire REMPLACE la valeur du palier précédent, il ne s'y ajoute pas : les Boucles d'Oreille Harpe portent « Attaque » 1 000 aux paliers 20 à 30, et les sommer annoncerait 11 000. Le moteur reçoit une somme déjà faite et ne peut pas vérifier ce point : le nombre affiché n'est juste que si les paliers successifs d'un même objet n'ont PAS été cumulés en amont.";

/** Fabrique un terme. Un seul endroit, pour que la forme ne dérive pas. */
export function terme(t: Terme): Terme {
  return t;
}
