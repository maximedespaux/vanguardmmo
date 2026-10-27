/**
 * Ce qu'on peut préciser sur une pièce — et seulement ce que le jeu permet.
 *
 * Les réglages sont ceux du builder (public/airbuilder/airbuilder.js, fonctions
 * defCfg / panelFor) : une arme se perce et se rend rare, un casque non ; un
 * anneau monte à +30 quand une tenue plafonne à +10 ; l'éveil est R1 ou R2, pas
 * R3. Afficher partout les mêmes cases ferait croire à des pièces impossibles —
 * « Casque Légendaire percé Fulgur » ne veut rien dire. Les Mécaniques lisent
 * cette table pour dire ce que chaque emplacement accepte.
 *
 * Le nom d'un objet du coffre (reglagesPour) et la pièce commandée sur mesure y
 * menaient aussi, avec la saisie d'une pièce et son résumé en une ligne : ces
 * entrées sont parties avec le coffre et la Boutique, le 2026-10-21.
 *
 * Pas de Prisma ni de fs ici : le module doit rester lisible côté navigateur.
 */

/** Rareté d'arme, mêmes paliers que MECH.arme.rarete_tiers du builder. */
export const RARETES = ["Commun", "Rare", "Épique", "Légendaire", "Pré-Mythique", "Mythique"] as const;
/** Éveil : le builder n'en propose que deux rangs. */
export const RANGS_EVEIL = ["R1", "R2"] as const;
/** data.json → EVSTATS. */
export const STATS_EVEIL = ["Force", "Endurance", "Dextérité", "Intelligence", "Dégâts critiques", "Attaque", "PV max", "MP max"] as const;
/** Scroll stat : quatre statistiques, +1 à +4. */
export const STATS_SCROLL = ["Force", "Endurance", "Dextérité", "Intelligence"] as const;
/** Élément de l'arme (≠ carte de perçage), data.json → ELEMENTS. */
export const ELEMENTS = ["Feu", "Eau", "Vent", "Terre", "Électricité"] as const;
/** Sertissage d'une arme : 5 diamants, data.json → DIASTATS. */
export const STATS_DIAMANT = ["Intelligence", "Endurance", "Force", "Dextérité", "Syphon de vie", "Dégâts JcJ", "Attaque", "Défense", "PV max"] as const;
/** Les 3 diamants HOLOGRAPHIQUES ne se débloquent qu'en artefact (+11 à +20) — data.json → HOLOSTATS. */
export const STATS_HOLO = ["Intelligence +33", "Endurance +33", "Force +33", "Dextérité +33", "Dégâts JcJ +15"] as const;
/** Gemmes de fashion : 4 emplacements, data.json → GEMC (noms uniques). */
export const STATS_GEMME = ["Force", "Endurance", "Dextérité", "Intelligence", "Attaque", "Dégâts magiques", "Dégâts critiques", "Dégâts magiques %", "Heal Rate", "PV max", "Défense"] as const;
/** Cartes de perçage : arme et bouclier d'un côté, tenue de l'autre. */
/**
 * Les deux familles de cartes de perçage, reprises de la base d'objets du jeu.
 *
 * Une arme ou un bouclier prend une carte d'ATTAQUE ; une tenue prend une carte
 * de DÉFENSE. Le même élément change de nom d'une famille à l'autre — le feu
 * attaque sous « Feu » et défend sous « Volcano ». Les listes étaient
 * incomplètes des deux côtés : l'air manquait à l'attaque, et la défense n'avait
 * que trois de ses cinq cartes.
 */
export { CARTES_ATTAQUE as CARTES_ARME, CARTES_DEFENSE as CARTES_TENUE } from "@/lib/assetsJeu";
import { CARTES_ATTAQUE, CARTES_DEFENSE } from "@/lib/assetsJeu";

export type SlotFlyff = "weapon" | "shield" | "suit" | "armor" | "jewel" | "cape" | "fashion";

export type Reglages = {
  slot: SlotFlyff;
  /** Étiquette lisible du slot, pour l'écran. */
  label: string;
  /** Rareté Commun→Mythique : armes concernées seulement. */
  rarete: boolean;
  /** Amélioration maximale (+N), ou 0 si la pièce ne s'améliore pas. */
  upMax: number;
  /** Étoiles d'artefact, sur les armes qui montent au-delà de +10. */
  etoiles: boolean;
  /** Perçage : emplacements maximum et cartes possibles. */
  percage: { max: number; cartes: readonly string[] } | null;
  eveil: boolean;
  scroll: boolean;
  /** Niveau d'élément maximum, ou 0 si la pièce n'en porte pas. */
  elementMax: number;
  /** Sertissage : diamants, et diamants holographiques quand la pièce passe en
   *  artefact. Réservé aux armes, comme dans weaponPanelImpl. */
  sertissage: { diamants: number; holo: number } | null;
  /** Emplacements de gemmes — les fashions, et elles seules (fashionPanel). */
  gemmes: number;
};

const sansAccent = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/**
 * Les réglages d'un emplacement, à la source : c'est la table de vérité, et les
 * règles ne sont écrites qu'ici.
 *
 * `artefact` : une arme Éternelle ou Yggdrasil monte à +20 et ouvre douze
 * perçages (weaponPanelImpl) ; les autres plafonnent à +10 et dix.
 * `rarete` : ne concerne que les armes, et pas toutes (marteaux, boucliers et
 * grimoires n'ont pas de palier).
 */
export function reglagesDeSlot(slot: SlotFlyff, o: { artefact?: boolean; rarete?: boolean; label?: string } = {}): Reglages {
  const art = !!o.artefact;
  const base = { slot, label: o.label ?? slot, rarete: false, upMax: 0, etoiles: false, percage: null, eveil: false, scroll: false, elementMax: 0, sertissage: null, gemmes: 0 } as Reglages;
  switch (slot) {
    case "weapon":
      return { ...base, label: o.label ?? "Arme", rarete: o.rarete !== false, upMax: art ? 20 : 10, etoiles: art,
        percage: { max: art ? 12 : 10, cartes: CARTES_ATTAQUE }, eveil: true, scroll: true, elementMax: 20,
        // Les 3 holographiques se débloquent en artefact : on les propose là où
        // le builder les propose, pas ailleurs.
        sertissage: { diamants: 5, holo: art ? 3 : 0 } };
    case "shield":
      return { ...base, label: o.label ?? "Bouclier", upMax: 10, percage: { max: 10, cartes: CARTES_ATTAQUE }, eveil: true, elementMax: 20 };
    case "suit":
      return { ...base, label: o.label ?? "Tenue", upMax: 10, percage: { max: 4, cartes: CARTES_DEFENSE }, eveil: true, scroll: true, elementMax: 20 };
    case "armor":
      // « Cette pièce n'a ni perçage ni élément » — armorPanel du builder.
      return { ...base, label: o.label ?? "Armure", upMax: 10, eveil: true, scroll: true };
    case "jewel":
      // jewelPanel : jusqu'à +30 (aProtect lunaire), et l'éveil, rien d'autre.
      return { ...base, label: o.label ?? "Bijou", upMax: 30, eveil: true };
    case "cape":
      return { ...base, label: o.label ?? "Cape", eveil: true };
    case "fashion":
      return { ...base, label: o.label ?? "Fashion", upMax: 10, gemmes: 4 };
  }
}
