// Petits utilitaires partagés par les commandes et le planificateur.
import { TIMEZONE } from "../config.js";

export const ORANGE = 0xff8c1a;

// Emoji de statut de stock du coffre (vert / orange / rouge) selon la cible.
export function stockEmoji(stock: number, target: number): string {
  if (stock >= target) return "🟢";
  if (stock >= Math.ceil(target * 0.6)) return "🟡";
  return "🔴";
}

// Libellés FR des catégories du coffre.
export const COFFRE_LABELS: Record<string, string> = {
  STUFF_YGGDRASIL: "Stuff Yggdrasil",
  ARMES_YGGDRASIL: "Armes Yggdrasil",
  STUFF_ETERNEL: "Stuff Éternel",
  ARMES_ETERNEL: "Armes Éternel",
  BIJOUX: "Bijoux",
  EVEIL_R1: "Éveil R1",
  EVEIL_R2: "Éveil R2",
  RESSOURCE: "Ressources",
};

// ─── Conversion "jour + heure" → expression cron (node-cron) ──
const DOW: Record<string, string> = {
  dimanche: "0", lundi: "1", mardi: "2", mercredi: "3",
  jeudi: "4", vendredi: "5", samedi: "6", tous: "*",
};

/** Construit une expression cron "m H * * dow" à partir d'un jour FR et d'une heure HH:MM. */
export function toCron(day: string, time: string): string {
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  return `${m} ${h} * * ${DOW[day] ?? "*"}`;
}

/** Renvoie l'heure "HH:MM" décalée de -minutes (rappel avant). null si ça change de jour. */
export function minusMinutes(time: string, minutes: number): string | null {
  const [h, m] = time.split(":").map((n) => parseInt(n, 10));
  let total = h * 60 + m - minutes;
  if (total < 0) return null; // passerait la veille → on ignore le rappel avancé
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export const CRON_TZ = { timezone: TIMEZONE } as const;
