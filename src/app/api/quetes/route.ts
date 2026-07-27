import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";
import { QUETE_AVEC, serialiserQuete } from "@/lib/quetes";

/**
 * Quêtes : ce dont la guilde a besoin, et qui s'en charge.
 *
 * Réservé aux membres de guilde : une quête engage quelqu'un à farmer pour un
 * autre, ça n'a pas de sens hors de la guilde.
 */
async function membre() {
  const a = await apiAuth();
  if ("error" in a) return { error: a.error };
  if (!canAccessGuild(a.user.role)) return { error: NextResponse.json({ error: "Réservé aux membres de la guilde." }, { status: 403 }) };
  return { user: a.user };
}

export async function GET() {
  const m = await membre();
  if ("error" in m) return m.error;
  // Les quêtes closes restent visibles un temps : on veut voir que ça a bougé,
  // pas ouvrir une page vide dès que tout est livré.
  const quetes = await prisma.quete.findMany({
    where: { OR: [{ statut: "ouverte" }, { livreeAt: { gte: new Date(Date.now() - 14 * 864e5) } }] },
    include: QUETE_AVEC,
    orderBy: [{ statut: "asc" }, { createdAt: "desc" }],
    take: 120,
  });
  return NextResponse.json(quetes.map(serialiserQuete));
}

export async function POST(req: Request) {
  const m = await membre();
  if ("error" in m) return m.error;
  const b = await req.json().catch(() => ({}));

  // La raison vaut pour TOUTE la demande : on la lit une fois, elle s'applique
  // aux objets sélectionnés. La redemander par objet ferait remplir cinq fois
  // la même phrase.
  const noteCommune = String(b?.note ?? "").trim().slice(0, 300);

  // ── Sélection multiple ────────────────────────────────────────────────
  // On demande rarement une seule chose : un craft réclame trois ressources et
  // deux upgrades. Une quête par objet quand même — chacune se prend, se livre
  // et se confirme séparément.
  if (Array.isArray(b?.items) && b.items.length) {
    if (!noteCommune) return NextResponse.json({ error: "Explique à quoi ça va servir : c'est ce qui donne envie de s'en charger." }, { status: 400 });
    const creees = [];
    for (const it of b.items.slice(0, 20)) {
      const titre = String(it?.titre ?? "").trim().slice(0, 120);
      const quantite = Math.max(1, Math.min(9999, Math.floor(Number(it?.quantite) || 0)));
      if (!titre || !Number(it?.quantite)) continue; // 0 = pas demandé, on passe
      const q = await prisma.quete.create({
        data: {
          auteurId: m.user.id, titre, quantite, note: noteCommune,
          itemRef: it?.itemRef ? String(it.itemRef).slice(0, 160) : null,
          unite: it?.unite === "slot" ? "slot" : it?.unite === "unitaire" ? "unitaire" : null,
          manque: Number.isFinite(Number(it?.manque)) ? Math.max(0, Number(it.manque)) : null,
        },
        include: QUETE_AVEC,
      });
      creees.push(serialiserQuete(q));
    }
    if (!creees.length) return NextResponse.json({ error: "Aucune quantité indiquée : mets au moins 1 sur un objet." }, { status: 400 });
    await prevenirLaGuilde(m.user.id, m.user.username, `${creees.length} objet(s) — dont ${creees[0].titre}`);
    return NextResponse.json({ ok: true, quetes: creees }, { status: 201 });
  }

  const titre = String(b?.titre ?? "").trim().slice(0, 120);
  if (!titre) return NextResponse.json({ error: "Dis ce dont tu as besoin." }, { status: 400 });
  // La raison décide quelqu'un à s'en charger : sans elle, une quête n'est
  // qu'une ligne de plus dans une liste que personne ne prend.
  const note = noteCommune;
  if (!note) return NextResponse.json({ error: "Explique à quoi ça va servir : c'est ce qui donne envie de s'en charger." }, { status: 400 });

  const quete = await prisma.quete.create({
    data: {
      auteurId: m.user.id,
      titre,
      quantite: Math.max(1, Math.min(9999, Math.floor(Number(b?.quantite) || 1))),
      note,
      unite: b?.unite === "slot" ? "slot" : b?.unite === "unitaire" ? "unitaire" : null,
      itemRef: b?.itemRef ? String(b.itemRef).slice(0, 160) : null,
      manque: Number.isFinite(Number(b?.manque)) ? Math.max(0, Number(b.manque)) : null,
    },
    include: QUETE_AVEC,
  });

  await prevenirLaGuilde(m.user.id, m.user.username, `${quete.quantite} × ${titre}`);
  return NextResponse.json(serialiserQuete(quete), { status: 201 });
}

/**
 * Sans Discord, une quête que personne ne voit n'existe pas. On prévient donc
 * la guilde — sauf le demandeur, qui sait déjà.
 */
async function prevenirLaGuilde(auteurId: string, auteur: string, quoi: string) {
  const autres = await prisma.user.findMany({
    where: { id: { not: auteurId }, role: { in: ["DIRECTION", "VANGUARD", "GENERAL", "OFFICIER", "VETERAN", "GUARD"] } },
    select: { id: true },
  });
  await prisma.notification
    .createMany({
      data: autres.map((u) => ({
        userId: u.id, type: "QUETE", title: "Nouvelle quête",
        body: `${auteur} cherche ${quoi}.`, link: "/quetes",
      })),
    })
    .catch(() => null);
}
