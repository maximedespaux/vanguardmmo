/**
 * LE MOTEUR DE CALCUL — et surtout, LA TRAÇABILITÉ DE CHAQUE TERME.
 *
 * Demande de Maxime, mot pour mot : « il faut toutes les spécificités, assets,
 * artefact, arme ultime, les bonus etc… pour mieux réaliser les statistiques, avoir
 * les compétences skills en fonction des spells etc… pour voir le rendu dégâts etc…
 * comme le Flyffulator. » Et la contrainte qui va avec, la sienne aussi : « un dégât
 * faux est pire qu'un dégât absent. »
 *
 * ┌──────────── CE QUI REND CE FICHIER DIFFÉRENT D'UN CALCULATEUR ────────────┐
 * │ Un calculateur rend UN NOMBRE. Ici chaque opération rend une LISTE DE      │
 * │ TERMES, et chaque terme porte trois choses : sa valeur, la PHRASE qui dit  │
 * │ d'où elle vient, et son degré de certitude. Le nombre final n'est qu'un    │
 * │ sous-produit — c'est le chemin qui s'affiche.                              │
 * │                                                                           │
 * │ Conséquence pratique : un terme dont on ignore la valeur ne disparaît PAS  │
 * │ du calcul. Il y reste, en `absent`, et l'écran dit « non pris en compte :  │
 * │ la valeur n'est pas dans le client » à sa place. Un total amputé en        │
 * │ silence se compare entre deux builds comme s'il était complet ; un total   │
 * │ amputé À VOIX HAUTE ne trompe personne.                                    │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * ┌──────────────────────── LA LICENCE, ET CE QU'ELLE INTERDIT ────────────────┐
 * │ Flyffulator est sous GPL v3 : recopier son code obligerait à publier tout   │
 * │ ce site sous GPL v3. Son code a donc été LU pour comprendre l'ORDRE DES     │
 * │ OPÉRATIONS de Flyff — une mécanique de jeu ne s'approprie pas — puis        │
 * │ ré-écrit ici, en français, sur les relevés d'Airborn. Aucune fonction,     │
 * │ aucun nom de variable, aucun commentaire n'en vient.                       │
 * │                                                                            │
 * │ ET C'EST AUSSI UNE PRÉCAUTION DE JUSTESSE, pas seulement de droit : ses     │
 * │ formules sont celles du Flyff OFFICIEL. Airborn a changé des valeurs. Tout │
 * │ ce qui vient de la mécanique officielle et non d'un fichier du client est   │
 * │ donc marqué `hypothese`, et l'écran le dit.                                │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * AUCUN `fs`, AUCUN IMPORT DE RELEVÉ ICI. Ce module est de l'arithmétique pure : il
 * reçoit des nombres déjà lus et rend des termes. C'est ce qui permet de l'employer
 * côté serveur (la planche des mécaniques) comme côté navigateur, et de le tester
 * sans monter un serveur.
 */

/* ── Ce que vaut un nombre ──────────────────────────────────────────────────── */

/**
 * LE DEGRÉ DE CERTITUDE D'UN TERME. Quatre valeurs, et l'ordre compte : c'est celui
 * dans lequel un terme perd de sa valeur de preuve.
 *
 *  · `client`    — le nombre est écrit dans un fichier du client Airborn. Rien à
 *                  discuter : on le lit, on le montre, on cite le fichier.
 *  · `deduit`    — le nombre n'est pas écrit mais se calcule sans choix arbitraire
 *                  sur des nombres du client (une somme, un produit, un comptage).
 *  · `hypothese` — la MÉCANIQUE vient du Flyff officiel et n'est pas confirmée sur
 *                  Airborn. Le nombre s'affiche, jamais sans sa réserve.
 *  · `absent`    — la donnée n'existe pas dans le client. Le terme s'affiche à sa
 *                  place dans le calcul, sans valeur, et dit pourquoi.
 */
export type Certitude = "client" | "deduit" | "hypothese" | "absent";

/* CES QUATRE PHRASES S'AFFICHENT DANS CHAQUE BULLE, soit une quarantaine de fois
   sur la page. Chaque mot y est donc payé quarante fois : elles restent courtes, et
   c'est la source qui suit qui porte le détail. */
export const CERTITUDE_MOT: Record<Certitude, string> = {
  client: "Lu dans le client",
  deduit: "Calculé sur le client",
  hypothese: "Mécanique officielle, non confirmée ici",
  absent: "Absent du client",
};

/** La teinte de chaque degré. Elle ne porte JAMAIS la grandeur d'un nombre — voir
 *  `Barre` : une seule teinte par colonne, c'est la longueur qui compare. Ici la
 *  couleur ne dit qu'une chose : à quel point on peut se fier au terme. */
export const CERTITUDE_TON: Record<Certitude, string> = {
  client: "var(--green)",
  deduit: "var(--blue)",
  hypothese: "var(--gold)",
  absent: "var(--red)",
};

/** UN TERME DU CALCUL. `valeur` à `null` = le terme existe et sa valeur, non. */
export type Terme = {
  /** Ce que le terme apporte, en français, sans jargon de fichier. */
  quoi: string;
  valeur: number | null;
  /**
   * CE QUI S'ÉCRIT À LA PLACE DU NOMBRE, quand il n'y a pas de nombre À DIRE et non
   * pas de nombre À TROUVER. Sans ce champ, l'écran met « non pris en compte : la
   * valeur n'est pas dans le client » sur tout terme sans valeur — y compris sur le
   * cumul des paliers d'un bijou, dont les trois nombres sont pourtant TOUS dans le
   * client et qui n'a pas de total pour une autre raison : ils ne partagent pas leur
   * unité. Deux silences différents ne se disent pas de la même façon.
   */
  valeurTexte?: string;
  /** D'où sort le nombre : le fichier du client, ou le relevé, ou la mécanique. */
  source: string;
  certitude: Certitude;
  /** L'opération écrite, quand elle n'est pas une simple addition. */
  detail?: string;
};

/** UNE ÉTAPE : un groupe de termes, sa formule, son résultat. */
export type Etape = {
  nom: string;
  /** La formule en français. Elle s'affiche : c'est elle qui rend le calcul lisible. */
  formule: string;
  termes: Terme[];
  /** Le résultat de l'étape. Un intervalle quand le jeu tire au hasard. */
  resultat: number | null;
  resultatMax?: number | null;
  /**
   * L'UNITÉ DE CETTE ÉTAPE, quand elle n'est pas celle du total.
   *
   * Le cas qui l'a rendue nécessaire : la feuille du monstre finit en COUPS, mais ses
   * deux premières étapes rendent des DÉGÂTS. Faute de ce champ, l'écran écrivait
   * « → 1 990 coups » puis « → 2 587 coups » avant d'annoncer 235 582 coups — trois
   * nombres croissants dans la même unité, dont deux faux.
   */
  unite?: string;
  /** Ce que l'étape ne sait pas, dit en une phrase. */
  reserve?: string;
};

/** UNE FEUILLE DE CALCUL : la suite d'étapes qui mène au nombre, et ses réserves. */
export type Feuille = {
  titre: string;
  /** Le sujet en une ligne : quelle arme, quelle classe, quel monstre. */
  sujet: string;
  etapes: Etape[];
  resultat: number | null;
  resultatMax?: number | null;
  /**
   * QUAND LE TOTAL NE S'ADDITIONNE PAS, ON ÉCRIT CE QU'IL EST À LA PLACE.
   *
   * La panoplie a payé cette leçon : sa feuille affichait « −800 points, toutes
   * lignes confondues » en sommant « Dégâts JcJ +130 », « Attaque % +200 » et
   * « Précision −500 ». Additionner des points et des pourcentages ne donne rien,
   * et le nombre obtenu se comparait entre deux panoplies comme s'il voulait dire
   * quelque chose. Renseigné, ce champ remplace le nombre.
   */
  resultatTexte?: string;
  /** L'unité du résultat — « dégâts », « points d'Attaque », « % ». */
  unite: string;
  /** Ce qui reste ouvert. Vide = le calcul est exact, et il faut pouvoir le dire. */
  reserves: string[];
};

