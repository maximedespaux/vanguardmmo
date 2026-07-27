import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";
import { BAREME, donnerXp } from "@/lib/xp";
import { QUETE_AVEC, serialiserQuete } from "@/lib/quetes";

/**
 * Actions sur une quête, à PLUSIEURS.
 *
 * 400 médailles ne se farment pas seul : réserver la quête au premier
 * volontaire décourageait les quatre suivants. Chacun annonce donc ce qu'il
 * apporte, et la barre de progression montre ce qui reste — c'est elle qui
 * évite qu'on farme à quatre la même chose.
 *
 * La règle qui n'a pas bougé : c'est le DEMANDEUR qui confirme la réception,
 * apport par apport. Lui seul sait ce qu'il a reçu, et c'est ce qui rend la
 * récompense du contributeur incontestable. La récompense tombe à la
 * confirmation, jamais à l'annonce — sinon on paierait l'intention.
 *
 * { action: "contribuer" | "retirer" | "confirmer" | "annuler", … }
 */
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const a = await apiAuth();
  if ("error" in a) return a.error;
  if (!canAccessGuild(a.user.role)) return NextResponse.json({ error: "Réservé aux membres de la guilde." }, { status: 403 });

  const q = await prisma.quete.findUnique({ where: { id }, include: QUETE_AVEC });
  if (!q) return NextResponse.json({ error: "Quête introuvable." }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const action = String(b?.action ?? "");
  const moi = a.user.id;
  const vue = serialiserQuete(q);
  const renvoyer = async () =>
    NextResponse.json(serialiserQuete(await prisma.quete.findUniqueOrThrow({ where: { id }, include: QUETE_AVEC })));

  // ── J'apporte ma part ───────────────────────────────────────────────────
  if (action === "contribuer") {
    if (q.statut !== "ouverte") return NextResponse.json({ error: "Cette quête est close." }, { status: 409 });
    if (q.auteurId === moi) return NextResponse.json({ error: "Tu ne peux pas te livrer à toi-même." }, { status: 400 });
    const voulu = Math.max(1, Math.floor(Number(b?.quantite) || 0));
    if (!voulu) return NextResponse.json({ error: "Indique ce que tu apportes." }, { status: 400 });
    // On ne promet pas plus que ce qui manque : au-delà, c'est du farm perdu
    // pour celui qui s'y met, et un compteur faux pour tous les autres.
    const quantite = Math.min(voulu, vue.reste);
    if (quantite <= 0) return NextResponse.json({ error: "Tout est déjà couvert — rien à apporter." }, { status: 409 });

    await prisma.queteContribution.create({ data: { queteId: id, userId: moi, quantite } });
    await prisma.notification
      .create({
        data: {
          userId: q.auteurId, type: "QUETE", title: "Quelqu'un t'aide",
          body: `${a.user.username} apporte ${quantite} × ${q.titre}.`, link: "/quetes",
        },
      })
      .catch(() => null);
    return renvoyer();
  }

  // ── Je retire mon annonce ───────────────────────────────────────────────
  if (action === "retirer") {
    const c = q.contributions.find((x) => x.id === String(b?.contributionId));
    if (!c) return NextResponse.json({ error: "Apport introuvable." }, { status: 404 });
    if (c.userId !== moi) return NextResponse.json({ error: "Ce n'est pas ton apport." }, { status: 403 });
    if (c.statut === "confirme") return NextResponse.json({ error: "Déjà reçu : ça ne se retire plus." }, { status: 409 });
    await prisma.queteContribution.delete({ where: { id: c.id } });
    return renvoyer();
  }

  // ── Le demandeur confirme avoir reçu un apport ──────────────────────────
  if (action === "confirmer") {
    if (q.auteurId !== moi) return NextResponse.json({ error: "Seul le demandeur peut confirmer la réception." }, { status: 403 });
    const c = q.contributions.find((x) => x.id === String(b?.contributionId));
    if (!c) return NextResponse.json({ error: "Apport introuvable." }, { status: 404 });
    if (c.statut === "confirme") return NextResponse.json({ error: "Apport déjà confirmé." }, { status: 409 });

    await prisma.queteContribution.update({ where: { id: c.id }, data: { statut: "confirme", confirmeAt: new Date() } });

    // Récompense AU PRORATA : celui qui apporte la moitié touche la moitié.
    // Un forfait identique pour 1 et pour 399 récompenserait le passager.
    // Plancher à 1 point : un petit apport reste un apport, pas rien.
    const part = Math.min(1, c.quantite / Math.max(1, q.quantite));
    const xp = Math.max(1, Math.round(BAREME.quete * part));
    await donnerXp(c.userId, "quete", xp, `Quête : ${c.quantite} × ${q.titre} livré`, `quete:${c.id}`);

    // La quête se ferme quand le compte y est. Personne n'a à penser à la clore.
    const total = vue.confirme + c.quantite;
    if (total >= q.quantite) {
      await prisma.quete.update({ where: { id }, data: { statut: "livree", livreeAt: new Date() } });
    }

    await prisma.notification
      .create({
        data: {
          userId: c.userId, type: "QUETE", title: "Livraison confirmée",
          body: `${a.user.username} a reçu tes ${c.quantite} × ${q.titre} — +${xp} XP.`,
          link: "/quetes",
        },
      })
      .catch(() => null);
    return renvoyer();
  }

  // ── J'annule ma demande ─────────────────────────────────────────────────
  if (action === "annuler") {
    if (q.auteurId !== moi) return NextResponse.json({ error: "Seul le demandeur peut annuler sa quête." }, { status: 403 });
    // Les apports déjà confirmés restent payés : le travail a été fait.
    await prisma.quete.update({ where: { id }, data: { statut: "annulee" } });
    return renvoyer();
  }

  return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
}
