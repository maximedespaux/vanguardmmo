import { NextResponse } from "next/server";
import { chercher, comptes, metaCatalogue } from "@/components/monstres/catalogue";
import type { Critere } from "@/components/monstres/catalogue";

/**
 * La recherche de monstres. On renvoie 48 lignes, jamais le catalogue.
 *
 * Pas de verrou d'accès, et c'est voulu : `/monstres` vit dans l'espace public du
 * site, comme les donjons et les classes. Ce sont les données du client du jeu,
 * que n'importe qui peut extraire lui-même — rien de la vie de la guilde ne passe
 * ici.
 *
 * Le fichier lu fait 612 Ko : c'est précisément pour ne pas l'envoyer au
 * navigateur qu'il y a une route. Elle rend aussi les comptes par rang et par
 * élément, parce qu'ils se calculent sur le même passage — les demander
 * séparément relirait 1 124 lignes pour rien.
 */

const RANGS = ["faible", "normal", "capitaine", "demi-boss", "boss", "super", "materiau"];
const ELEMENTS = ["feu", "eau", "electricite", "vent", "terre", "aucun"];
const TRIS = ["pertinence", "pvEff", "niveau", "degats"];
const PROVENANCES = ["maison", "base"];

/** Un niveau hors bornes est une saisie en cours, pas un filtre : on l'ignore
 *  plutôt que de renvoyer une liste vide sans expliquer pourquoi. Le jeu monte
 *  jusqu'à 250 (Elun, les boss de monde). */
function niveau(v: string | null): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 && n <= 250 ? n : null;
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const rang = p.get("rang") ?? "";
  const element = p.get("element") ?? "";
  const tri = p.get("tri") ?? "";
  const provenance = p.get("provenance") ?? "";

  const c: Critere = {
    q: p.get("q") ?? "",
    // « Qui lâche ça ? » — cherché dans les noms de butin, jamais dans les taux.
    // Deux caractères suffiraient à ramener la moitié du catalogue : on exige trois.
    objet: (p.get("objet") ?? "").trim().length >= 3 ? p.get("objet")!.trim() : "",
    rang: RANGS.includes(rang) ? rang : "",
    element: ELEMENTS.includes(element) ? element : "",
    niveauMin: niveau(p.get("nivMin")),
    niveauMax: niveau(p.get("nivMax")),
    provenance: PROVENANCES.includes(provenance) ? (provenance as "maison" | "base") : undefined,
    plusieursVies: p.get("vies") === "1",
    tri: (TRIS.includes(tri) ? tri : "pertinence") as Critere["tri"],
  };

  const { total, monstres } = chercher(c, 48);
  const meta = metaCatalogue();
  return NextResponse.json({
    monstres, total, montres: monstres.length,
    ...comptes(c),
    catalogue: { total: meta.total, genere: meta.genere, compteurs: meta.compteurs },
  });
}