export const estExacte = (f: Feuille) =>
  f.reserves.length === 0 && f.etapes.every((e) => e.termes.every((t) => t.certitude === "client" || t.certitude === "deduit"));

/** Somme des termes chiffrés d'une étape. Les termes `absent` ne comptent pas — c'est
 *  précisément ce que l'écran doit annoncer, pas ce qu'il doit deviner. */
export const sommeDe = (termes: Terme[]) =>
  termes.reduce((s, t) => s + (t.valeur ?? 0), 0);

/**
 * UN NOMBRE ÉCRIT EN FRANÇAIS, y compris dans les formules détaillées.
 *
 * Ce n'est pas une coquetterie : ces chaînes s'affichent telles quelles dans les
 * bulles, et une première version rendait « (300 − 12) × 4.5 » au milieu d'une phrase
 * française. Un point décimal anglais dans un calcul se lit, dans le meilleur des
 * cas, comme un séparateur de milliers — « 4.5 » pour quarante-cinq.
 *
 * L'espace insécable des milliers est volontairement ABSENT sous dix mille : dans une
 * formule serrée, « 3 912 » se lit comme deux nombres.
 */
export const nb = (v: number) =>
  Math.abs(v) >= 10000 ? v.toLocaleString("fr-FR") : String(v).replace(".", ",");

/**
 * « la Force », mais « l'Endurance ». L'élision se calcule sur la première lettre :
 * sans elle, l'écran écrivait « Échelle sur la Endurance », et une faute d'accord dans
 * un écran qui prétend à la rigueur discrédite les nombres qui l'entourent.
 */
export const laStat = (stat: string) =>
  /^[aeiouyéèêAEIOUYÉÈÊ]/.test(stat) ? `l'${stat}` : `la ${stat}`;

/* ── Les familles d'arme ────────────────────────────────────────────────────── */

/**
 * LE NOM D'UNE FAMILLE D'ARME N'EST PAS LE MÊME DANS LES DEUX RELEVÉS, et c'est un
 * piège silencieux : une correspondance manquée rend un facteur `undefined`, donc un
 * dégât de zéro, sans erreur visible.
 *
 *   objets-stats.json ▸ `k3`          bonus-sources.json ▸ colonnes de classe
 *   SWD                                SWD
 *   AXE                                AXE
 *   STAFF                              STAFF
 *   CHEERSTICK                         STICK
 *   KNUCKLEHAMMER                      KNUCKLE
 *   WAND                               WAND
 *   YOYO                               YOYO
 *   BOW                                — AUCUNE COLONNE
 *
 * L'ARC N'A PAS DE COLONNE. Les dix-huit colonnes du tableau de classe ne comptent
 * que sept familles d'arme, et l'arc n'en fait pas partie. Son apport de statistique
 * ne se calcule donc pas sur ce relevé : `facteurDeFamille` rend `null`, et le terme
 * part en `absent` plutôt qu'en zéro.
 */
export const FAMILLE_COLONNE: Record<string, string | null> = {
  SWD: "SWD", AXE: "AXE", STAFF: "STAFF", CHEERSTICK: "STICK",
  KNUCKLEHAMMER: "KNUCKLE", WAND: "WAND", YOYO: "YOYO", BOW: null, CROSSBOW: null,
};

/** Le nom français d'une famille, pour l'écran. */
export const FAMILLE_FR: Record<string, string> = {
  SWD: "épée", AXE: "hache", STAFF: "bâton", CHEERSTICK: "bâton de joie",
  KNUCKLEHAMMER: "poing", WAND: "baguette", YOYO: "yo-yo", BOW: "arc", CROSSBOW: "arbalète",
};

/**
 * LES DEUX CONSTANTES DE MOTEUR QUI NE SONT PAS DANS LE CLIENT.
 *
 * L'apport de statistique d'une arme se lit, dans la mécanique de Flyff, comme
 * « (la statistique de référence MOINS un retrait) FOIS le facteur de famille de la
 * classe ». Le FACTEUR vient du client d'Airborn (tableau des classes). Le RETRAIT
 * et le facteur de niveau, non : ce sont des constantes du moteur officiel, absentes
 * de tout fichier lu jusqu'ici.
 *
 * Elles sont donc rassemblées ICI, dans un seul objet nommé pour ce qu'il est, et
 * tout terme qui s'en sert part en `hypothese`. Le jour où un relevé les donne, il y
 * a un seul endroit à corriger — et un seul degré de certitude à relever.
 */
export const CONSTANTES_HYPOTHESE = {
  retrait: { SWD: 12, AXE: 12, YOYO: 12, STAFF: 10, CHEERSTICK: 10, KNUCKLEHAMMER: 10, WAND: 10 } as Record<string, number>,
  facteurDeNiveau: { SWD: 1.1, YOYO: 1.1, STAFF: 1.1, AXE: 1.2, KNUCKLEHAMMER: 1.2, WAND: 1.2, CHEERSTICK: 1.3 } as Record<string, number>,
  /** Le socle d'une arme compte DOUBLE dans l'attaque automatique. */
  doublementDuSocle: 2,
  /**
   * LE SOCLE D'UNE COMPÉTENCE COMPTE CINQ FOIS. Il était écrit en dur dans la
   * fonction, et — bien pire — le terme qui s'en servait portait la pastille verte
   * « lu dans le client » et citait propSkill.txt : le client y écrit `dmin`, il
   * n'écrit NULLE PART qu'il faut le multiplier par cinq. Une hypothèse déguisée en
   * relevé est le seul défaut que cet écran ne peut pas se permettre.
   */
  quintuplementDuSocleDeCompetence: 5,
  /** La réduction par la défense : le poids de l'attaque dans la somme du dénominateur. */
  poidsDeLAttaque: 2,
  /* LA PHRASE EST COURTE EXPRÈS. Elle s'affiche dans CINQ bulles de la page : une
     source de vingt mots y coûtait cent mots servis. L'explication complète (le
     pourquoi de la licence, ce qui a été lu et ce qui a été réécrit) est dans
     l'en-tête de ce fichier et dans le volet, une seule fois. */
  source: "Mécanique du Flyff officiel — aucun fichier du client Airborn ne l'écrit.",
};

/* ── 1. La puissance d'une arme, coup par coup ──────────────────────────────── */

export type Arme = {
  id: number; nom: string; cle?: string;
  /** Les deux bornes du socle, champs `dn` et `dx` du relevé d'objets. */
  degatsMin: number; degatsMax: number;
  famille: string;
  niveauRequis?: number | null;
  /** Les bonus propres, déjà traduits : [libellé français, valeur]. */
  bonus?: [string, number][];
};

export type Porteur = {
  classe: string;
  /** Le nom français de la classe, pour la phrase de l'écran. */
  classeFr?: string;
  niveau: number;
  /** Les quatre statistiques attribuées, telles que le joueur les a réparties. */
  force: number; endurance: number; dexterite: number; intelligence: number;
  /** Le facteur de famille d'arme lu dans le tableau des classes du client. */
  facteurDeFamille: number | null;
};

