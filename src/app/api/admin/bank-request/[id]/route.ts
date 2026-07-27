import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES, canAccessGuild } from "@/config/roles";
import { audit } from "@/lib/audit";

const ser = (r: any) => ({ ...r, prixPublic: r.prixPublic?.toString() ?? null, prixFinal: r.prixFinal?.toString() ?? null });

// Prix membre/public d'un objet, lu depuis les paliers du dépôt (airGuildState.prices).
async function autoTierPrice(itemName: string | null, member: boolean): Promise<{ price: number; caution: number }> {
  const row = await prisma.airGuildState.findUnique({ where: { id: "main" } }).catch(() => null);
  const prices = (((row?.data ?? {}) as { prices?: Record<string, any> }).prices) ?? {};
  const base = String(itemName || "").replace(/\s*\([^)]*\)\s*$/, "").toLowerCase().trim();
  for (const id of Object.keys(prices)) {
    const label = (id.split("|R#")[0].split("|").pop() || "").toLowerCase().trim();
    if (label && (label === base || label.includes(base) || base.includes(label))) {
      const p = prices[id];
      if (p && typeof p === "object") return { price: (member ? +p.mem : +p.pub) || 0, caution: +p.cau || 0 };
      if (p != null) return { price: +p || 0, caution: 0 };
    }
  }
  return { price: 0, caution: 0 };
}

// #6 — détenteur principal d'un objet (celui qui en a le plus en coffre) → créancier de la dette.
async function resolveHolder(itemName: string | null): Promise<string | null> {
  const row = await prisma.airGuildState.findUnique({ where: { id: "main" } }).catch(() => null);
  const S = (row?.data ?? {}) as { inv?: Record<string, Record<string, number>>; members?: string[] };
  const inv = S.inv ?? {};
  const base = String(itemName || "").replace(/\s*\([^)]*\)\s*$/, "").toLowerCase().trim();
  if (!base) return null;
  const members = (Array.isArray(S.members) ? S.members : Object.keys(inv)).filter((m) => m && m !== "Commun");
  let best: { name: string; qty: number } | null = null;
  for (const m of members) {
    const minv = inv[m] || {};
    let q = 0;
    for (const id of Object.keys(minv)) {
      const label = (id.split("|R#")[0].split("|").pop() || "").toLowerCase().trim();
      if (label && (label === base || label.includes(base) || base.includes(label))) q += Number(minv[id]) || 0;
    }
    if (q > 0 && (!best || q > best.qty)) best = { name: m, qty: q };
  }
  return best?.name ?? null;
}

// Sortie d'un objet du coffre suite à une décision banque (achat/dette) :
// ajuste le stock de l'objet suivi (s'il l'est) + journalise un débit (qui/combien/quand).
async function coffreDebit(itemName: string | null, qty: number, reason: string, byUser: string) {
  if (!itemName || qty <= 0) return;
  try {
    const match = await prisma.coffreItem.findFirst({ where: { item: itemName } });
    if (match?.itemId != null) await prisma.coffreItem.update({ where: { itemId: match.itemId }, data: { stockTotal: Math.max(0, match.stockTotal - qty) } });
    await prisma.coffreMouvement.create({ data: { itemId: match?.itemId ?? null, item: itemName, delta: -qty, type: "debit", reason, byUser } });
  } catch { /* le journal ne doit jamais bloquer la décision */ }
}

