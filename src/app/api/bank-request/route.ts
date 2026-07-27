import { NextResponse } from "next/server";
import { specDepuisJson } from "@/lib/specObjet";
import { bougerCredits, coutEnCredits, solde, verserDotation } from "@/lib/credits";
import { prisma } from "@/lib/prisma";

/**
 * Ouvre le fil d'une requête à sa création : un premier message système qui
 * rappelle ce qui est demandé, et invite à négocier. Le fil doit préexister à la
 * discussion — attendre qu'on ait « quelque chose à dire » revient à ne jamais
 * l'ouvrir, et la négociation repart alors sur un autre outil.
 */
async function ouvrirFilRequete(
  bankRequestId: string, demandeur: string, item: string | null, qty: number, prix?: number | null
) {
  const estime = prix ? ` — estimé à ${(prix * qty).toLocaleString("fr-FR")} périns` : "";
  await prisma.requestMessage
    .create({
      data: {
        bankRequestId,
        kind: "system",
        body: `${demandeur} demande ${qty} × ${item ?? "des périns"}${estime}. Le prix peut se négocier ici.`,
      },
    })
    .catch(() => null);
}
import { apiAuth } from "@/lib/access";

const ser = (r: any) => ({ ...r, prixPublic: r.prixPublic?.toString() ?? null, prixFinal: r.prixFinal?.toString() ?? null });

// Nom d'objet « propre » : retire la parenthèse finale (rareté / sexe) pour matcher les coffres.
const baseName = (n: string) => String(n || "").replace(/\s*\([^)]*\)\s*$/, "").toLowerCase().trim();

// #2 — notifie sur le SITE (cloche) les détenteurs des objets demandés (ceux qui les ont en coffre AirGuild).
async function notifyHolders(itemNames: string[], requester: string, requesterId: string) {
  try {
    const needles = [...new Set(itemNames.map(baseName).filter(Boolean))];
    if (!needles.length) return;
    const row = await prisma.airGuildState.findUnique({ where: { id: "main" } });
    const S = (row?.data ?? {}) as { inv?: Record<string, Record<string, number>>; members?: string[] };
    const inv = S.inv ?? {};
    const members = (Array.isArray(S.members) ? S.members : Object.keys(inv)).filter((m) => m && m !== "Commun");
    const holders = new Set<string>();
    for (const m of members) {
      const minv = inv[m] || {};
      for (const id of Object.keys(minv)) {
        if ((Number(minv[id]) || 0) <= 0) continue;
        const label = (String(id).split("|R#")[0].split("|").pop() || "").toLowerCase().trim();
        if (label && needles.some((nd) => nd.includes(label) || label.includes(nd))) { holders.add(m); break; }
      }
    }
    if (!holders.size) return;
    const users = await prisma.user.findMany({ where: { OR: [...holders].map((h) => ({ username: { equals: h, mode: "insensitive" as const } })) }, select: { id: true } });
    const recipients = users.filter((u) => u.id !== requesterId);
    if (!recipients.length) return;
    await prisma.notification.createMany({ data: recipients.map((u) => ({ userId: u.id, type: "bank_request", title: `${requester} souhaite un objet que tu détiens`, body: [...new Set(itemNames)].join(", ").slice(0, 300), link: "/gestion-dettes" })) });
  } catch { /* une notif ne doit jamais bloquer la requête */ }
}