/**
 * LA PUISSANCE D'UN COUP À L'ARME — l'intervalle dans lequel le jeu tire.
 *
 * L'ordre, et il ne s'invente pas : le socle de l'arme compte double, on y ajoute
 * l'apport de la statistique de référence, l'apport du niveau, puis les points
 * d'Attaque plats des pièces. Le PALIER D'AMÉLIORATION s'appliquerait ici, en
 * multiplicateur — et c'est exactement le terme qu'on ne peut pas chiffrer.
 *
 * `bonusAttaquePlat` : la somme des lignes « Attaque » des pièces portées, en points.
 * `pourcentDAttaque` : la somme des lignes « Attaque % », appliquée APRÈS.
 */
export function puissanceDArme(
  arme: Arme,
  porteur: Porteur,
  opts: { bonusAttaquePlat?: number; pourcentDAttaque?: number; palierDAmelioration?: number } = {},
): Feuille {
  const fam = arme.famille;
  const retrait = CONSTANTES_HYPOTHESE.retrait[fam];
  const facteurNiveau = CONSTANTES_HYPOTHESE.facteurDeNiveau[fam];
  /* La baguette lit l'Intelligence, l'arc la Dextérité, tout le reste la Force.
     C'est la statistique de référence de la famille, pas un choix de build. */
  const statNom = fam === "WAND" ? "Intelligence" : fam === "BOW" || fam === "CROSSBOW" ? "Dextérité" : "Force";
  const statVal = fam === "WAND" ? porteur.intelligence : fam === "BOW" || fam === "CROSSBOW" ? porteur.dexterite : porteur.force;

  const socleMin = arme.degatsMin * CONSTANTES_HYPOTHESE.doublementDuSocle;
  const socleMax = arme.degatsMax * CONSTANTES_HYPOTHESE.doublementDuSocle;

  const apportStat = porteur.facteurDeFamille != null && retrait != null
    ? Math.floor((statVal - retrait) * porteur.facteurDeFamille)
    : null;
  const apportNiveau = facteurNiveau != null ? Math.floor(porteur.niveau * facteurNiveau) : null;
  const plat = opts.bonusAttaquePlat ?? 0;

  const termesSocle: Terme[] = [
    {
      quoi: `Socle de l'arme, compté double (${arme.degatsMin} à ${arme.degatsMax})`,
      valeur: socleMin,
      detail: `${arme.degatsMin} × ${CONSTANTES_HYPOTHESE.doublementDuSocle} = ${nb(socleMin)} · borne haute ${arme.degatsMax} × ${CONSTANTES_HYPOTHESE.doublementDuSocle} = ${nb(socleMax)}`,
      source: `objets-stats.json ▸ ${arme.cle ?? arme.nom}, champs dn et dx (Spec_Item.txt du client)`,
      certitude: "hypothese",
    },
    {
      quoi: `Apport de ${laStat(statNom)} (${statVal} − ${retrait ?? "?"}) × ${porteur.facteurDeFamille != null ? nb(porteur.facteurDeFamille) : "?"}`,
      valeur: apportStat,
      detail: apportStat != null
        ? `(${statVal} − ${retrait}) × ${nb(porteur.facteurDeFamille!)} = ${nb(apportStat)}`
        : `Le tableau des classes du client ne porte AUCUNE colonne pour l'${FAMILLE_FR[fam] ?? fam} : le facteur n'existe pas dans le relevé.`,
      source: porteur.facteurDeFamille != null
        ? `bonus-sources.json ▸ facteursDeClasse, colonne ${FAMILLE_COLONNE[fam]} de ${porteur.classe} (propJob.inc). Le retrait de ${retrait} vient de la mécanique officielle.`
        : "bonus-sources.json ▸ facteursDeClasse : les 18 colonnes ne couvrent que 7 familles d'arme, l'arc n'en fait pas partie.",
      certitude: apportStat != null ? "hypothese" : "absent",
    },
    {
      quoi: `Apport du niveau ${porteur.niveau} × ${facteurNiveau != null ? nb(facteurNiveau) : "?"}`,
      valeur: apportNiveau,
      detail: apportNiveau != null ? `${porteur.niveau} × ${nb(facteurNiveau)} = ${nb(apportNiveau)}` : undefined,
      source: CONSTANTES_HYPOTHESE.source,
      certitude: apportNiveau != null ? "hypothese" : "absent",
    },
  ];

  const brutMin = socleMin + (apportStat ?? 0) + (apportNiveau ?? 0);
  const brutMax = socleMax + (apportStat ?? 0) + (apportNiveau ?? 0);

  const etapes: Etape[] = [
    {
      nom: "L'intervalle du coup",
      formule: "socle × 2 + apport de statistique + apport de niveau",
      termes: termesSocle,
      resultat: brutMin,
      resultatMax: brutMax,
    },
  ];

  /* ── LE PALIER D'AMÉLIORATION : UN TERME SANS VALEUR, ET C'EST VOULU ──────
     propEnchant.inc pèse 167 octets et ne donne que des coefficients (NORMAL_SCAL,
     ALL_SCAL sur dix colonnes L1…L10). CE QU'ILS MULTIPLIENT n'est écrit dans aucun
     fichier du client. La mécanique officielle applique un facteur de ce genre au
     socle de l'arme — mais « de ce genre » ne se chiffre pas.
     Règle de Maxime : « un dégât faux est pire qu'un dégât absent. » */
  const up = opts.palierDAmelioration ?? 0;
  if (up > 0) {
    etapes.push({
      nom: `Le palier +${up}`,
      formule: "socle × facteur du palier, puis + un bonus fixe",
      termes: [{
        quoi: `+${up} non pris en compte`,
        valeur: null,
        detail: `propEnchant.inc donne des coefficients (NORMAL_SCAL, ALL_SCAL) sur dix colonnes, sans dire ce qu'ils multiplient. Un +${up} affiché ici serait une invention.`,
        source: "Client/FSDATA/COMMON/Systems ▸ propEnchant.inc (167 octets)",
        certitude: "absent",
      }],
      resultat: brutMin,
      resultatMax: brutMax,
      reserve: `Le gain du palier +${up} n'est pas dans les données : le nombre affiché est celui d'une arme à +0.`,
    });
  }

  /* Les pourcentages d'Attaque multiplient l'intervalle, ils ne s'y ajoutent pas :
     c'est ce qui fait qu'une ligne « Attaque % » vaut d'autant plus que le socle est
     gros, et qu'on ne peut pas la comparer à des points plats. */
  const pct = opts.pourcentDAttaque ?? 0;
  let finMin = brutMin, finMax = brutMax;
  if (pct) {
    finMin = Math.floor(brutMin * (1 + pct / 100));
    finMax = Math.floor(brutMax * (1 + pct / 100));
    etapes.push({
      nom: "Les pourcentages d'Attaque",
      formule: "intervalle × (1 + somme des Attaque % ÷ 100)",
      termes: [{
        quoi: `Attaque +${pct} %`,
        valeur: pct,
        detail: `${nb(brutMin)} × ${nb(Math.round((1 + pct / 100) * 100) / 100)} = ${nb(finMin)} · ${nb(brutMax)} × ${nb(Math.round((1 + pct / 100) * 100) / 100)} = ${nb(finMax)}`,
        source: "objets-stats.json ▸ champ b, code DST_ATKPOWER_RATE",
        certitude: "client",
      }],
      resultat: finMin,
      resultatMax: finMax,
    });
  }

  /* ┌──── LES POINTS D'ATTAQUE PLATS ARRIVENT APRÈS LE POURCENTAGE ────────────┐
     │ Ils étaient comptés dans la première étape, donc À L'INTÉRIEUR de la      │
     │ parenthèse que le pourcentage multiplie. Or la mécanique dont cette       │
     │ feuille tire son ordre les ajoute APRÈS : le pourcentage porte sur ce que │
     │ l'arme, la statistique et le niveau font, jamais sur des points plats.    │
     │                                                                         │
     │ Ce n'était pas visible sur l'arme de l'exemple, qui n'a aucune ligne      │
     │ « Attaque » plate — et c'est précisément ce qui rendait la faute          │
     │ dangereuse. Dès qu'une pièce en porte, l'écart est le pourcentage entier :│
     │ des Boucles Harpe (1 500 d'Attaque au relevé) sous une Armure de          │
     │ l'Apocalypse (+200 % d'Attaque) valaient 4 500 au lieu de 1 500.          │
     └─────────────────────────────────────────────────────────────────────────┘ */
  /* L'ÉTAPE S'AFFICHE MÊME À ZÉRO : « aucune pièce ne donne d'Attaque plate » est un
     renseignement, et un terme qui disparaît quand il vaut zéro laisse croire qu'il
     n'existe pas. */
  etapes.push({
    nom: "Les points d'Attaque plats",
    formule: "résultat + somme des lignes « Attaque » des pièces",
    termes: [{
      quoi: "Points d'Attaque plats des pièces portées",
      valeur: plat,
      detail: plat
        ? `${nb(finMin)} + ${nb(plat)} = ${nb(finMin + plat)} · ${nb(finMax)} + ${nb(plat)} = ${nb(finMax + plat)} — ces points ne passent PAS par le pourcentage.`
        : "Aucune pièce de cet exemple ne porte de ligne « Attaque » en points.",
      source: "objets-stats.json ▸ champ b des pièces, code DST_ATKPOWER, traduit par statistiques-objets.json",
      certitude: "client",
    }],
    resultat: finMin + plat,
    resultatMax: finMax + plat,
  });
  finMin += plat;
  finMax += plat;

  const reserves = [
    "L'ordre des opérations vient de la mécanique du Flyff officiel : Airborn a pu la changer sans que le client l'écrive.",
  ];
  if (up > 0) reserves.push(`Le palier +${up} est annoncé, pas compté.`);
  if (apportStat == null) reserves.push(`Le facteur de famille de l'${FAMILLE_FR[fam] ?? fam} n'est pas dans le tableau des classes.`);

  return {
    titre: "La puissance d'un coup à l'arme",
    sujet: `${arme.nom} · ${porteur.classeFr ?? porteur.classe} niveau ${porteur.niveau}`,
    etapes, resultat: finMin, resultatMax: finMax, unite: "points d'attaque", reserves,
  };
}

