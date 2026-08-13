/**
 * LA PROTECTION DE L'OASIS — le modèle partagé entre le serveur et l'écran.
 *
 * Trois noms se promènent dans le jeu et un quatrième dans nos notes, alors
 * fixons-les une fois pour toutes :
 *   · « Protection de l'Oasis » est le MODE (16 chaînes IDS_OASIS_PROTECTION_*) ;
 *   · « Tour Infernale » est la CARTE sur laquelle il se joue (monde 8, WdTowermap) ;
 *   · « Tour Oubliée » est autre chose — cinq étages de donjon, plus un objet du
 *     même nom. Rien à voir, et c'est la confusion la plus facile à faire. Elle
 *     est désormais le bloc voisin du nôtre sur /donjons, ce qui rend la mise en
 *     garde plus utile encore : les deux se lisent à quinze centimètres l'un de
 *     l'autre ;
 *   · « Tour sans fin » n'existe nulle part dans le jeu. C'est le nom que notre
 *     relevé maison lui donnait, et il ment sur le fond : le client a une chaîne
 *     « Vous venez de terminer la dernière vague ». Il y a une fin, à la 52e.
 *
 * Ce fichier ne contient AUCUNE lecture de fichier : il est importé aussi bien
 * par la page (serveur) que par les panneaux (navigateur). Le chargement des 52
 * vagues vit dans src/app/(public)/donjons/donnees.ts, côté serveur uniquement —
 * il a suivi la page : la Protection de l'Oasis n'a plus d'adresse à elle, c'est
 * le troisième bloc de /donjons, et /oasis y redirige.
 */

export type MonstreVague = {
  /** Le nom français, tel que le client l'affiche. */
  nom?: string;
  /** L'identifiant du client. Gardé quand la ligne a demandé un rattrapage. */
  interne?: string;
  /** Vrai si le relevé ne savait pas nommer ce monstre et qu'on l'a retrouvé après coup. */
  retrouve?: boolean;
  qte: number;
  niv?: number;
  pv?: number;
  /** Dégâts par coup, minimum et maximum, tels que la table des monstres les donne. */
  atk?: [number, number];
};

export type Vague = {
  n: number;
  /** Le fameux `atkx` du relevé. Ce qu'il multiplie n'est pas établi — voir Réserves. */
  atkx: number;
  prime: string;
  primeQte: number;
  monstres: MonstreVague[];
};

export const EMBLEME_SIMPLE = "Emblème de protection";
export const EMBLEME_SUP = "Emblème de protection supérieure";
/** Les deux primes partagent la même icône dans le client : embleme_oa. */
export const ICONE_EMBLEME = "/jeu/icones/embleme_oa.webp";

/** 56 milliards de PV ne se lisent pas en chiffres. « 56,5 Md » se lit. */
export function pvCourt(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Md`;
  if (n >= 1e6) return `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  if (n >= 1e3) return `${Math.round(n / 1e3).toLocaleString("fr-FR")} k`;
  return n.toLocaleString("fr-FR");
}

export const nb = (n: number) => n.toLocaleString("fr-FR");

/** Les PV à sortir pour finir la vague : chaque monstre compte pour sa quantité. */
export const pvVague = (v: Vague) =>
  v.monstres.reduce((s, m) => s + (m.pv ?? 0) * m.qte, 0);

/** La plus forte frappe annoncée sur la vague, avant tout multiplicateur. */
export const frappeVague = (v: Vague) =>
  v.monstres.reduce((s, m) => Math.max(s, m.atk?.[1] ?? 0), 0);

export const estSup = (v: Vague) => v.prime === EMBLEME_SUP;

/**
 * Le bilan d'un tour complet. Calculé, jamais recopié à la main : le jour où une
 * vague change dans les données, la page se corrige toute seule.
 */
export function bilan(vagues: Vague[]) {
  const monstres = vagues.reduce((s, v) => s + v.monstres.reduce((t, m) => t + m.qte, 0), 0);
  const pv = vagues.reduce((s, v) => s + pvVague(v), 0);
  const simples = vagues.filter((v) => !estSup(v));
  const sups = vagues.filter(estSup);
  const primeSimple = simples.reduce((s, v) => s + v.primeQte, 0);
  const primeSup = sups.reduce((s, v) => s + v.primeQte, 0);
  const especes = new Set(vagues.flatMap((v) => v.monstres.map((m) => m.nom ?? m.interne ?? "?")));
  // La plus grosse frappe n'est pas forcément sur la dernière vague — et c'est
  // justement ce qu'on veut montrer, donc on cherche la vague, pas la valeur.
  const pire = vagues.reduce((a, v) => (frappeVague(v) > frappeVague(a) ? v : a), vagues[0]);
  const retrouves = vagues.flatMap((v) => v.monstres.filter((m) => m.retrouve).map((m) => ({ n: v.n, nom: m.nom! })));
  return {
    vagues: vagues.length, monstres, pv, especes: especes.size,
    primeSimple, primeSup, vaguesSimples: simples.length, vaguesSup: sups.length,
    pireVague: pire.n, pireFrappe: frappeVague(pire),
    /** Les vagues dont un monstre a dû être rattrapé, sans doublon. */
    vaguesRetrouvees: [...new Set(retrouves.map((r) => r.n))],
    nomsRetrouves: [...new Set(retrouves.map((r) => r.nom))],
  };
}

