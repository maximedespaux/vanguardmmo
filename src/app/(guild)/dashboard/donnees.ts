/**
 * CE QUE L'ACCUEIL DE GUILDE LIT, et rien de plus.
 *
 * Les deux relevés viennent d'API QUI EXISTENT DÉJÀ. C'était une contrainte du
 * chantier et c'est aussi la bonne façon de faire : `/api/dashboard` compte la
 * guilde, `/api/profil` ne lit jamais que le membre connecté (il n'a même pas de
 * paramètre pour viser quelqu'un d'autre, ce qui est le plus simple moyen de ne
 * pas se tromper). Aucune route neuve, donc rien de nouveau à garder.
 *
 * Les types sont écrits ici et pas dans la page parce que trois fichiers les
 * partagent — les portes, les barres, et le bloc « où j'en suis ». Recopier la
 * forme du relevé dans chacun, c'est se réveiller un jour avec trois formes qui
 * ne sont plus d'accord.
 *
 * DEUX CHAMPS DU RELEVÉ NE SONT PAS UTILISÉS ICI, exprès :
 *   · `coffre.topDeficits` — les cinq objets qui manquent le plus. C'est le sujet
 *     de /plan-farm et de /coffre ; un accueil qui les détaille redevient l'outil
 *     qu'il est censé desservir. La porte y mène, avec son compte.
 *   · `members.roles` — la pyramide des rangs. Personne n'en a l'usage sur un
 *     accueil, et l'afficher parce qu'elle est dans le JSON est exactement ce que
 *     la maison interdit.
 */

export type Prio = { level: "haute" | "moyenne" | "basse"; label: string; count: number; href: string };

/** Le relevé de `/api/dashboard`. Gardé par `apiGuild`. */
export type Dashboard = {
  members: { total: number; active: number; inactive: number; roles: { role: string; count: number }[] };
  characters: {
    total: number; mains: number; secondaries: number; withoutBuild: number;
    classes: { classe: string; count: number }[];
  };
  builds: { total: number; withoutBuild: number };
  absences: { active: number; pending: number };
  coffre: { under: number; total: number; topDeficits: { item: string; stock: number; target: number; manque: number }[] };
  candidatures: { pending: number; waiting: number; total: number };
  worldboss: { upcoming: number; next: string | null };
  priorities: Prio[];
};

export type PersoProfil = {
  id: string; name: string; class: string;
  level: number; prestige: number; isMain: boolean; stuffs: number;
};

/**
 * La PART de `/api/profil` qu'on lit. La route en rend davantage — les commandes
 * ligne par ligne, les mouvements de périns, le bilan de service. Ça ne se
 * consulte pas sur un accueil : ça se consulte sur /profil, dont c'est le sujet.
 */
export type Profil = {
  identite: { pseudo: string | null; role: string; membreDepuis: string; verifieLe: string | null };
  compteurs: { commandes: number; enCours: number; personnages: number; stuffs: number };
  personnages: PersoProfil[];
};

/** « 1 personnage », « 3 personnages » — un s qui ne se met pas à 1. */
export const pl = (n: number, mot: string, suffixe = "s") => `${n} ${mot}${n > 1 ? suffixe : ""}`;

/** Les nombres en français, avec l'espace insécable des milliers. */
export const fr = (n: number) => n.toLocaleString("fr-FR");

/** « juillet 2026 » — assez précis pour une ancienneté, et ça ne vieillit pas mal. */
export function moisAn(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
