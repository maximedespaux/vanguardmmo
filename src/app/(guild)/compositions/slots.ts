// Définition des postes de la Chambre Secrète — partagée entre la page Compositions
// et la route des builds de référence (/compositions/build/[slotId]).

/**
 * CE QUE FAIT UN POSTE, PHASE PAR PHASE — et quel chiffre le juge.
 *
 * Le bot de Dracarys déduisait un rôle unique d'un joueur (tank OU dps pour la soirée).
 * Nos Primats ne tiennent pas dans ce moule : p2 tanke les jumeaux puis frappe
 * l'araignée. Le rôle se dit donc par poste et par phase (spec §2.3), dans le code et
 * sans migration : la composition elle-même ne stocke que des inscriptions.
 *
 * `mesure` dit quel stuff montrer à côté du nom, par ordre de préférence. L'Off tank,
 * ce sont les PV en SCEPTRE : c'est le stuff qui tanke les boss (jumeaux, golems) ; le
 * Tank, ce sont les PV en poing (Primat, Chanoine) ou en doloire (Templier), réservés au
 * boss final. `toutes` : tous les chiffres de `mesure` s'affichent, dans l'ordre, au lieu
 * du premier trouvé — p1 tient les deux stuffs et le staff doit voir les deux.
 *
 * Pour p1 et p2, `mesure` suit la règle des trois Primats tranchée par Maxime le
 * 2026-10-21 (décision 4 de la spec : DPS, Off tank en sceptre, Tank en poing ET en
 * sceptre) ; les rôles par phase sont les valeurs recommandées de Q2. Les autres postes
 * n'en portent pas et prennent CS_DEFAUT (dps partout). Le tout passera au paramétrage
 * des bras droits avec les postes (décision 5, lot 2) : ici, ce sont les valeurs par
 * défaut.
 */
export type RolesCS = {
  jumeaux: "tank" | "dps";
  golems: "tank" | "dps";
  araignee: "tank" | "dps";
  mesure: ("tank" | "offtank" | "dps")[];
  toutes?: true;
};
export const CS_DEFAUT: RolesCS = { jumeaux: "dps", golems: "dps", araignee: "dps", mesure: ["dps"] };

export type Slot = { id: string; group: string; label: string; classe: string; note: string; build?: string; cs?: RolesCS };

export const CS_SLOTS: Slot[] = [
  { id: "p1", group: "Tanks (Primats)", label: "Primat — Tank croix", classe: "Primat", note: "Croix puis boss final (tank/dps)", build: "Stuffs nécessaires : DPS · Off-Tank Full HP (Sceptre) · Tank Full HP (Poing).\n\nRôles :\n• DPS — AoE les araignées et petits mobs\n• Off-Tank — tank les Boss (4M8 d'HP) et croix en même temps\n• Tank — Full HP pour tanker le boss final (7M8 d'HP)",
    cs: { jumeaux: "tank", golems: "tank", araignee: "tank", mesure: ["offtank", "tank"], toutes: true } },
  // Pas de stuff Tank dans son build (« DPS / Off-Tank ») : le poing n'est qu'un repli.
  { id: "p2", group: "Tanks (Primats)", label: "Primat — Tank croix jumeaux", classe: "Primat", note: "Croix jumeaux → dps araignée → croix boss final", build: "Primat — DPS / Off-Tank.\n\nCroix jumeaux, puis DPS sur les araignées, puis croix sur le boss final.",
    cs: { jumeaux: "tank", golems: "tank", araignee: "dps", mesure: ["offtank", "tank"] } },
  { id: "d1", group: "DPS physique", label: "Cheva", classe: "Templier", note: "DPS physique", build: "Templier DPS physique — AoE araignées et mobs." },
  { id: "d2", group: "DPS physique", label: "YJ", classe: "Sylphide", note: "DPS physique", build: "Sylphide DPS physique." },
  { id: "d3", group: "DPS physique", label: "Spadassin", classe: "Spadassin", note: "DPS physique", build: "Spadassin DPS physique." },
  { id: "d4", group: "DPS physique", label: "Arbalétrier", classe: "Arbaletrier", note: "DPS physique", build: "Arbalétrier DPS physique." },
  { id: "d5", group: "DPS physique", label: "Moine", classe: "Chanoine", note: "DPS physique", build: "Chanoine DPS physique." },
  { id: "d6", group: "DPS physique", label: "Arcaniste (option)", classe: "Arcaniste", note: "Si besoin : +1 à +2 arca", build: "Arcaniste DPS — slot optionnel si besoin de +1 à +2 arca." },
  { id: "m1", group: "DPS magique", label: "Arcaniste", classe: "Arcaniste", note: "2 à 3 arca", build: "Arcaniste DPS magique." },
  { id: "m2", group: "DPS magique", label: "Arcaniste", classe: "Arcaniste", note: "2 à 3 arca", build: "Arcaniste DPS magique." },
  { id: "m3", group: "DPS magique", label: "Arcaniste (option)", classe: "Arcaniste", note: "3ème arca si dispo", build: "Arcaniste DPS magique — 3ème arca si dispo." },
  { id: "m4", group: "DPS magique", label: "Soso", classe: "Envouteur", note: "Support / debuff magique", build: "Envoûteur — support / debuff magique." },
];

export const GROUP_META: Record<string, { color: string; icon: string }> = {
  "Tanks (Primats)": { color: "#4EA8FF", icon: "shield" },
  "DPS physique": { color: "#C69A55", icon: "sword-cross" }, // or GENESIS (--gn-or) écrit en hex : compositions/page.tsx y colle un suffixe alpha (`${meta.color}22`)
  "DPS magique": { color: "#C77DFF", icon: "orb" },
};
export const GROUPS = Object.keys(GROUP_META);
