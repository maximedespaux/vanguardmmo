// ════════════════════════════════════════════════════════════
//  CLASSES AIRFLYFF — module centralisé (logos + rôles)
//  Logos dans /public/classes (64x64 PNG transparent)
// ════════════════════════════════════════════════════════════
export type Role = "dps" | "tank" | "support";

export interface ClassInfo {
  key: string;        // clé interne FR
  label: string;      // nom affiché
  en: string;         // nom anglais (logo)
  role: Role;
  emoji: string;      // fallback
  logo: string;       // chemin du logo
}

export const CLASSES: Record<string, ClassInfo> = {
  Spadassin:   { key: "Spadassin",   label: "Spadassin",   en: "Slayer",       role: "dps",     emoji: "⚔️", logo: "/classes/Slayer.png" },
  Templier:    { key: "Templier",    label: "Templier",    en: "Templar",      role: "tank",    emoji: "🛡️", logo: "/classes/Templar.png" },
  Arcaniste:   { key: "Arcaniste",   label: "Arcaniste",   en: "Arcanist",     role: "dps",     emoji: "🔮", logo: "/classes/Arcanist.png" },
  Envouteur:   { key: "Envouteur",   label: "Envoûteur",   en: "Mentalist",    role: "support", emoji: "🌀", logo: "/classes/Mentalist.png" },
  Arbaletrier: { key: "Arbaletrier", label: "Arbalétrier", en: "Crackshooter", role: "dps",     emoji: "🏹", logo: "/classes/Crackshooter.png" },
  Sylphide:    { key: "Sylphide",    label: "Sylphide",    en: "Harlequin",    role: "support", emoji: "🎯", logo: "/classes/Harlequin.png" },
  Primat:      { key: "Primat",      label: "Primat",      en: "Seraph",       role: "dps",     emoji: "👊", logo: "/classes/Seraph.png" },
  Chanoine:    { key: "Chanoine",    label: "Chanoine",    en: "Forcemaster",  role: "support", emoji: "✨", logo: "/classes/Forcemaster.png" },
};
export const CLASS_NAMES = Object.keys(CLASSES);
export const BONUS_LOGOS = { crown: "/classes/Crown.png", mvp: "/classes/Mvp.png" };

// Helper : retrouve une classe par son nom FR (gère accents/variantes)
export function findClass(name: string): ClassInfo | undefined {
  if (!name) return undefined;
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return Object.values(CLASSES).find(c => norm(c.label) === norm(name) || norm(c.key) === norm(name) || norm(c.en) === norm(name) || norm(name).includes(norm(c.label)));
}
export function classLogo(name: string): string | null {
  return findClass(name)?.logo ?? null;
}
