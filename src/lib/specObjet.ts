/**
 * La description d'un objet EXACT, telle qu'elle voyage du builder à la boutique.
 *
 * Le manque était là : une requête ne portait qu'un nom et une quantité. Or ce
 * qu'on demande, c'est une pièce précise — une Hache Légendaire +9 percée
 * Fulgur n'est pas la Hache du même nom rangée au coffre. Le détenteur devait
 * deviner, ou tout redemander dans la discussion.
 *
 * On transporte des DONNÉES, jamais le HTML de la bulle du builder : ce HTML
 * finirait stocké en base puis réinjecté dans la page du staff, ce qui revient
 * à laisser un membre écrire dans l'écran d'un autre. La bulle est redessinée
 * côté site à partir de ces champs (voir components/BulleObjet).
 */
export type LigneSpec = { label: string; valeur: string };

export type SpecObjet = {
  /** Nom de l'objet, tel qu'affiché dans le builder. */
  nom: string;
  /** Emplacement (« Arme », « Casque »…) — dit de quelle pièce on parle. */
  slot: string;
  /** Image (data-URI ou chemin) reprise du catalogue du builder. */
  icone?: string | null;
  /** Couleur du nom : c'est le code visuel de la rareté dans le builder. */
  couleur?: string | null;
  /** Rareté / palier (« Légendaire », « Éternel »…). */
  tier?: string | null;
  /** Niveau d'amélioration (+9) et étoiles, pour les armes. */
  up?: number | null;
  etoiles?: number | null;
  classe?: string | null;
  niveau?: number | null;
  prestige?: number | null;
  /** Attaque min ~ max, pour une arme. */
  attaque?: [number, number] | null;
  /** Pastilles courtes : rune, maîtrise, perçage… */
  puces?: string[];
  /** Le détail configuré : sertissage, éveil, scroll… */
  lignes?: LigneSpec[];
};

const texte = (v: unknown, max = 120): string => (typeof v === "string" ? v.slice(0, max) : "");
const nombre = (v: unknown): number | null => (Number.isFinite(Number(v)) ? Number(v) : null);

/** Ce que le sertissage contient, résumé en une ligne lisible (« Force ×3 »). */
function compter(arr: unknown): string {
  if (!Array.isArray(arr)) return "";
  const m = new Map<string, number>();
  for (const x of arr) if (typeof x === "string" && x) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m].map(([k, n]) => (n > 1 ? `${k} ×${n}` : k)).join(" · ");
}

/**
 * Traduit une pièce équipée du builder (`{ item, cfg }`) en spec transportable.
 * Tolérant par construction : le blob vient du localStorage d'une app tierce,
 * il ne doit jamais faire tomber la page qui le lit.
 */
export function specDepuisEquip(slotLabel: string, entree: unknown): SpecObjet | null {
  const e = (entree ?? {}) as { item?: Record<string, unknown>; cfg?: Record<string, unknown>; rank?: unknown; rune?: unknown };
  const it = e.item;
  if (!it || typeof it !== "object") return null;
  const cfg = (e.cfg ?? {}) as Record<string, unknown>;

  const puces: string[] = [];
  if (typeof cfg.tier === "string" && cfg.tier && cfg.tier !== "Commun") puces.push(cfg.tier);
  if (typeof cfg.rune === "string" && cfg.rune) puces.push(`Rune ${cfg.rune}`);
  else if (cfg.rune === true) puces.push("Rune");
  if (nombre(cfg.mastery)) puces.push(`Maîtrise ${nombre(cfg.mastery)}/100`);
  if (typeof e.rank === "string" && e.rank) puces.push(`Rang ${e.rank}`);

  const lignes: LigneSpec[] = [];
  const dia = compter(cfg.dia);
  if (dia) lignes.push({ label: "Sertissage", valeur: dia });
  const holo = compter(cfg.holo);
  if (holo) lignes.push({ label: "Holo", valeur: holo });
  const gemmes = compter(cfg.gems);
  if (gemmes) lignes.push({ label: "Gemmes", valeur: gemmes });
  if (Array.isArray(cfg.pierce)) {
    const ouverts = nombre(cfg.pn) ?? (cfg.pierce as unknown[]).filter(Boolean).length;
    if (ouverts) lignes.push({ label: "Perçage", valeur: `${ouverts}${cfg.pierceEl ? ` · ${texte(cfg.pierceEl, 30)}` : ""}` });
  }
  if (cfg.evL) lignes.push({ label: "Éveil", valeur: `${texte(String(cfg.evL), 20)}${cfg.evS ? ` · ${texte(String(cfg.evS), 40)}` : ""}` });
  if (cfg.scrS) lignes.push({ label: "Scroll", valeur: `${texte(String(cfg.scrS), 40)} +${nombre(cfg.scrL) ?? 0}` });
  if (cfg.lvl) lignes.push({ label: "Niveau", valeur: String(nombre(cfg.lvl) ?? "") });

  const atk = Array.isArray(it.atk) && it.atk.length >= 2 ? ([nombre(it.atk[0]) ?? 0, nombre(it.atk[1]) ?? 0] as [number, number]) : null;

  return {
    nom: texte(it.n, 120) || "Objet",
    slot: slotLabel,
    icone: typeof it.icUrl === "string" ? it.icUrl.slice(0, 4000) : null,
    couleur: texte(it.col, 24) || null,
    tier: texte(cfg.tier as string, 40) || texte(it.tier as string, 40) || null,
    up: nombre(cfg.up),
    etoiles: nombre(cfg.stars),
    classe: Array.isArray(it.classes) ? it.classes.map((c) => texte(String(c), 24)).join(", ") : texte(it.cls as string, 40) || null,
    niveau: nombre(it.lv),
    prestige: nombre(it.pr),
    attaque: atk,
    puces,
    lignes,
  };
}

/** Relit une spec venue de la base (Json) sans jamais faire confiance à sa forme. */
export function specDepuisJson(v: unknown): SpecObjet | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (!o.nom) return null;
  return {
    nom: texte(o.nom, 120),
    slot: texte(o.slot, 40),
    icone: typeof o.icone === "string" ? o.icone.slice(0, 4000) : null,
    couleur: texte(o.couleur, 24) || null,
    tier: texte(o.tier, 40) || null,
    up: nombre(o.up),
    etoiles: nombre(o.etoiles),
    classe: texte(o.classe, 60) || null,
    niveau: nombre(o.niveau),
    prestige: nombre(o.prestige),
    attaque: Array.isArray(o.attaque) && o.attaque.length >= 2 ? [Number(o.attaque[0]) || 0, Number(o.attaque[1]) || 0] : null,
    puces: Array.isArray(o.puces) ? o.puces.map((p) => texte(String(p), 60)).slice(0, 10) : [],
    lignes: Array.isArray(o.lignes)
      ? (o.lignes as Record<string, unknown>[]).slice(0, 12).map((l) => ({ label: texte(l?.label, 40), valeur: texte(l?.valeur, 120) }))
      : [],
  };
}
