/**
 * Rendus de personnage (illustration classe + sexe), partagés entre le site et
 * l'AirBuilder. La table vivait uniquement en dur dans public/airbuilder/airbuilder.js
 * (`CHARIMG`), donc le site ne pouvait pas afficher ces visuels.
 *
 * Les images sont celles de l'AirBuilder : /airbuilder/icons/emb_024..039.png,
 * une paire (Garçon / Fille) par classe.
 */

export type Sexe = "G" | "F";

/** Clé = "Classe|Sexe". Les noms de classe sont ceux de CLASSES, sans accent. */
export const RENDUS: Record<string, string> = {
  "Arcaniste|G": "/airbuilder/icons/emb_024.png", "Arcaniste|F": "/airbuilder/icons/emb_025.png",
  "Spadassin|G": "/airbuilder/icons/emb_026.png", "Spadassin|F": "/airbuilder/icons/emb_027.png",
  "Templier|G": "/airbuilder/icons/emb_028.png", "Templier|F": "/airbuilder/icons/emb_029.png",
  "Envouteur|G": "/airbuilder/icons/emb_030.png", "Envouteur|F": "/airbuilder/icons/emb_031.png",
  "Arbaletrier|G": "/airbuilder/icons/emb_032.png", "Arbaletrier|F": "/airbuilder/icons/emb_033.png",
  "Sylphide|G": "/airbuilder/icons/emb_034.png", "Sylphide|F": "/airbuilder/icons/emb_035.png",
  "Primat|G": "/airbuilder/icons/emb_036.png", "Primat|F": "/airbuilder/icons/emb_037.png",
  "Chanoine|G": "/airbuilder/icons/emb_038.png", "Chanoine|F": "/airbuilder/icons/emb_039.png",
};

/** Dépouille les accents : les libellés affichés en portent (« Arbalétrier »), les clés non. */
const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Illustration d'un personnage. Repli sur le rendu Garçon si le sexe est inconnu,
 * puis `null` si la classe elle-même est inconnue — à l'appelant d'afficher autre chose.
 */
export function renduPerso(classe: string, sexe: Sexe | null | undefined): string | null {
  const c = sansAccent(String(classe || "").trim());
  return RENDUS[`${c}|${sexe === "F" ? "F" : "G"}`] ?? RENDUS[`${c}|G`] ?? null;
}
