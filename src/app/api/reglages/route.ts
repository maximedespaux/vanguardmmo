import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessGuild, canParametrer } from "@/config/roles";

/**
 * LES RÉGLAGES D'UNE PAGE — lecture pour la guilde, écriture pour le rang Vanguard.
 *
 * Demande de Maxime : « avoir la possibilité sur chaque page de faire un paramétrage
 * en tant que vanguard uniquement ».
 *
 * DEUX NIVEAUX D'ACCÈS, et l'écart entre les deux est le cœur de la route :
 *  · LIRE est ouvert à tout membre de guilde. Il le faut : les réglages décident de
 *    ce que la page affiche, donc chaque lecteur doit les connaître. Ils ne
 *    contiennent aucun secret — un interrupteur, un nombre de lignes.
 *  · ÉCRIRE exige `canParametrer`, soit VANGUARD et au-dessus. C'est un cran de plus
 *    qu'admin, qui ouvre à quatre rôles : régler ce qu'une page montre à toute la
 *    guilde n'est pas du même ordre que valider une candidature.
 *
 * LE SCHÉMA N'EST PAS ICI. La page déclare ses réglages dans son code
 * (`lib/reglages.ts` en donne la forme) ; cette route ne stocke que des VALEURS. Elle
 * ne peut donc pas valider le type d'un réglage qu'elle ne connaît pas — c'est
 * `fusionner()` qui écarte à la lecture ce dont le type ne correspond plus. La route,
 * elle, refuse ce qui n'est pas sérialisable proprement : pas d'objets imbriqués, pas
 * de tableaux, rien qui laisse passer un blob arbitraire dans une colonne Json.
 */

/** Un chemin de page, et rien d'autre : c'est la clé primaire de la table. */
function pageValide(p: string | null): p is string {
  return !!p && p.startsWith("/") && p.length <= 120 && !p.includes("..") && /^[a-z0-9/_-]+$/i.test(p);
}

export async function GET(req: NextRequest) {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  if (!canAccessGuild(a.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const page = req.nextUrl.searchParams.get("page");
  if (!pageValide(page)) return NextResponse.json({ error: "Page invalide" }, { status: 400 });

  const row = await prisma.pageReglages.findUnique({ where: { page } });
  // Une page jamais réglée n'est PAS une erreur : on renvoie un objet vide, et la
  // page applique ses défauts. Un 404 ici obligerait chaque appelant à traiter
  // l'absence comme un cas particulier, alors que c'est le cas courant.
  return NextResponse.json({
    page,
    valeurs: row?.data ?? {},
    parQui: row?.parQui ?? null,
    modifieLe: row?.updatedAt ?? null,
    /* On dit au client s'il peut écrire, pour qu'il n'affiche pas un panneau qui
       finirait sur un 403. Le contrôle réel reste ici : un client peut mentir. */
    peutRegler: canParametrer(a.user.role),
  });
}

export async function PUT(req: NextRequest) {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  if (!canParametrer(a.user.role)) {
    return NextResponse.json(
      { error: "Réservé au rang Vanguard : ces réglages décident de ce que la page montre à toute la guilde." },
      { status: 403 },
    );
  }

  let corps: { page?: string; valeurs?: unknown };
  try { corps = await req.json(); } catch { return NextResponse.json({ error: "Corps illisible" }, { status: 400 }); }

  const page = corps.page ?? null;
  if (!pageValide(page)) return NextResponse.json({ error: "Page invalide" }, { status: 400 });

  const v = corps.valeurs;
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    return NextResponse.json({ error: "Valeurs invalides" }, { status: 400 });
  }
  /* Un réglage est un booléen, un nombre ou une chaîne — jamais un objet ni un
     tableau. Sans ce filtre, la colonne Json accepterait n'importe quelle structure,
     et `fusionner()` la rejetterait silencieusement à la lecture : on croirait avoir
     enregistré. Mieux vaut le refuser ici, où l'on peut le dire. */
  const propre: Record<string, boolean | number | string> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    if (k.length > 60) continue;
    if (typeof x === "boolean" || typeof x === "number" || typeof x === "string") {
      if (typeof x === "number" && !Number.isFinite(x)) continue;
      if (typeof x === "string" && x.length > 2000) continue;
      propre[k] = x;
    } else {
      return NextResponse.json(
        { error: `Le réglage « ${k} » n'est ni un interrupteur, ni un nombre, ni un texte.` },
        { status: 400 },
      );
    }
  }

  // `parQui` garde le pseudo et non l'identifiant : c'est un nom qu'on lit sur la
  // page pour savoir à qui demander pourquoi une section a disparu.
  const parQui = a.user.username ?? a.user.id ?? null;
  const row = await prisma.pageReglages.upsert({
    where: { page },
    create: { page, data: propre, parQui },
    update: { data: propre, parQui },
  });

  return NextResponse.json({ page, valeurs: row.data, parQui: row.parQui, modifieLe: row.updatedAt });
}
