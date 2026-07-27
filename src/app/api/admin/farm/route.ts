import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";
import { etatCoffre } from "@/lib/coffre";

// Plan de farm calculé sur le VRAI stock du coffre AirGuild (airGuildState), et non plus
// sur la table CoffreItem (qui était déconnectée → « plan de farm vide »). #5
// Le calcul lui-même vit dans src/lib/coffre.ts : les quêtes s'en servent aussi.

// GET /api/admin/farm — liste « à farmer » (stock réel < seuil vert) + stats. Staff only.
export async function GET() {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  if (!canAccessAdmin(a.user.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { items: tous, membres } = await etatCoffre();
  // Une arme au seuil mais sans pre-myth reste a farmer : sans ce `||` elle
  // disparaissait du plan et la reserve pre-mythique n'etait jamais constituee.
  const items = tous.filter((x) => x.manque > 0 || x.manquePremyth > 0).sort((a, b) => b.manque - a.manque);

  return NextResponse.json({
    items,
    totalItems: tous.length,
    okCount: tous.length - items.length, // meme critere que le filtre ci-dessus
    members: membres,
  });
}