export type Bilan = ReturnType<typeof bilan>;

/**
 * LE DÉROULÉ D'UN TOUR, RECONSTITUÉ À PARTIR DES CHAÎNES DU CLIENT.
 *
 * On n'a pas joué le mode pour écrire ça : les 16 chaînes `IDS_OASIS_PROTECTION_*`
 * du client racontent la séquence à elles seules. Un `%u`, un `%d`, un `%s` sont
 * des trous que le jeu remplit à l'exécution (un numéro, un compte, un nom
 * d'objet) — on les laisse tels quels plutôt que d'inventer des valeurs.
 *
 * Deux des seize chaînes (les nº 10 et 13) n'ont pas de texte dans notre relevé :
 * on ne sait pas ce qu'elles disent, et on ne le devine pas.
 */
export const DEROULE: { id: string; etape: string; texte: string; ceQueCaDit: string }[] = [
  /* ┌──── `etape` EST NEUF, ET C'EST LUI QU'ON LIT MAINTENANT À L'ÉCRAN ────┐
     Ce tableau servait un mur : dix chaînes brutes du client, chacune suivie de sa
     glose, soit deux cents mots pour raconter une séquence de dix pas. Une séquence
     se DESSINE — un fil, dix jalons — et un jalon n'a pas besoin d'une phrase, il a
     besoin d'un nom.
     `etape` est ce nom : deux à quatre mots, ce qui se passe. La chaîne brute et sa
     glose ne disparaissent pas — elles passent dans la bulle du jalon, à portée de
     curseur, parce que c'est la PREUVE : le lecteur doit pouvoir vérifier que la
     déduction tient, et reconnaître la phrase à l'écran quand il y sera.
     Les gloses vides restent vides : deux chaînes se traduisent d'elles-mêmes, et
     leur inventer un commentaire n'aurait servi qu'à remplir une colonne.
     └────────────────────────────────────────────────────────────────────┘ */
  { id: "08", etape: "Temps mort", texte: "Préparez-vous !", ceQueCaDit: "Un temps mort avant la première vague." },
  { id: "12", etape: "Compte à rebours", texte: "[Protection de l'Oasis] Les monstres vont apparaître dans %u secondes !", ceQueCaDit: "De quoi se placer et se buffer." },
  { id: "11", etape: "Départ", texte: "[Protection de l'Oasis] C'est parti !", ceQueCaDit: "" },
  { id: "01", etape: "Vagues numérotées", texte: "Vague nº %u", ceQueCaDit: "Le numéro est affiché à l'écran." },
  { id: "07", etape: "Minuteur par vague", texte: "La vague se termine dans %02dmn:%02ds", ceQueCaDit: "Il y a un temps imparti, vague par vague." },
  { id: "16", etape: "Compteur de restants", texte: "Monstres restant: %u", ceQueCaDit: "Ce qui reste debout — utile sur une arène où l'on vole." },
  { id: "06", etape: "Vague terminée", texte: "[Protection de l'Oasis] La vague nº %u est terminée. Félicitations !", ceQueCaDit: "" },
  { id: "09", etape: "Prime, à chaque vague", texte: "[Protection de l'Oasis] Vous avez obtenu %dx (%s) en guise de récompense. Bravo!", ceQueCaDit: "La prime tombe à chaque vague, pas à la fin du tour." },
  { id: "02", etape: "Classement entre joueurs", texte: "Classement", ceQueCaDit: "Le mode compare les joueurs, il ne fait pas que les faire survivre." },
  { id: "14", etape: "Dernière vague", texte: "[Protection de l'Oasis] Vous venez de terminer la dernière vague.", ceQueCaDit: "Il y a une fin. Notre relevé la situe à la 52e." },
];

/**
 * LA CARTE, TELLE QUE LES FICHIERS DE MONDE LA DÉCRIVENT.
 *
 * `WdTowermap` s'ouvre et ne contient rien : pas une zone de regénération, pas un
 * monstre posé, pas une sortie. Ce n'est pas un fichier abîmé — c'est la preuve
 * que les 52 vagues sont pilotées par le SERVEUR. Inutile de chercher la table
 * des vagues dans les fichiers du client : elle n'y est pas, et n'y sera jamais.
 */
