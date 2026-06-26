// Définition des postes de la Chambre Secrète — partagée entre la page Compositions
// et la route des builds de référence (/compositions/build/[slotId]).
export type Slot = { id: string; group: string; label: string; classe: string; note: string; build?: string };

export const CS_SLOTS: Slot[] = [
  { id: "p1", group: "Tanks (Primats)", label: "Primat — Tank croix", classe: "Primat", note: "Croix puis boss final (tank/dps)", build: "Stuffs nécessaires : DPS · Off-Tank Full HP (Sceptre) · Tank Full HP (Poing).\n\nRôles :\n• DPS — AoE les araignées et petits mobs\n• Off-Tank — tank les Boss (4M8 d'HP) et croix en même temps\n• Tank — Full HP pour tanker le boss final (7M8 d'HP)" },
  { id: "p2", group: "Tanks (Primats)", label: "Primat — Tank croix jumeaux", classe: "Primat", note: "Croix jumeaux → dps araignée → croix boss final", build: "Primat — DPS / Off-Tank.\n\nCroix jumeaux, puis DPS sur les araignées, puis croix sur le boss final." },
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
  "Tanks (Primats)": { color: "#4EA8FF", icon: "🛡️" },
  "DPS physique": { color: "#FF8C1A", icon: "⚔️" },
  "DPS magique": { color: "#C77DFF", icon: "🔮" },
};
export const GROUPS = Object.keys(GROUP_META);
