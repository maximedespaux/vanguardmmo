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
  /** Emblème officiel du client, 64x64, versé dans /public/jeu/classes/.
   *  Distinct de `logo` volontairement : `logo` est le visuel maison qu'affichent
   *  toutes les pages depuis le début, changer sa valeur ferait bouger le site
   *  entier. L'emblème s'obtient en le demandant (cf. ClassLogo `officiel`). */
  embleme: string;
  /** Le bouton de sélection de classe du jeu. Ce n'est PAS un bandeau de nom :
   *  ouvert, le fichier de 216x54 est une planche de QUATRE cases de 54x54 —
   *  au repos, au repos (survol), choisi (cerné de jaune), inactif (gris). Aucun
   *  texte dedans. On y découpe donc une case, jamais l'image entière : affichée
   *  telle quelle, elle montre le même dessin quatre fois. Cf. ClassBouton. */
  boutonJeu: string;
}

/** Taille d'une case dans la planche `boutonJeu`, et rang de chaque état. */
export const BOUTON_JEU = { case: 54, etats: { repos: 0, survol: 1, choisi: 2, inactif: 3 } } as const;

export const CLASSES: Record<string, ClassInfo> = {
  Spadassin:   { key: "Spadassin",   label: "Spadassin",   en: "Slayer",       role: "dps",     emoji: "sword-cross", logo: "/classes/Slayer.png",       embleme: "/jeu/classes/jobstormbladehero.webp",   boutonJeu: "/jeu/classes/jobcharslayer.webp" },
  Templier:    { key: "Templier",    label: "Templier",    en: "Templar",      role: "tank",    emoji: "shield",      logo: "/classes/Templar.png",      embleme: "/jeu/classes/joblordtemplerhero.webp",  boutonJeu: "/jeu/classes/jobchartemplar.webp" },
  Arcaniste:   { key: "Arcaniste",   label: "Arcaniste",   en: "Arcanist",     role: "dps",     emoji: "orb",         logo: "/classes/Arcanist.png",     embleme: "/jeu/classes/jobelementorlordhero.webp", boutonJeu: "/jeu/classes/jobchararcanist.webp" },
  Envouteur:   { key: "Envouteur",   label: "Envoûteur",   en: "Mentalist",    role: "support", emoji: "spiral",      logo: "/classes/Mentalist.png",    embleme: "/jeu/classes/jobmentalisthero.webp",    boutonJeu: "/jeu/classes/jobcharmentalist.webp" },
  Arbaletrier: { key: "Arbaletrier", label: "Arbalétrier", en: "Crackshooter", role: "dps",     emoji: "bow",         logo: "/classes/Crackshooter.png", embleme: "/jeu/classes/jobcrackshooterhero.webp", boutonJeu: "/jeu/classes/jobcharcrackshooter.webp" },
  Sylphide:    { key: "Sylphide",    label: "Sylphide",    en: "Harlequin",    role: "support", emoji: "target",      logo: "/classes/Harlequin.png",    embleme: "/jeu/classes/jobwindlurkerhero.webp",   boutonJeu: "/jeu/classes/jobcharharlequin.webp" },
  Primat:      { key: "Primat",      label: "Primat",      en: "Seraph",       role: "dps",     emoji: "fist",        logo: "/classes/Seraph.png",       embleme: "/jeu/classes/jobfloristhero.webp",      boutonJeu: "/jeu/classes/jobcharseraph.webp" },
  Chanoine:    { key: "Chanoine",    label: "Chanoine",    en: "Forcemaster",  role: "support", emoji: "sparkles",    logo: "/classes/Forcemaster.png",  embleme: "/jeu/classes/jobforcemasterhero.webp",  boutonJeu: "/jeu/classes/jobcharforcemaster.webp" },
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