export const CARTE: { quoi: string; valeur: string; precision: string; enBulle?: boolean }[] = [
  /* `enBulle` aussi, et pour une raison de fond : « monde nº 8 » est DÉJÀ écrit à
     côté du titre de cette section, et « dossier WdTowermap » est un nom de fichier
     du client — un joueur n'en voit jamais. C'est la preuve de la fouille, pas un
     renseignement de jeu : elle reste consultable, elle ne s'affiche plus. */
  { quoi: "Son nom dans le client", valeur: "Tour Infernale", enBulle: true, precision: "monde nº 8, dossier WdTowermap" },
  /* DEUX MOTS REMIS, ET CHACUN PORTAIT UNE VÉRITÉ.
     « à égalité pour » : la version d'avant disait « à égalité pour la plus petite des
     93 cartes ». En le coupant, on transforme une ÉGALITÉ en une UNICITÉ — l'arène
     devient « la plus petite », alors que la source dit qu'elle partage ce rang.
     « standard » : la version d'avant disait « un donjon STANDARD fait 2 560 × 2 560,
     soit 400 fois la surface ». Sans le mot, le ×400 se lit comme valant pour tout
     donjon. RECOMPTÉ SUR donjons-client.json : 13 des 23 donjons font 2 560 × 2 560,
     donc bien ×400 — mais les dix autres vont de 384 × 384 (×9) à 5 120 × 5 120
     (×1 600). Le qualificatif n'était pas du remplissage, c'est lui qui rendait la
     phrase vraie. */
  /* `enBulle` : cette précision fait vingt mots, c'est la plus longue des cinq, et
     elle sert à COMPARER — ce n'est pas ce qu'on lit en premier. Elle passe donc
     derrière la valeur, à portée de curseur, au lieu d'occuper une ligne de la
     page. Les quatre autres tiennent en cinq mots : elles restent à l'écran. */
  { quoi: "La taille de l'arène", valeur: "128 × 128 unités", enBulle: true, precision: "à égalité pour la plus petite des 93 cartes ; un donjon standard en fait 400 fois la surface" },
  { quoi: "En extérieur, et on y vole", valeur: "vol autorisé", precision: "" },
  { quoi: "Si tu meurs", valeur: "retour à Flaris", precision: "pas au pied de l'arène" },
  { quoi: "Ce que la carte contient", valeur: "rien", precision: "0 monstre posé, 0 sortie — tout vient du serveur" },
];

/**
 * OÙ PARTENT LES EMBLÈMES — lu dans la table d'échanges d'AirFlyff, pas deviné.
 *
 * C'est ce qui donne un sens aux 52 vagues : la prime n'est pas un trophée, c'est
 * la monnaie des paliers de prestige hauts. Les comptes viennent de
 * public/data/echanges.json (menus MMI_PRESTIGE_EXCHANGE, MMI_ECHANGE_UP_FASHION
 * et MMI_NOEL_EXCHANGE1) ; la page /prestige affiche déjà les mêmes chiffres du
 * côté du parchemin.
 */
export const DEBOUCHES: { donne: string; cout: { quoi: string; qte: number }[]; note?: string }[] = [
  { donne: "Le parchemin qui fait passer au prestige 6", cout: [{ quoi: EMBLEME_SIMPLE, qte: 5000 }, { quoi: "Jeton Prestige V", qte: 10 }] },
  { donne: "Le parchemin qui fait passer au prestige 7", cout: [{ quoi: EMBLEME_SIMPLE, qte: 6000 }, { quoi: "Jeton Prestige V", qte: 15 }, { quoi: "Jeton Prestige Farm", qte: 1 }, { quoi: "Nucléus neutre", qte: 10000 }] },
  { donne: "Le parchemin qui fait passer au prestige 10", cout: [{ quoi: EMBLEME_SIMPLE, qte: 4000 }, { quoi: "Jeton Prestige V", qte: 25 }], note: "Le plus gros mur du jeu : la recette compte dix lignes, nucléus et badges compris. Les emblèmes n'en sont qu'une — le détail est sur la page Prestige." },
  { donne: "Un Insigne Fashion IQ", cout: [{ quoi: EMBLEME_SIMPLE, qte: 700 }, { quoi: EMBLEME_SUP, qte: 600 }, { quoi: "Éclat Fashion IQ", qte: 250 }, { quoi: "Upgrade Ange", qte: 250 }], note: "La seule recette qui réclame les DEUX emblèmes. Une seconde version accepte 3 Médailles de donjon à la place des supérieurs." },
  { donne: "Un emblème ordinaire", cout: [{ quoi: EMBLEME_SUP, qte: 1 }], note: "La conversion qui change tout : un supérieur vaut un ordinaire, un pour un. Elle est rangée sous un menu d'échange de Noël — à confirmer en jeu qu'il est ouvert toute l'année." },
];
