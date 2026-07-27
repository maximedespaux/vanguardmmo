import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/access";
import { listerConversations, marquerLu } from "@/lib/messagerie";

/**
 * Boîte de réception : toutes mes conversations, dettes et requêtes confondues.
 *
 * GET  → la liste, la plus récente en tête.
 * POST → { filId } : je viens d'ouvrir ce fil, il est lu jusqu'ici.
 */
export async function GET() {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  return NextResponse.json({ conversations: await listerConversations(a.user) });
}

export async function POST(req: Request) {
  const a = await apiAuth();
  if ("error" in a) return a.error;
  const b = await req.json().catch(() => ({}));
  const filId = String(b?.filId ?? "");
  // Un marqueur n'écrit que pour SON auteur et ne révèle rien : on vérifie la
  // forme, pas les droits. Poser un repère sur un fil qu'on ne peut pas lire ne
  // donne accès à rien — l'accès reste tranché par les routes du fil.
  if (!/^(debt|req):[a-z0-9]+$/i.test(filId)) {
    return NextResponse.json({ error: "Fil invalide." }, { status: 400 });
  }
  await marquerLu(a.user.id, filId);
  return NextResponse.json({ ok: true });
}