// PATCH /api/admin/bank-request/[id] — décision admin
//  body : { action: "refuse" | "achat" | "dette", prixPublic?, adminNote? }
//  achat = prix public ; dette = prix public complet (crée une Debt).
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error;
  const row = await prisma.bankRequest.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  if (row.status !== "PENDING") return NextResponse.json({ error: "Requête déjà traitée." }, { status: 409 });

  const b = await req.json();
  const adminNote = (b.adminNote ?? "").toString().slice(0, 300).trim() || null;
  const label = `${row.item ?? row.kind} ×${row.quantity}`;

  if (b.action === "refuse") {
    const r = await prisma.bankRequest.update({ where: { id }, data: { status: "REFUSE", decidedBy: a.user.username, adminNote } });
    await audit(a.user.username, "banque.REFUSE", id, label);
    return NextResponse.json(ser(r));
  }

  // Un accord conclu dans le fil s'impose à la décision : une offre acceptée ne
  // se renégocie pas, c'est ce qui donne sa valeur au « oui ». Recalculer aux
  // paliers reviendrait à effacer l'accord sans le dire à personne.
  const accord = await prisma.requestMessage.findFirst({
    where: { bankRequestId: id, kind: "offer", acceptedAt: { not: null } },
    orderBy: { acceptedAt: "desc" },
    select: { amount: true, mode: true },
  });
  const troc = row.modePaiement === "troc" || accord?.mode === "troc";
  const quantite = BigInt(Math.max(1, row.quantity));

  // Réglée en objets : il n'y a aucune somme à réclamer, donc rien à mettre en
  // dette. La refuser franchement vaut mieux qu'inventer un montant en périns.
  if (troc && b.action === "dette") {
    return NextResponse.json(
      { error: "Cette demande est réglée en objets : il n'y a pas de somme à mettre en dette." },
      { status: 409 }
    );
  }

  // Prix AUTO depuis les paliers du dépôt (membre si l'acheteur est de la guilde, sinon public). Un prix saisi manuellement reste prioritaire.
  const buyer = await prisma.user.findUnique({ where: { id: row.userId }, select: { role: true } });
  const isMemberBuyer = !!(buyer && canAccessGuild(buyer.role));
  const auto = await autoTierPrice(row.item, isMemberBuyer);
  const manual = Math.max(0, Math.floor(Number(b.prixPublic) || 0));
  // Le montant négocié est un TOTAL (c'est ce qu'on lit dans le fil) ; le prix
  // unitaire n'en est que la trace.
  const negocie = !troc && accord?.amount ? BigInt(accord.amount) : null;
  const prixPublic = negocie ? negocie / quantite : BigInt(manual > 0 ? manual : Math.round(auto.price));
  if (!troc && prixPublic <= 0n) return NextResponse.json({ error: "Aucun prix : fixe un palier au dépôt de l'objet (ou saisis un prix)." }, { status: 400 });
  const prixFinal = negocie ?? prixPublic * quantite;
  const caution = BigInt(Math.max(0, Math.floor(Number(b.caution) || auto.caution || 0)));

  if (b.action === "achat") {
    const r = await prisma.bankRequest.update({
      where: { id },
      data: troc
        ? { status: "ACCEPTE_ACHAT", modePaiement: "troc", prixPublic: null, prixFinal: null, decidedBy: a.user.username, adminNote }
        : { status: "ACCEPTE_ACHAT", prixPublic, prixFinal, decidedBy: a.user.username, adminNote },
    });
    await audit(a.user.username, "banque.ACHAT", id, `${label} — ${troc ? "troc" : prixFinal}`);
    await coffreDebit(row.item, row.quantity, `Achat banque → ${row.username}`, a.user.username);
    return NextResponse.json(ser(r));
  }

  if (b.action === "dette") {
    const holder = await resolveHolder(row.item); // #6 — créancier = le détenteur qui fournit l'objet
    const debt = await prisma.debt.create({
      data: {
        userId: row.userId,
        type: row.kind === "PERINS" ? "PENYA" : "ITEM",
        amount: prixFinal,
        caution,
        item: row.item,
        reason: `Boutique — ${label}${holder ? ` (dû à ${holder})` : ""}`,
        status: "ACCEPTED",
        creditor: holder ?? "Guilde",
        decidedBy: a.user.username,
      },
    });
    const r = await prisma.bankRequest.update({ where: { id }, data: { status: "ACCEPTE_DETTE", prixPublic, prixFinal, debtId: debt.id, decidedBy: a.user.username, adminNote } });
    await audit(a.user.username, "banque.DETTE", id, `${label} — dette ${prixFinal}`);
    await coffreDebit(row.item, row.quantity, `Dette banque → ${row.username}`, a.user.username);
    return NextResponse.json(ser(r));
  }

  return NextResponse.json({ error: "action invalide" }, { status: 400 });
}