/* ── 2. La réduction par la défense ─────────────────────────────────────────── */

/**
 * CE QUE LA DÉFENSE RETIRE — la formule la moins confirmée de tout ce fichier, et
 * celle dont le résultat compte le plus.
 *
 * La mécanique officielle ne SOUSTRAIT pas la défense de l'attaque. Elle calcule une
 * position entre les deux nombres, à la racine carrée d'un rapport, et retire ce
 * point de l'attaque :
 *
 *     part      = racine( défense ÷ (défense + 2 × attaque) )
 *     retenue   = défense + (attaque − défense) × part
 *     dégâts    = attaque − retenue
 *
 * On la garde telle quelle, avec sa réserve : elle donne le bon ORDRE DE GRANDEUR et
 * la bonne COURBE (une défense qui double ne divise pas les dégâts par deux), ce qui
 * suffit à comparer deux builds sur le même monstre. Elle ne suffit PAS à annoncer un
 * dégât au joueur comme s'il l'avait mesuré, et l'écran le dit.
 *
 * Défense NULLE : la mécanique ne retire rien du tout. Ce n'est pas un cas d'école —
 * les monstres de niveau 1 du relevé ont une défense à 3, et certains sacs
 * d'entraînement à 0.
 */
export function reductionParDefense(attaque: number, defense: number, dOu: string): Etape {
  const somme = defense + CONSTANTES_HYPOTHESE.poidsDeLAttaque * attaque;
  const part = defense > 0 && somme > 1 ? Math.sqrt(defense / somme) : 0;
  const retenue = Math.floor(defense + (attaque - defense) * part);
  const degats = Math.max(0, attaque - retenue);
  return {
    nom: "Ce que la défense retient",
    formule: "part = √(défense ÷ (défense + 2 × attaque)) · retenue = défense + (attaque − défense) × part",
    termes: [
      {
        quoi: "Attaque qui arrive",
        valeur: attaque,
        source: "Résultat de l'étape précédente",
        certitude: "deduit",
      },
      {
        quoi: "Défense de la cible",
        valeur: defense,
        source: dOu,
        certitude: "client",
      },
      {
        quoi: "Part retenue",
        valeur: Math.round(part * 1000) / 1000,
        detail: `√(${defense} ÷ (${defense} + 2 × ${nb(attaque)})) = √(${defense} ÷ ${nb(somme)}) = ${nb(Math.round(part * 1000) / 1000)}`,
        source: CONSTANTES_HYPOTHESE.source,
        certitude: "hypothese",
      },
      {
        quoi: "Retenue",
        valeur: retenue,
        detail: `${defense} + (${nb(attaque)} − ${defense}) × ${nb(Math.round(part * 1000) / 1000)} = ${nb(retenue)}`,
        source: CONSTANTES_HYPOTHESE.source,
        certitude: "hypothese",
      },
    ],
    resultat: degats,
    unite: "dégâts",
    reserve: "La formule de réduction n'est pas confirmée sur Airborn : elle donne la bonne courbe, pas forcément le bon nombre.",
  };
}

/* ── 3. L'élément ───────────────────────────────────────────────────────────── */

/** Les cinq éléments, dans l'ordre du relevé de monstres. */
export const ELEMENTS_MONSTRE = ["feu", "eau", "electricite", "vent", "terre"] as const;
export type ElementMonstre = (typeof ELEMENTS_MONSTRE)[number];
export const ELEMENT_FR: Record<ElementMonstre, string> = {
  feu: "Feu", eau: "Eau", electricite: "Électricité", vent: "Vent", terre: "Terre",
};

/**
 * LA RÉSISTANCE ÉLÉMENTAIRE D'UN MONSTRE EST DÉJÀ UN MULTIPLICATEUR, et c'est la
 * chose la plus facile à mal lire du relevé. Le champ `res` d'un monstre porte des
 * nombres comme −0,3 ou +0,3 : ce ne sont pas des pourcentages de dégâts, ce sont des
 * FRACTIONS À AJOUTER À UN. Un −0,3 sur le feu veut dire que le monstre prend 30 % de
 * PLUS au feu ; un +0,3 qu'il en prend 30 % de moins.
 *
 * Le sens est vérifiable sur le relevé lui-même : le Jeune Aibatt est d'élément vent
 * et porte feu −0,3 / terre +0,3. Un monstre de vent est faible au feu et fort contre
 * la terre — c'est la roue des éléments de Flyff, dans le bon sens.
 */
export function apportDeLElement(res: Record<string, number>, element: ElementMonstre, nomDuMonstre: string): Terme {
  const r = res[element] ?? 0;
  const facteur = 1 - r;
  return {
    quoi: r === 0
      ? `${ELEMENT_FR[element]} : ni faiblesse ni résistance`
      : r < 0
        ? `${ELEMENT_FR[element]} : faiblesse, +${Math.round(-r * 100)} % de dégâts`
        : `${ELEMENT_FR[element]} : résistance, −${Math.round(r * 100)} % de dégâts`,
    valeur: Math.round(facteur * 100) / 100,
    detail: `1 − (${nb(r)}) = ${nb(Math.round(facteur * 100) / 100)} — le relevé écrit une fraction à retirer de 1, pas un pourcentage de dégâts.`,
    source: `monstres.json ▸ ${nomDuMonstre}, champ res.${element}`,
    certitude: "client",
  };
}