// GET /api/bank-request — mes requêtes
export async function GET() {
  const a = await apiAuth(); if ("error" in a) return a.error;
  const reqs = await prisma.bankRequest.findMany({ where: { userId: a.user.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(reqs.map(ser));
}

// POST /api/bank-request — créer une requête (pré-requis : profil avec au moins un personnage)
export async function POST(req: Request) {
  const a = await apiAuth(); if ("error" in a) return a.error;
  const charCount = await prisma.character.count({ where: { userId: a.user.id } });
  if (charCount === 0) return NextResponse.json({ error: "Complète d'abord ton profil (au moins un personnage) pour faire une requête." }, { status: 400 });

  const b = await req.json();

  // ── Panier boutique : plusieurs articles d'un coup (souhait achat ou dette) ──
  if (Array.isArray(b.items) && b.items.length) {
    // Un panier = une transaction → même batchId pour tous les articles (récap consolidé + 1 seul message Discord)
    const batchId = (globalThis.crypto && globalThis.crypto.randomUUID) ? globalThis.crypto.randomUUID() : `b${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    // La semaine due est versée AVANT de compter : sinon un membre qui n'a pas
    // ouvert sa page de progression demanderait à découvert sans raison.
    await verserDotation(a.user);
    // Le solde AVANT la demande : c'est lui qu'on garde sur chaque ligne, parce
    // qu'un solde recalculé plus tard ne dira rien de ce qu'il était ce jour-là.
    let soldeCourant = await solde(a.user.id);
    let count = 0;
    for (const it of b.items.slice(0, 40)) {
      const name = (it?.name ?? "").toString().slice(0, 200).trim();
      if (!name) continue;
      // Le coût suit le PRIX : demander une cape à 60 000 périns n'est pas
      // demander une pierre à 500. 1 crédit ≈ 1 000 périns.
      const quantite = Math.max(1, Math.floor(Number(it.quantity) || 1));
      const cout = coutEnCredits((Math.max(0, Math.round(Number(it.price) || 0))) * quantite);
      const cree = await prisma.bankRequest.create({
        data: {
          userId: a.user.id, username: a.user.username, discordId: a.user.discordId,
          kind: "ITEM", item: name, quantity: quantite,
          cat: (it?.cat ?? "").toString().slice(0, 60).trim() || null,
          priceEach: Math.max(0, Math.round(Number(it.price) || 0)),
          batchId,
          reason: "Boutique · demande d'objet",
          cout,
          soldeAvant: soldeCourant,
        },
      });
      // Demander coûte : c'est ce qui fait que ça ne va pas dans un seul sens.
      // Jamais bloquant — un solde vide part « à découvert » et le staff tranche.
      await bougerCredits(a.user.id, -cout, `Demande : ${name}`, `req:${cree.id}`);
      soldeCourant -= cout;
      // Le fil s'ouvre AVEC la demande : il doit exister avant qu'on ait quelque
      // chose à s'y dire, sinon personne ne pense à l'ouvrir et la négociation
      // repart sur un autre outil.
      await ouvrirFilRequete(cree.id, a.user.username, name, cree.quantity, cree.priceEach);
      count++;
    }
    await notifyHolders(b.items.map((it: any) => it?.name ?? ""), a.user.username, a.user.id);
    return NextResponse.json({ ok: true, count, batchId }, { status: 201 });
  }

  const kind = ["OBJET_IG", "ITEM", "PERINS"].includes(b.kind) ? b.kind : "OBJET_IG";
  const item = (b.item ?? "").toString().slice(0, 200).trim() || null;
  if (kind !== "PERINS" && !item) return NextResponse.json({ error: "Indique l'objet demandé." }, { status: 400 });

  await verserDotation(a.user);
  const soldeAvant = await solde(a.user.id);
  // Une demande hors catalogue n'a pas de prix connu : elle coûte le minimum,
  // et le staff ajustera dans la conversation si l'objet vaut plus.
  const cout = coutEnCredits(Number(b.prixEstime) || 0);
  const r = await prisma.bankRequest.create({
    data: {
      userId: a.user.id, username: a.user.username, discordId: a.user.discordId,
      kind, item, quantity: Math.max(1, Math.floor(Number(b.quantity) || 1)),
      cout,
      soldeAvant,
      reason: (b.reason ?? "").toString().slice(0, 500).trim() || null,
      characterName: (b.characterName ?? "").toString().slice(0, 80).trim() || null,
      // L'objet exact venu du builder. Normalisé AVANT d'entrer en base : ce qui
      // arrive est du JSON écrit par un client, il ne doit jamais être stocké tel
      // quel pour être réaffiché à quelqu'un d'autre.
      spec: specDepuisJson(b.spec) ?? undefined,
    },
  });
  await bougerCredits(a.user.id, -cout, `Demande : ${item ?? "périns"}`, `req:${r.id}`);
  await ouvrirFilRequete(r.id, a.user.username, item, r.quantity, null);
  if (kind !== "PERINS" && item) await notifyHolders([item], a.user.username, a.user.id);
  return NextResponse.json(ser(r), { status: 201 });
}
