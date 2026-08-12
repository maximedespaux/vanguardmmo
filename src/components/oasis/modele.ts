/**
 * LA PROTECTION DE L'OASIS — le modèle partagé entre le serveur et l'écran.
 *
 * Trois noms se promènent dans le jeu et un quatrième dans nos notes, alors
 * fixons-les une fois pour toutes :
 *   · « Protection de l'Oasis » est le MODE (16 chaînes IDS_OASIS_PROTECTION_*) ;
 *   · « Tour Infernale » est la CARTE sur laquelle il se joue (monde 8, WdTowermap) ;
 *   · « Tour Oubliée » est autre chose — cinq étages de donjon, plus un objet du
 *     même nom. Rien à voir, et c'est la confusion la plus facile à faire ;
 *   · « Tour sans fin » n'existe nulle part dans le jeu. C'est le nom que notre
 *     relevé maison lui donnait, et il ment sur le fond : le client a une chaîne
 *     « Vous venez de terminer la dernière vague ». Il y a une fin, à la 52e.
 *
 * Ce fichier ne contient AUCUNE lecture de fichier : il est importé aussi bien
 * par la page (serveur) que par les panneaux (navigateur). Le chargement des 52
 * vagues vit dans src/app/(public)/oasis/donnees.ts, côté serveur uniquement.
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
export const DEROULE: { id: string; texte: string; ceQueCaDit: string }[] = [
  { id: "08", texte: "Préparez-vous !", ceQueCaDit: "Le mode démarre par un temps mort. Tu n'es pas lâché dans la vague à la seconde où tu arrives." },
  { id: "12", texte: "[Protection de l'Oasis] Les monstres vont apparaître dans %u secondes !", ceQueCaDit: "Un compte à rebours d'apparition annoncé en secondes : le temps de se placer, de se buffer, de se répartir." },
  { id: "11", texte: "[Protection de l'Oasis] C'est parti !", ceQueCaDit: "Le lancement est explicite, donc rien ne commence sans que tu le saches." },
  { id: "01", texte: "Vague nº %u", ceQueCaDit: "Les vagues sont numérotées à l'écran : tu sais toujours où tu en es dans les 52." },
  { id: "07", texte: "La vague se termine dans %02dmn:%02ds", ceQueCaDit: "Chaque vague a un MINUTEUR, en minutes et secondes. Ce n'est pas « tue-les quand tu veux » : il y a un temps imparti." },
  { id: "16", texte: "Monstres restant: %u", ceQueCaDit: "Un compteur de ce qui reste debout. Utile quand un monstre traîne hors de vue sur une arène où l'on vole." },
  { id: "06", texte: "[Protection de l'Oasis] La vague nº %u est terminée. Félicitations !", ceQueCaDit: "La fin de vague est confirmée vague par vague." },
  { id: "09", texte: "[Protection de l'Oasis] Vous avez obtenu %dx (%s) en guise de récompense. Bravo!", ceQueCaDit: "La prime tombe À CHAQUE VAGUE, avec sa quantité et le nom de l'objet. On n'attend pas la fin du tour pour être payé." },
  { id: "02", texte: "Classement", ceQueCaDit: "Il y a un classement entre joueurs. Le mode n'est donc pas seulement une survie : il compare." },
  { id: "14", texte: "[Protection de l'Oasis] Vous venez de terminer la dernière vague.", ceQueCaDit: "La chaîne qui tue le nom « Tour sans fin » : il y a une dernière vague, et notre relevé la situe à la 52e." },
];

/**
 * LA CARTE, TELLE QUE LES FICHIERS DE MONDE LA DÉCRIVENT.
 *
 * `WdTowermap` s'ouvre et ne contient rien : pas une zone de regénération, pas un
 * monstre posé, pas une sortie. Ce n'est pas un fichier abîmé — c'est la preuve
 * que les 52 vagues sont pilotées par le SERVEUR. Inutile de chercher la table
 * des vagues dans les fichiers du client : elle n'y est pas, et n'y sera jamais.
 */
export const CARTE = [
  { quoi: "Son nom dans le client", valeur: "Tour Infernale", precision: "monde nº 8, dossier WdTowermap" },
  { quoi: "La taille de l'arène", valeur: "128 × 128 unités", precision: "à égalité pour la plus petite des 93 cartes ; un donjon standard fait 2 560 × 2 560, soit 400 fois la surface" },
  { quoi: "En extérieur, et on y vole", valeur: "vol autorisé", precision: "l'arène est déclarée en extérieur, le vol n'y est pas bridé" },
  { quoi: "Si tu meurs", valeur: "retour à Flaris", precision: "le point de réapparition de la carte est Flaris, pas l'arène" },
  { quoi: "Ce que la carte contient", valeur: "rien", precision: "0 zone de regénération, 0 monstre posé, 0 sortie, deux objets de décor — tout le reste vient du serveur" },
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