/* ── 4. Les compétences ─────────────────────────────────────────────────────── */

export type Competence = {
  id: string; nom: string; classe?: string; type?: string;
  /** La statistique de référence, quand la compétence en a une. */
  stat?: string | null;
  /** Le nombre du client, dont l'UNITÉ n'est pas établie — voir plus bas. */
  coef?: number | null;
  niveaux?: { dmin?: number[]; dmax?: number[]; pf?: number[] };
  nivMax?: number;
};

/**
 * LA PUISSANCE D'UNE COMPÉTENCE D'ATTAQUE — deux termes, et un seul se chiffre.
 *
 * ┌──────── CE QUE LE RELEVÉ DONNE, ET CE QU'IL NE DONNE PAS ────────┐
 * │ IL DONNE, par niveau de compétence et sans ambiguïté : les deux    │
 * │ bornes de dégâts de base (`dmin`, `dmax`) et le coût en points de  │
 * │ fatigue. 197 compétences, toutes avec leur tableau par niveau.     │
 * │                                                                   │
 * │ IL NE DONNE PAS l'unité de `coef`. Ce nombre est la « valeur de    │
 * │ référence » de propSkill.txt : il dit de combien la statistique de │
 * │ référence pèse dans la puissance, mais son DIVISEUR n'est écrit    │
 * │ nulle part. Deux lectures plausibles donnent des dégâts dans un    │
 * │ rapport de cent.                                                  │
 * └───────────────────────────────────────────────────────────────────┘
 *
 * CE QUI EST ÉTABLI SUR LE RELEVÉ, en revanche, et qui tranche l'ambiguïté d'usage :
 * `coef` se sépare en DEUX POPULATIONS SANS RECOUVREMENT. Les 40 compétences dont le
 * coefficient dépasse 1 000 (1 000, 2 000, 5 000, 20 000, 25 000, 60 000) sont TOUTES
 * des buffs — « Buff sur soi », « Effet sur la cible », « Effet de groupe » — et
 * AUCUNE n'est une attaque. Les compétences d'attaque restent toutes sous 340. Les
 * deux familles ne partagent donc pas la même unité, et un moteur qui les traiterait
 * ensemble se tromperait d'un facteur mille sur la moitié du jeu.
 *
 * D'où le choix : le terme de base se chiffre, le terme d'échelle s'affiche sans
 * valeur, et la feuille dit lequel manque.
 */
export function puissanceDeCompetence(
  comp: Competence,
  niveau: number,
  porteur: Porteur,
  socleDArme: { min: number; max: number; nom: string },
  /**
   * LES DEUX POPULATIONS DE COEFFICIENTS, COMPTÉES SUR LE RELEVÉ ET PASSÉES ICI.
   *
   * La phrase de la bulle les écrivait en dur — « les 40 compétences à coefficient
   * ≥ 1 000 », « les attaques restent sous 340 ». Trois nombres justes aujourd'hui,
   * faux au prochain versement du client, et affichés à l'écran : c'est exactement ce
   * que la règle de la maison interdit. Ce module ne lit aucun fichier, donc il ne
   * peut pas les compter : il les reçoit, et se tait quand on ne les lui donne pas.
   */
  population?: { buffs: number; seuilBuff: number; maxAttaque: number },
): Feuille {
  const i = niveau - 1;
  const dmin = comp.niveaux?.dmin?.[i] ?? null;
  const dmax = comp.niveaux?.dmax?.[i] ?? null;
  const statVal = comp.stat === "Intelligence" ? porteur.intelligence
    : comp.stat === "Endurance" ? porteur.endurance
      : comp.stat === "Dextérité" ? porteur.dexterite : porteur.force;

  /* Le socle de compétence compte CINQ fois dans la mécanique officielle : c'est ce
     qui fait qu'un dmax de 13 pèse 65 et non 13, et qu'une compétence de bas niveau
     reste faible même sur une arme énorme. VENANT DE LA MÉCANIQUE, PAS DU CLIENT :
     le terme part donc en `hypothese`, comme les constantes de la feuille d'arme. */
  const facteurDuSocle = CONSTANTES_HYPOTHESE.quintuplementDuSocleDeCompetence;
  const baseMin = dmin != null ? dmin * facteurDuSocle : null;
  const baseMax = dmax != null ? dmax * facteurDuSocle : null;

  const termes: Terme[] = [
    {
      quoi: `Puissance de l'arme (${socleDArme.nom})`,
      valeur: socleDArme.min,
      detail: `intervalle ${nb(socleDArme.min)} à ${nb(socleDArme.max)}`,
      source: "Résultat de la feuille « puissance d'un coup à l'arme »",
      certitude: "hypothese",
    },
    {
      quoi: `Socle de la compétence au niveau ${niveau}, compté ${facteurDuSocle} fois`,
      valeur: baseMin,
      detail: baseMin != null
        ? `${dmin} × ${facteurDuSocle} = ${nb(baseMin)} · borne haute ${dmax} × ${facteurDuSocle} = ${nb(baseMax!)}`
        : "Le relevé ne donne pas de dégâts de base pour cette compétence.",
      /* LA SOURCE DIT MAINTENANT LES DEUX MOITIÉS DU TERME. Elle ne citait que le
         client, pastille verte comprise, pour un nombre dont le multiplicateur ne
         vient pas de lui : `dmin` est lu, le « × 5 » est supposé. */
      source: baseMin != null
        ? `competences.json ▸ ${comp.id}, niveaux.dmin[${i}] et dmax[${i}] (propSkill.txt du client) pour ${dmin} et ${dmax} — le « × ${facteurDuSocle} » vient de la mécanique officielle, aucun fichier ne l'écrit.`
        : `competences.json ▸ ${comp.id}, niveaux.dmin[${i}] et dmax[${i}] (propSkill.txt du client)`,
      certitude: baseMin != null ? "hypothese" : "absent",
    },
    {
      quoi: comp.stat
        ? `Échelle sur ${laStat(comp.stat)} (${statVal}), coefficient ${comp.coef ?? "?"} — NON COMPTÉ`
        : "Cette compétence n'a pas de statistique de référence",
      valeur: null,
      detail: comp.stat
        ? `Le client écrit le coefficient ${nb(comp.coef ?? 0)}, jamais son diviseur. ${population
          ? `Les ${population.buffs} compétences à coefficient ${nb(population.seuilBuff)} ou plus sont toutes des buffs, les attaques ne dépassent pas ${nb(population.maxAttaque)}`
          : "Les gros coefficients sont tous des buffs, les attaques restent bien en dessous"} : deux unités pour un même champ. Chiffrer ce terme demanderait de choisir, et un dégât faux est pire qu'un dégât absent.`
        : "Rien à ajouter : le relevé ne lui associe aucune statistique.",
      source: `competences.json ▸ ${comp.id}, champs stat et coef (propSkill.txt ▸ valeur de référence)`,
      certitude: "absent",
    },
    /* ── LE TROISIÈME TERME MANQUANT, QUI NE SE DISAIT PAS ────────────────────
       La feuille emprunte le « × 5 » à la mécanique officielle. Or, dans cette
       même mécanique, la parenthèse ainsi formée est ENSUITE mise à l'échelle du
       niveau de la compétence, et une constante y est retranchée. Prendre une
       opération d'une formule et taire les deux autres, c'est présenter un
       morceau de formule comme la formule : le total n'est pas « la mécanique
       officielle appliquée à Airborn », c'est son premier tiers.
       On ne CHIFFRE pas ces deux opérations — rien du client ne les confirme et
       Airborn a pu les changer — mais on les DIT, sinon le lecteur croit tenir
       un total qui ne lui manque qu'une échelle de statistique. */
    {
      quoi: `Mise à l'échelle du niveau ${niveau} de la compétence — NON COMPTÉE`,
      valeur: null,
      detail: "La mécanique dont vient le « × 5 » multiplie ensuite le tout par un facteur qui croît avec le niveau de la compétence, et en retranche une constante. Les deux sont absents du client : ni le facteur, ni la constante ne se lisent nulle part. Le facteur étant supérieur à un, le total reste un PLANCHER — d'un cran de plus qu'annoncé.",
      source: CONSTANTES_HYPOTHESE.source,
      certitude: "absent",
    },
  ];

  const min = (socleDArme.min ?? 0) + (baseMin ?? 0);
  const max = (socleDArme.max ?? 0) + (baseMax ?? 0);

  return {
    titre: "La puissance d'une compétence d'attaque",
    sujet: `${comp.nom} niveau ${niveau} sur ${comp.nivMax ?? niveau} · ${porteur.classeFr ?? porteur.classe}`,
    etapes: [{
      nom: "Ce qui compose la frappe",
      formule: `puissance de l'arme + socle de la compétence × ${facteurDuSocle} + échelle sur la statistique`,
      termes,
      resultat: min,
      resultatMax: max,
      reserve: comp.stat
        ? `L'échelle sur ${laStat(comp.stat)} manque au total : le nombre affiché est un PLANCHER, pas la frappe.`
        : undefined,
    }],
    resultat: min, resultatMax: max, unite: "points d'attaque",
    reserves: [
      comp.stat
        ? `Le terme d'échelle sur ${laStat(comp.stat)} n'est pas chiffré : l'unité du coefficient ${nb(comp.coef ?? 0)} n'est pas établie. Le total est un plancher.`
        : "Cette compétence n'a pas de statistique de référence dans le relevé.",
      "Le socle compté cinq fois et l'addition de la puissance d'arme viennent de la mécanique officielle, pas du client.",
      "DEUX opérations de cette même mécanique ne sont pas appliquées — l'échelle du niveau de compétence et une constante retranchée : le total est un plancher pour trois raisons, pas une.",
    ],
  };
}

