import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin, canAccessGuild } from "@/config/roles";
import { CLE_STRATEGIE, MAX_PAGE, normaliserStrategie } from "@/lib/strategie";

/**
 * La page Stratégie des Chambres Secrètes.
 *
 * Lecture ouverte à la guilde, écriture réservée au staff : c'est une consigne,
 * pas un mur collaboratif. Elle vit sur sa propre ligne (même table que la
 * composition, autre clé) pour ne pas voyager à chaque annonce de présence.
 */
export async function GET() {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  if (!canAccessGuild(a.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const row = await prisma.compositionState.findUnique({ where: { id: CLE_STRATEGIE } });
  return NextResponse.json(normaliserStrategie(row?.data));
}

export async function PUT(req: NextRequest) {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  if (!canAccessAdmin(a.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const brut = await req.text();
  // Des captures d'écran, ça pèse : on refuse AVANT de parser, sinon la page
  // deviendrait impossible à charger pour ceux qui viennent la lire.
  if (brut.length > MAX_PAGE) {
    return NextResponse.json({ error: "Page trop lourde — allège ou retire une image." }, { status: 413 });
  }
  let recu: unknown = null;
  try { recu = JSON.parse(brut); } catch { return NextResponse.json({ error: "Contenu illisible." }, { status: 400 }); }

  const page = normaliserStrategie(recu);
  await prisma.compositionState.upsert({
    where: { id: CLE_STRATEGIE },
    create: { id: CLE_STRATEGIE, data: page as object },
    update: { data: page as object },
  });
  return NextResponse.json(page);
}
