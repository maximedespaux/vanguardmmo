import fs from "fs";
import path from "path";

/**
 * Où trouver un objet — la question que le plan de farm ne répondait pas.
 *
 * Il dit ce qui manque, jamais où l'obtenir. Or le catalogue d'AirGuild liste
 * déjà, pour chaque donjon, ce qu'on y ramasse : il suffit de le lire à
 * l'envers. Aucune donnée nouvelle à saisir, donc rien à maintenir en double.
 */
export type Source = { donjon: string; niveau: string; type: string };

let INDEX: Map<string, Source[]> | null = null;

/** Comparaison tolérante : « Pierre Lunaire » et « pierre lunaire » sont le même objet. */
const clef = (n: string) =>
  (n || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export function sourcesDe(nomObjet: string): Source[] {
  if (!INDEX) {
    INDEX = new Map();
    try {
      const brut = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "airguild", "data.json"), "utf-8"));
      for (const d of brut.dungeons ?? []) {
        const src: Source = { donjon: String(d.name ?? "?"), niveau: String(d.lvl ?? ""), type: String(d.type ?? "") };
        for (const butin of Object.values(d.groups ?? {}) as { n?: string }[][]) {
          for (const objet of butin ?? []) {
            const k = clef(objet?.n ?? "");
            if (!k) continue;
            const liste = INDEX.get(k) ?? [];
            // Un objet tombe parfois dans cinq donjons : au-delà de trois, la
            // liste cesse d'aider à choisir.
            if (liste.length < 3 && !liste.some((s) => s.donjon === src.donjon)) liste.push(src);
            INDEX.set(k, liste);
          }
        }
      }
    } catch { /* pas de catalogue : on affichera simplement « source inconnue » */ }
  }
  return INDEX.get(clef(nomObjet)) ?? [];
}