/* ── 5. Le panneau de caractéristiques ──────────────────────────────────────── */

/** UN APPORT : une ligne de bonus, avec la pièce ou la mécanique qui la donne. */
export type Apport = {
  /** La statistique touchée, déjà en français. */
  stat: string;
  valeur: number;
  /** Ce qui la donne — « Épée en Yggdrasil Purifié », « Panoplie Dryades 4/4 ». */
  de: string;
  source: string;
  certitude: Certitude;
};

export type LigneDeStat = {
  stat: string;
  total: number;
  apports: Apport[];
  /** Vrai dès qu'un apport RETIRE des points : le cas des panoplies à ligne négative. */
  aDuNegatif: boolean;
};

/** UNE SOURCE, une seule fois. Voir `panneauDeCaracteristiques` pour le pourquoi. */
export type SourceDuPanneau = {
  /** La pièce ou la mécanique : « Épée en Yggdrasil Purifié », « Panoplie Apocalypse ». */
  de: string;
  source: string;
  certitude: Certitude;
  /** Combien de lignes du panneau elle alimente. */
  lignes: number;
};

/**
 * LE PANNEAU DE CARACTÉRISTIQUES : le total, ET d'où vient chaque point.
 *
 * C'est le cœur de la demande « voir le rendu dégâts » : pas le nombre, le chemin.
 * Une ligne de ce panneau n'est jamais un nombre seul — c'est un total suivi de la
 * liste de ses apports, chacun avec la pièce qui le donne.
 *
 * L'ORDRE EST CELUI DE LA GRANDEUR, pas celui de l'alphabet ni celui des pièces : on
 * cherche d'abord ce qui pèse. À égalité, l'ordre alphabétique français, pour que deux
 * rendus du même build donnent la même liste.
 *
 * LES LIGNES NÉGATIVES NE SE FONDENT PAS DANS LE TOTAL. Les panoplies Shaitan
 * retirent 200 de taux de dégâts JcJ sur quatre pièces, les Dryades 300 de dégâts
 * JcJ : porter la panoplie complète COÛTE. Un total de « −300 » sans son apport
 * visible passe pour une erreur d'affichage ; avec son apport, c'est un avertissement.
 */
export function panneauDeCaracteristiques(apports: Apport[]): { lignes: LigneDeStat[]; sources: SourceDuPanneau[] } {
  const parStat = new Map<string, Apport[]>();
  for (const a of apports) {
    const l = parStat.get(a.stat);
    if (l) l.push(a); else parStat.set(a.stat, [a]);
  }
  const lignes: LigneDeStat[] = [];
  for (const [stat, l] of parStat) {
    lignes.push({
      stat,
      total: l.reduce((s, a) => s + a.valeur, 0),
      apports: [...l].sort((x, y) => Math.abs(y.valeur) - Math.abs(x.valeur) || x.de.localeCompare(y.de, "fr")),
      aDuNegatif: l.some((a) => a.valeur < 0),
    });
  }

  /* ┌──────── UNE SOURCE S'ÉCRIT UNE FOIS, ET C'EST UNE MESURE ────────┐
     │ Première version : chaque apport portait sa phrase de source dans │
     │ sa propre bulle. Une panoplie alimente six lignes du panneau, un  │
     │ bijou trois, une arme cinq — la MÊME phrase de quatorze mots      │
     │ partait donc six fois. Mesuré sur la page servie : 1 328 mots de  │
     │ doublon exact sur 2 683 mots ajoutés, la moitié du volet.         │
     │                                                                  │
     │ Et ce n'était pas seulement lourd, c'était moins clair : « d'où   │
     │ vient ce point » est un fait qui appartient à la PIÈCE, pas à la  │
     │ statistique. Les sources sortent donc du tableau et forment une   │
     │ liste à part, une entrée par pièce, avec le nombre de lignes      │
     │ qu'elle alimente.                                                │
     └──────────────────────────────────────────────────────────────────┘ */
  const parSource = new Map<string, SourceDuPanneau>();
  for (const a of apports) {
    const s = parSource.get(a.de);
    if (s) s.lignes++;
    else parSource.set(a.de, { de: a.de, source: a.source, certitude: a.certitude, lignes: 1 });
  }

  return {
    lignes: lignes.sort((a, b) => Math.abs(b.total) - Math.abs(a.total) || a.stat.localeCompare(b.stat, "fr")),
    sources: [...parSource.values()].sort((a, b) => b.lignes - a.lignes || a.de.localeCompare(b.de, "fr")),
  };
}

/**
 * LES QUATRE FAMILLES DU PANNEAU. Elles reprennent, mot pour mot, le classement que
 * le résumé du builder emploie déjà (`statCat` de public/airbuilder/airbuilder.js) :
 * deux écrans qui rangeraient la même statistique dans deux familles différentes se
 * contrediraient sous les yeux du joueur.
 */
export type Famille = "offensif" | "defensif" | "vitalite" | "utilitaire";
export const FAMILLE_TITRE: Record<Famille, string> = {
  offensif: "Offensif", defensif: "Défensif", vitalite: "Vitalité", utilitaire: "Utilitaire",
};

export function familleDe(stat: string): Famille {
  const s = stat.toLowerCase();
  if (s.includes("vitesse d'attaque")) return "offensif";
  if (/force|dext|intel|attaque|critiq|magiq|préci|preci|dégât|degat|toutes stats|jcj|pvp|pve|boss|monstre/.test(s)) return "offensif";
  if (/endurance|défense|defense|blocage|block/.test(s)) return "defensif";
  if (/pv max|pm max|mp max/.test(s)) return "vitalite";
  return "utilitaire";
}

