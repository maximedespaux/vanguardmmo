/**
 * La page Stratégie des Chambres Secrètes : des blocs, écrits par le staff.
 *
 * Un simple champ de texte ne suffisait pas — une stratégie se lit avec des
 * captures : le placement, la croix, les phases du boss. On garde donc une
 * SUITE de blocs (titre, paragraphe, image) plutôt qu'un pavé, pour que la page
 * se remanie sans tout réécrire quand le donjon change.
 *
 * Stockée à part de la composition (même table, autre clé), et pour une raison
 * précise : l'état de la composition est renvoyé EN ENTIER à chaque clic de
 * présence. Y mettre des images ferait voyager plusieurs mégaoctets à chaque
 * fois qu'un membre s'annonce.
 */
export const CLE_STRATEGIE = "strategie:cs";

export type BlocStrategie =
  | { id: string; type: "titre"; texte: string }
  | { id: string; type: "texte"; texte: string }
  | { id: string; type: "image"; url: string; legende: string };

export type PageStrategie = { blocs: BlocStrategie[] };

export const STRATEGIE_VIDE: PageStrategie = { blocs: [] };

/** Ce qui tient dans un bloc. Au-delà, on coupe : jamais d'exception. */
const MAX_TITRE = 120;
const MAX_TEXTE = 8000;
const MAX_LEGENDE = 300;
const MAX_BLOCS = 80;
/** Une image importée est réduite avant l'envoi ; ceci n'est que le garde-fou. */
export const MAX_IMAGE = 3_000_000;
/** Poids total accepté par la route. Au-delà, la page devient illisible à charger. */
export const MAX_PAGE = 12_000_000;

const txt = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** Une adresse d'image utilisable : fichier du site, lien https, ou image importée. */
const urlValide = (v: unknown): string => {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  if (s.startsWith("/")) return s.slice(0, 400);
  if (/^https:\/\//i.test(s)) return s.slice(0, 2000);
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(s)) return s.slice(0, MAX_IMAGE);
  return ""; // ni javascript:, ni http:// en clair
};

export function normaliserStrategie(raw: unknown): PageStrategie {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const blocs: BlocStrategie[] = (Array.isArray(o.blocs) ? o.blocs : [])
    .filter((b): b is Record<string, unknown> => !!b && typeof b === "object")
    .map((b, i) => {
      const id = txt(b.id, 40) || `b${i}`;
      if (b.type === "image") {
        return { id, type: "image" as const, url: urlValide(b.url), legende: txt(b.legende, MAX_LEGENDE) };
      }
      if (b.type === "titre") return { id, type: "titre" as const, texte: txt(b.texte, MAX_TITRE) };
      return { id, type: "texte" as const, texte: txt(b.texte, MAX_TEXTE) };
    })
    // Un bloc vide ne dit rien et occupe une place : il disparaît à
    // l'enregistrement plutôt que de laisser un trou dans la page.
    .filter((b) => (b.type === "image" ? !!b.url : !!b.texte.trim()))
    .slice(0, MAX_BLOCS);
  return { blocs };
}
