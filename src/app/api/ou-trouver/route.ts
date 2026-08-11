import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { apiAuth } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";

/**
 * « D'où vient cet objet ? » — craft, butin de quête, coffre, clé, Tour.
 *
 * Le fichier fait 1,8 Mo : trop pour un import statique (il partirait dans le paquet
 * JS de chaque page) et trop pour un fetch depuis le navigateur (le client
 * téléchargerait 1,8 Mo pour lire trois lignes). On le lit donc ici, une seule fois,
 * et on garde l'index en mémoire — même approche que src/lib/ouFarmer.ts.
 *
 * La recherche normalise les accents : le jeu écrit « Ame de démon » sans
 * circonflexe, et un joueur tape « Âme ». Sans ça, la moitié des recherches échoue.
 */

type Source = Record<string, unknown> & { type: string };
type Objet = { id: string; nom: string; icone: string | null; sources: Source[] };

let INDEX: Map<string, Objet> | null = null;
let AVERTISSEMENT = "";

const clef = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function charger() {
  if (INDEX) return INDEX;
  const f = path.join(process.cwd(), "public", "wiki", "ou-trouver.json");
  const d = JSON.parse(fs.readFileSync(f, "utf8")) as { objets: Objet[]; avertissement?: string };
  AVERTISSEMENT = d.avertissement ?? "";
  INDEX = new Map();
  // Plusieurs objets peuvent porter le même nom (versions garçon/fille) : on garde le
  // premier et on fusionne les sources des suivants, sinon l'un masquerait l'autre.
  for (const o of d.objets) {
    const k = clef(o.nom);
    const deja = INDEX.get(k);
    if (deja) deja.sources.push(...o.sources);
    else INDEX.set(k, { ...o, sources: [...o.sources] });
  }
  return INDEX;
}

/** Une source lisible par un joueur, sans code interne. */
function enClair(s: Source): { quoi: string; ou: string | null; chance: number | null } | null {
  const n = (v: unknown) => (typeof v === "number" ? v : null);
  switch (s.type) {
    case "craft":
      return { quoi: `Craft chez ${s.pnj ?? "un PNJ"}${s.actif === false ? " (inactif)" : ""}`,
        ou: (s.entrants as { nom: string; qte: number }[] | undefined)?.slice(0, 4).map((e) => `${e.nom} ×${e.qte}`).join(" + ") ?? null,
        chance: n(s.chance) };
    case "craft-maison":
      return { quoi: "Craft", ou: `${s.ingredient} — ${s.ouFarmer}`, chance: null };
    case "farm":
      return { quoi: `Sert à fabriquer ${s.sert}`, ou: String(s.ouFarmer ?? ""), chance: null };
    case "butin":
      return { quoi: `Butin sur ${s.monstre}${s.niveauMonstre ? ` (niv ${s.niveauMonstre})` : ""}`,
        ou: (s.zones as string[] | undefined)?.join(", ") || null, chance: n(s.pourcentage) };
    case "coffre":
      return { quoi: `Dans « ${s.coffre} »`, ou: null, chance: n(s.chance) };
    case "cle":
      return { quoi: `Coffre ouvert avec « ${s.cle} »`, ou: (s.coffre as string) ?? null, chance: n(s.chance) };
    case "tour":
      return { quoi: `Protection de l'Oasis, palier ${s.palier}`, ou: `×${s.quantite}`, chance: null };
    default:
      return null;
  }
}

export async function GET(req: Request) {
  const a = await apiAuth(); if ("error" in a) return a.error;
  if (!canAccessGuild(a.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const nom = new URL(req.url).searchParams.get("nom");
  if (!nom) return NextResponse.json({ error: "nom requis" }, { status: 400 });

  const o = charger().get(clef(nom));
  if (!o) return NextResponse.json({ nom, trouve: false, avertissement: AVERTISSEMENT });

  // Dédoublonnage : un objet présent dans quinze coffres afficherait quinze lignes
  // presque identiques. On garde les plus fortes chances d'abord, et on plafonne.
  const vues = new Set<string>();
  const sources = o.sources
    .map(enClair)
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((x, y) => (y.chance ?? -1) - (x.chance ?? -1))
    .filter((x) => { const k = x.quoi + "|" + x.ou; if (vues.has(k)) return false; vues.add(k); return true; });

  return NextResponse.json({
    nom: o.nom, trouve: true, icone: o.icone,
    sources: sources.slice(0, 12), total: sources.length,
    avertissement: AVERTISSEMENT,
  });
}