/* ── 6. La panoplie, seuil par seuil ───────────────────────────────────────── */

/**
 * CE QU'UNE PANOPLIE DONNE, ET CE QU'ELLE PREND.
 *
 * ┌──────── LE SEUIL EST LE FAIT, PAS LE BONUS ────────┐
 * │ Chaque ligne d'un ensemble porte SON seuil de pièces │
 * │ portées. Deux conséquences que le jeu ne montre pas : │
 * │                                                     │
 * │ 1. Une ligne à quatre pièces se paie en COMPLÉTANT   │
 * │    l'ensemble — on peut choisir de s'arrêter à trois.│
 * │ 2. Une ligne à UNE pièce se paie en la portant. Les  │
 * │    sets en Yggdrasil des classes légendaires y       │
 * │    perdent 300 de dégâts JcJ dès le premier casque.  │
 * │                                                     │
 * │ La fenêtre de panoplie du jeu n'affiche que ce que   │
 * │ l'ensemble AJOUTE : une ligne qui retire n'y est pas.│
 * └─────────────────────────────────────────────────────┘
 *
 * La feuille sépare donc l'ACQUIS (ce que le nombre de pièces portées déclenche) du
 * RESTANT (ce que compléter apporterait, ET ce que compléter coûterait). C'est
 * exactement le geste qu'on cherche : décider s'il faut compléter.
 */
export function bonusDePanoplie(
  ensemble: { nom: string; id: number; nbPieces: number; lignes: { stat: string; valeur: number; seuil: number }[] },
  portees: number,
): Feuille {
  const acquis = ensemble.lignes.filter((l) => l.seuil <= portees);
  const restant = ensemble.lignes.filter((l) => l.seuil > portees);
  const terme = (l: { stat: string; valeur: number; seuil: number }, atteint: boolean): Terme => ({
    quoi: `${l.stat} ${l.valeur > 0 ? "+" : ""}${nb(l.valeur)}${l.seuil === 1 ? " — dès 1 pièce" : ` — à ${l.seuil} pièces`}`,
    valeur: atteint ? l.valeur : null,
    /* COURT EXPRÈS : la phrase part une fois par ligne négative, et la réserve sous
       le total la dit déjà en entier. Ici on marque, on n'explique pas. */
    detail: l.valeur < 0 ? "ELLE RETIRE, et le jeu ne l'affiche pas." : undefined,
    source: `bonus-sources.json ▸ ensemble ${ensemble.id} (propItemEtc.inc du client)`,
    certitude: atteint ? "client" : "absent",
  });

  const etapes: Etape[] = [{
    nom: `Acquis à ${portees} pièce${portees > 1 ? "s" : ""} sur ${ensemble.nbPieces}`,
    formule: "somme des lignes dont le seuil est atteint",
    termes: acquis.length ? acquis.map((l) => terme(l, true)) : [{
      quoi: "Aucune ligne n'est encore déclenchée",
      valeur: null,
      source: `bonus-sources.json ▸ ensemble ${ensemble.id}`,
      certitude: "absent",
    }],
    /* PAS DE SOUS-TOTAL : les lignes d'un ensemble mêlent des points et des
       pourcentages. Leur somme affichait « −800 » sans unité, ce qui se comparait
       d'une panoplie à l'autre comme si le nombre voulait dire quelque chose. */
    resultat: null,
  }];
  if (restant.length) {
    etapes.push({
      nom: "Ce qu'il reste à déclencher",
      formule: "les lignes dont le seuil n'est pas atteint",
      termes: restant.map((l) => terme(l, false)),
      resultat: null,
      reserve: (() => {
        const p = restant.filter((l) => l.valeur > 0).length;
        const n = restant.filter((l) => l.valeur < 0).length;
        return `Compléter apporterait ${p} ligne${p > 1 ? "s" : ""}${n ? ` et en coûterait ${n}` : ", sans rien coûter"}.`;
      })(),
    });
  }

  const negatives = acquis.filter((l) => l.valeur < 0);
  return {
    /* LES GUILLEMETS PLUTÔT QU'UN ARTICLE : « la Armure de l'Apocalypse » était
       faux, et aucune règle d'élision ne tient sur des noms d'ensembles qui vont du
       masculin au pluriel (« Set de Templier », « Boucles d'Oreille Harpe »). */
    titre: `Ce que coûte et rapporte « ${ensemble.nom} »`,
    sujet: `${portees} pièce${portees > 1 ? "s" : ""} sur ${ensemble.nbPieces} · ${ensemble.lignes.length} lignes, dont ${ensemble.lignes.filter((l) => l.valeur < 0).length} négatives`,
    etapes,
    /* PAS DE TOTAL CHIFFRÉ : voir `resultatTexte`. Les lignes d'un ensemble mêlent
       des points et des pourcentages, et leur somme ne veut rien dire. */
    resultat: null,
    /* La phrase ENTIÈRE va dans `resultatTexte`, et `unite` reste vide : « 3 gagnées,
       3 perdues » suivi de « lignes acquises » se lisait comme une unité collée à un
       compte qui la portait déjà. */
    resultatTexte: (() => {
      const p = acquis.filter((l) => l.valeur > 0).length;
      const n = acquis.filter((l) => l.valeur < 0).length;
      return `${p} ligne${p > 1 ? "s" : ""} gagnée${p > 1 ? "s" : ""}, ${n} perdue${n > 1 ? "s" : ""}`;
    })(),
    unite: "",
    /* AUCUNE RÉSERVE quand tout est lu dans le client : la feuille porte alors la
       mention « calcul exact », et il faut pouvoir la porter. Le seul avertissement
       qui reste est celui des lignes négatives — ce n'est pas une incertitude, c'est
       une mise en garde. */
    reserves: negatives.length
      ? [`${negatives.length} ligne${negatives.length > 1 ? "s" : ""} acquise${negatives.length > 1 ? "s" : ""} RETIRE${negatives.length > 1 ? "NT" : ""} des points : ${negatives.map((l) => l.stat).join(", ")}. Le jeu ne les affiche pas.`]
      : [],
  };
}

/* ── 6. Les paliers d'accessoire ────────────────────────────────────────────── */

/**
 * LE PALIER D'UN BIJOU REMPLACE, IL NE S'ADDITIONNE PAS — et c'est la mécanique la
 * plus contre-intuitive du jeu, celle qui fait passer un calcul de juste à ridicule.
 *
 * La preuve est dans le relevé lui-même, sous la forme d'un PLATEAU : les Boucles
 * d'Oreille Harpe écrivent « Attaque 1000 » au palier 20, puis encore 1000 au 21, au
 * 22… jusqu'au 30. Sous un cumul, ce serait onze mille points d'attaque — alors que le
 * fichier change justement de statistique à partir du palier 21, ce qui n'aurait aucun
 * sens s'il empilait. Le relevé compte 78 plateaux de ce genre sur 1 635 paliers.
 *
 * Cette fonction rend donc les deux lectures, pour que l'écart se VOIE : ce que le
 * palier donne (le remplacement, la bonne réponse) et ce qu'un cumul aurait donné.
 *
 * ┌──── DEUX CHOSES QUE CETTE FEUILLE A FAILLI DIRE, ET QUI ÉTAIENT FAUSSES ────┐
 * │ 1. ELLE ADDITIONNAIT SES LIGNES. Au palier 30 des Boucles Harpe, le client   │
 * │    écrit « Attaque 1000 », « Dégâts magiques % 10 » et « Dégâts critiques    │
 * │    20 » : la feuille annonçait « 1 030 points ». C'est exactement la faute    │
 * │    que `bonusDePanoplie` refuse trois cents lignes plus haut — mille points   │
 * │    d'attaque plus dix POUR CENT ne font pas mille dix de quoi que ce soit,    │
 * │    et le nombre obtenu se comparerait d'un bijou à l'autre comme s'il         │
 * │    voulait dire quelque chose. Dès que les lignes mêlent les unités, c'est    │
 * │    `resultatTexte` qui parle et le nombre disparaît.                         │
 * │                                                                             │
 * │ 2. ELLE SE DISAIT EXACTE. Aucune réserve, donc la mention « calcul exact » et │
 * │    la phrase « ce total ne repose sur aucune hypothèse ». Or les VALEURS      │
 * │    sont lues dans le client, mais LA LECTURE — remplacer plutôt qu'empiler —  │
 * │    est une déduction, et le relevé qui la porte l'écrit lui-même :            │
 * │    paliers-accessoires.json ▸ cumulOuRemplacement.statut dit « CE N'EST PAS   │
 * │    UN RELEVÉ, C'EST UNE DÉDUCTION […] elle ne doit pas être affichée comme    │
 * │    une certitude ». Un facteur quinze dépend de cette déduction : elle a      │
 * │    droit à sa ligne.                                                         │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */
