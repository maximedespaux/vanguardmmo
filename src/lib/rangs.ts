/**
 * Rangs, cadres et titres — la partie visible de la progression.
 *
 * Un niveau tout seul est un chiffre. Ce qui donne envie de le monter, c'est
 * qu'il SE VOIE : un cadre différent autour de l'avatar, un titre à côté du
 * nom. On débloque donc quelque chose de montrable à chaque palier, jamais un
 * simple « niveau 4 ».
 *
 * Charte de la guilde : orange et noir. Les cadres ne changent pas de famille
 * de couleur d'un palier à l'autre, ils gagnent en intensité — du gris terne au
 * doré incandescent. Un arc-en-ciel ferait joli une fois et daterait le site.
 */
export type Rang = {
  /** Niveau à partir duquel le rang est acquis. */
  seuil: number;
  nom: string;
  /** Ce qu'on a fait pour l'obtenir, dit en une ligne. */
  obtention: string;
  /** Couleur de l'anneau et du titre. */
  couleur: string;
  /** Halo autour du cadre. Vide = pas de halo (les premiers rangs restent sobres). */
  halo: string;
  /** Anneau animé : réservé aux deux derniers, sinon l'effet ne veut plus rien dire. */
  anime?: boolean;
};

export const RANGS: Rang[] = [
  { seuil: 1, nom: "Recrue", obtention: "Bienvenue dans la guilde.", couleur: "#8A8A96", halo: "" },
  { seuil: 2, nom: "Épaule", obtention: "Tu as commencé à donner un coup de main.", couleur: "#9FB7C9", halo: "" },
  { seuil: 4, nom: "Éclaireur", obtention: "Tu ramènes régulièrement ce qui manque.", couleur: "#4EA8FF", halo: "rgba(78,168,255,.35)" },
  { seuil: 7, nom: "Sentinelle", obtention: "On peut compter sur toi sans demander.", couleur: "#C77DFF", halo: "rgba(199,125,255,.35)" },
  { seuil: 11, nom: "Gardien", obtention: "Tu portes une part du coffre à toi seul.", couleur: "#FF8C1A", halo: "rgba(255,140,26,.45)" },
  { seuil: 16, nom: "Vanguard", obtention: "Tu es de ceux qui font tourner la guilde.", couleur: "#FFB552", halo: "rgba(255,181,82,.55)", anime: true },
  { seuil: 22, nom: "Légende", obtention: "Il faudra des années pour te rattraper.", couleur: "#FFD24A", halo: "rgba(255,210,74,.7)", anime: true },
];

/** Le rang atteint à ce niveau. */
export function rangDe(niveau: number): Rang {
  let r = RANGS[0];
  for (const x of RANGS) if (niveau >= x.seuil) r = x;
  return r;
}

/** Le rang suivant, et ce qu'il reste à faire — ce qui donne un cap. */
export function rangSuivant(niveau: number): Rang | null {
  return RANGS.find((r) => r.seuil > niveau) ?? null;
}
