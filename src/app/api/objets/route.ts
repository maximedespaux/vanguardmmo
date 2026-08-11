import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";
import { chercher, comptesParFamille, dateDuCatalogue, nombreDObjets } from "@/components/objets/catalogue";
import type { Critere } from "@/components/objets/catalogue";
import type { Famille } from "@/components/objets/vocabulaire";

/**
 * La recherche d'objets. On renvoie 50 lignes, jamais le catalogue.
 *
 * Le fichier lu fait 3 Mo : c'est précisément pour ne pas l'envoyer au
 * navigateur qu'il y a une route ici. Elle rend aussi les comptes par famille,
 * parce qu'ils se calculent sur le même passage — les demander séparément
 * relirait 12 134 lignes pour rien.
 */

const FAMILLES_VALIDES = ["arme", "armure", "bijou", "mode", "consommable", "materiau", "familier", "divers"];

export async function GET(req: Request) {
  const a = await apiAuth(); if ("error" in a) return a.error;
  if (!canAccessGuild(a.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const p = new URL(req.url).searchParams;
  const famille = p.get("famille") ?? "";
  const grade = p.get("grade") ?? "";
  const niveauBrut = Number(p.get("niveau"));

  const c: Critere = {
    q: p.get("q") ?? "",
    famille: (FAMILLES_VALIDES.includes(famille) ? famille : "") as Famille | "",
    grade: grade === "Unique" || grade === "Ultime" ? grade : "",
    // Un niveau hors bornes est une saisie en cours, pas un filtre : on l'ignore
    // plutôt que de renvoyer une liste vide sans expliquer pourquoi.
    niveau: Number.isFinite(niveauBrut) && niveauBrut >= 1 && niveauBrut <= 200 ? niveauBrut : null,
    avecBonus: p.get("bonus") === "1",
  };

  const { total, objets } = chercher(c, 50);
  return NextResponse.json({
    objets, total, montres: objets.length,
    familles: comptesParFamille({ ...c, famille: "" }),
    catalogue: { objets: nombreDObjets(), genere: dateDuCatalogue() },
  });
}