export function palierDeBijou(
  bijou: { nom: string; cle?: string; plafond: number; rangs: ([string, number][] | undefined)[] },
  palier: number,
): Feuille {
  const ici = bijou.rangs[palier] ?? [];
  const avant = bijou.rangs[palier - 1] ?? [];
  const termes: Terme[] = ici.map(([stat, v]) => {
    const precedent = avant.find((x) => x[0] === stat);
    const plateau = precedent != null && precedent[1] === v;
    return {
      quoi: `${stat} ${v > 0 ? "+" : ""}${v}${plateau ? " — recopié à l'identique du palier précédent" : ""}`,
      valeur: v,
      detail: plateau
        ? `Le palier ${palier - 1} écrit déjà ${v} : c'est le PLATEAU qui prouve le remplacement.`
        : precedent != null
          ? `Le palier ${palier - 1} écrivait ${precedent[1]}.`
          : `Rien au palier ${palier - 1}.`,
      source: `paliers.json ▸ rangs[${palier}] (accessory.inc du client)`,
      certitude: "client",
    };
  });

  /* Ce qu'un cumul aurait donné : la somme de TOUS les paliers jusqu'ici, par
     statistique. On l'affiche pour montrer l'écart, jamais comme un résultat. */
  const cumul = new Map<string, number>();
  for (let p = 1; p <= palier; p++) {
    for (const [stat, v] of bijou.rangs[p] ?? []) cumul.set(stat, (cumul.get(stat) ?? 0) + v);
  }

  /* MÊLE-T-IL DES POINTS ET DES POURCENTAGES ? Le libellé le dit : le dictionnaire
     du client suffixe « % » aux taux, et lui seul. Deux familles présentes = aucune
     somme possible, et c'est le libellé qui tranche, pas une liste tenue à la main. */
  const enPourcent = (stat: string) => /%\s*$/.test(stat);
  const mixte = new Set(ici.map(([s]) => enPourcent(s))).size > 1;
  const enClair = (l: [string, number][]) =>
    l.map(([s, v]) => `${s} ${v > 0 ? "+" : ""}${nb(v)}`).join(" · ");
  const sommeIci = termes.reduce((s, t) => s + (t.valeur ?? 0), 0);
  const sommeCumul = [...cumul.values()].reduce((s, v) => s + v, 0);

  return {
    titre: `Ce que donne « ${bijou.nom} » à +${palier}`,
    sujet: `Plafond +${bijou.plafond} · ${bijou.rangs.filter(Boolean).length} paliers écrits dans le client`,
    etapes: [
      {
        nom: `Le palier ${palier} REMPLACE`,
        formule: "la valeur du palier atteint, seule",
        termes: termes.length ? termes : [{
          quoi: `Le client n'écrit rien au palier ${palier}`,
          valeur: null,
          detail: "Un palier vide ne retire rien : c'est le bonus de base de l'objet qui s'applique seul.",
          source: `paliers.json ▸ ${bijou.cle ?? bijou.nom}, rangs[${palier}]`,
          certitude: "client",
        }],
        /* AUCUN SOUS-TOTAL quand les unités se mêlent : la ligne ci-dessus liste
           déjà chaque valeur, et une somme la contredirait. */
        resultat: mixte ? null : sommeIci,
        unite: mixte ? "" : undefined,
      },
      /* UN SEUL TERME DE SYNTHÈSE, et non un par statistique. Une première version
         rendait une ligne par statistique cumulée, chacune avec la même phrase
         d'explication : six lignes identiques à treize mots pour un fait unique. Ce
         que le lecteur doit retenir n'est pas le détail du cumul — c'est l'ÉCART. */
      {
        nom: "Ce qu'un cumul aurait donné",
        formule: `somme des paliers 1 à ${palier} — LECTURE FAUSSE, montrée pour l'écart`,
        termes: [{
          quoi: enClair([...cumul]) || "rien",
          /* PAS DE NOMBRE ICI NON PLUS quand les unités se mêlent. La somme
             affichait « 15 615 », c'est-à-dire 15 450 points d'attaque plus 55 %
             plus 110 : la LECTURE FAUSSE se doublait d'une ADDITION FAUSSE, et
             l'écart annoncé (« un facteur quinze ») se mesurait sur elle. L'écart
             qui compte est celui de l'Attaque : 15 450 contre 1 000. */
          valeur: mixte ? null : sommeCumul,
          valeurTexte: mixte ? "aucun total : ces lignes n'ont pas la même unité" : undefined,
          detail: mixte
            ? `Aucun total : ces lignes mêlent des points et des pourcentages. L'écart se lit ligne par ligne — et sur l'Attaque, il va de ${nb(ici.find(([s]) => !enPourcent(s))?.[1] ?? 0)} à ${nb(cumul.get(ici.find(([s]) => !enPourcent(s))?.[0] ?? "") ?? 0)}.`
            : "Le plateau du relevé interdit cette lecture : au palier atteint, la valeur remplace.",
          source: `paliers.json ▸ ${bijou.cle ?? bijou.nom}, rangs[1] à rangs[${palier}]`,
          certitude: "deduit",
        }],
        resultat: mixte ? null : sommeCumul,
        /* L'UNITÉ NE SE RECOPIE PAS DE LA FEUILLE ICI : cette étape héritait de
           « points, au palier atteint », soit l'étiquette de la BONNE réponse collée
           au résultat de la mauvaise. */
        unite: mixte ? "" : "points, si l'on cumulait",
        reserve: "Cette colonne dit de combien on se tromperait, elle ne s'emploie pas.",
      },
    ],
    resultat: mixte ? null : sommeIci,
    /* CE QUE LA FEUILLE A COMPTÉ, écrit au lieu d'une somme impossible. */
    resultatTexte: mixte ? enClair(ici) : undefined,
    unite: mixte ? "au palier atteint" : "points, au palier atteint",
    /* LA DÉDUCTION QUI PORTE TOUT LE RÉSULTAT A DROIT À SA LIGNE. Les valeurs sont
       lues ; le fait qu'elles REMPLACENT au lieu de s'empiler ne l'est pas, et c'est
       lui qui fait l'écart de quinze. Le relevé le dit de lui-même. */
    reserves: [
      "Les valeurs sont lues dans le client ; le fait que le palier REMPLACE au lieu de s'ajouter est une déduction — tirée du plateau et de la description du jeu, écrite nulle part dans les fichiers (paliers-accessoires.json ▸ cumulOuRemplacement).",
    ],
  };
}
