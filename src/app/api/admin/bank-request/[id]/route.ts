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

  // Prix AUTO depuis les paliers du dépôt (membre si l'acheteur est de la guilde, sinon public). Un prix saisi manuellement reste prioritaire.
  const buyer = await prisma.user.findUnique({ where: { id: row.userId }, select: { role: true } });
  const isMemberBuyer = !!(buyer && canAccessGuild(buyer.role));
  const auto = await autoTierPrice(row.item, isMemberBuyer);
  const manual = Math.max(0, Math.floor(Number(b.prixPublic) || 0));
  const prixPublic = BigInt(manual > 0 ? manual : Math.round(auto.price));
  if (prixPublic <= 0n) return NextResponse.json({ error: "Aucun prix : fixe un palier au dépôt de l'objet (ou saisis un prix)." }, { status: 400 });
  const caution = BigInt(Math.max(0, Math.floor(Number(b.caution) || auto.caution || 0)));

  if (b.action === "achat") {
    const prixFinal = prixPublic * BigInt(row.quantity); // total = prix unitaire × quantité (plus de remise)
    const r = await prisma.bankRequest.update({ where: { id }, data: { status: "ACCEPTE_ACHAT", prixPublic, prixFinal, decidedBy: a.user.username, adminNote } });
    await audit(a.user.username, "banque.ACHAT", id, `${label} — ${prixFinal}`);
    await coffreDebit(row.item, row.quantity, `Achat banque → ${row.username}`, a.user.username);
    return NextResponse.json(ser(r));
  }

  if (b.action === "dette") {
    const debt = await prisma.debt.create({
      data: {
        userId: row.userId,
        type: row.kind === "PERINS" ? "PENYA" : "ITEM",
        amount: prixPublic * BigInt(row.quantity),
        caution,
        item: row.item,
        reason: `Banque — ${label}`,
        status: "ACCEPTED",
        creditor: "Guilde",
        decidedBy: a.user.username,
      },
    });
    const r = await prisma.bankRequest.update({ where: { id }, data: { status: "ACCEPTE_DETTE", prixPublic, prixFinal: prixPublic * BigInt(row.quantity), debtId: debt.id, decidedBy: a.user.username, adminNote } });
    await audit(a.user.username, "banque.DETTE", id, `${label} — dette ${prixPublic}`);
    await coffreDebit(row.item, row.quantity, `Dette banque → ${row.username}`, a.user.username);
    return NextResponse.json(ser(r));
  }

  return NextResponse.json({ error: "action invalide" }, { status: 400 });
}
