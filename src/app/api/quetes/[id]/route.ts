import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";
import { BAREME, donnerXp } from "@/lib/xp";
import { QUETE_AVEC, serialiserQuete } from "@/lib/quetes";

/**
 * Actions sur une quête : { action: "prendre" | "abandonner" | "livrer" | "annuler" }.
 *
 * Règle qui commande tout le reste : c'est le DEMANDEUR qui clôt, en confirmant
 * la réception. Lui seul sait s'il a reçu, et c'est ce qui rend l'XP du livreur
 * incontestable — un livreur qui se déclare lui-même livré ne prouve rien.
 */
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const a = await apiAuth();
  if ("error" in a) return a.error;
  if (!canAccessGuild(a.user.role)) return NextResponse.json({ error: "Réservé aux membres de la guilde." }, { status: 403 });

  const q = await prisma.quete.findUnique({ where: { id } });
  if (!q) return NextResponse.json({ error: "Quête introuvable." }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const action = String(b?.action ?? "");
  const moi = a.user.id;

  if (action === "prendre") {
    if (q.statut !== "ouverte") return NextResponse.json({ error: "Quelqu'un s'en charge déjà." }, { status: 409 });
    if (q.auteurId === moi) return NextResponse.json({ error: "Tu ne peux pas te livrer à toi-même." }, { status: 400 });
    const maj = await prisma.quete.update({
      where: { id }, data: { statut: "prise", preneurId: moi, priseAt: new Date() }, include: QUETE_AVEC,
    });
    // Le demandeur est prévenu : savoir que quelqu'un s'en occupe évite de
    // relancer trois personnes pour le même objet.
    await prisma.notification
      .create({ data: { userId: q.auteurId, type: "QUETE", title: "Ta quête est prise en charge", body: `${a.user.username} s'occupe de « ${q.titre} ».`, link: "/quetes" } })
      .catch(() => null);
    return NextResponse.json(serialiserQuete(maj));
  }

  if (action === "abandonner") {
    if (q.preneurId !== moi) return NextResponse.json({ error: "Ce n'est pas toi qui t'en occupes." }, { status: 403 });
    const maj = await prisma.quete.update({
      where: { id }, data: { statut: "ouverte", preneurId: null, priseAt: null }, include: QUETE_AVEC,
    });
    // Repasser en « ouverte » plutôt que la fermer : le besoin, lui, existe
    // toujours. Le demandeur doit le savoir pour ne pas attendre pour rien.
    await prisma.notification
      .create({ data: { userId: q.auteurId, type: "QUETE", title: "Quête relâchée", body: `${a.user.username} ne peut plus s'occuper de « ${q.titre} ».`, link: "/quetes" } })
      .catch(() => null);
    return NextResponse.json(serialiserQuete(maj));
  }

  if (action === "livrer") {
    if (q.auteurId !== moi) return NextResponse.json({ error: "Seul le demandeur peut confirmer la réception." }, { status: 403 });
    if (q.statut === "livree") return NextResponse.json({ error: "Quête déjà close." }, { status: 409 });
    if (!q.preneurId) return NextResponse.json({ error: "Personne ne s'en est chargé." }, { status: 409 });
    const maj = await prisma.quete.update({
      where: { id }, data: { statut: "livree", livreeAt: new Date() }, include: QUETE_AVEC,
    });
    await donnerXp(q.preneurId, "quete", BAREME.quete, `Quête livrée : ${q.quantite} × ${q.titre}`, `quete:${q.id}`);
    await prisma.notification
      .create({ data: { userId: q.preneurId, type: "QUETE", title: "Livraison confirmée", body: `${a.user.username} a reçu « ${q.titre} » — +${BAREME.quete} XP.`, link: "/dashboard" } })
      .catch(() => null);
    return NextResponse.json(serialiserQuete(maj));
  }

  if (action === "annuler") {
    if (q.auteurId !== moi) return NextResponse.json({ error: "Seul le demandeur peut annuler sa quête." }, { status: 403 });
    const maj = await prisma.quete.update({ where: { id }, data: { statut: "annulee" }, include: QUETE_AVEC });
    return NextResponse.json(serialiserQuete(maj));
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
