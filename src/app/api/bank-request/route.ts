import { NextResponse } from "next/server";
import { specDepuisJson } from "@/lib/specObjet";
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
import { annoncerVente } from "@/lib/ventes";

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

  // Le pseudo EN JEU est obligatoire : la remise se fait par courrier dans le
  // jeu, et un pseudo Discord n'y sert à rien. Sans lui, le détenteur doit
  // redemander — c'est exactement l'aller-retour qu'on cherche à supprimer.
  const perso = (b.characterName ?? "").toString().slice(0, 80).trim();
  if (!perso) return NextResponse.json({ error: "Indique ton pseudo en jeu : c'est là que l'objet sera envoyé par courrier." }, { status: 400 });

  // ── Panier boutique : plusieurs articles d'un coup (souhait achat ou dette) ──
  if (Array.isArray(b.items) && b.items.length) {
    // Un panier = une transaction → même batchId pour tous les articles (récap consolidé + 1 seul message Discord)
    const batchId = (globalThis.crypto && globalThis.crypto.randomUUID) ? globalThis.crypto.randomUUID() : `b${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    let count = 0;
    for (const it of b.items.slice(0, 40)) {
      const name = (it?.name ?? "").toString().slice(0, 200).trim();
      if (!name) continue;
      const quantite = Math.max(1, Math.floor(Number(it.quantity) || 1));
      const cree = await prisma.bankRequest.create({
        data: {
          userId: a.user.id, username: a.user.username, discordId: a.user.discordId,
          kind: "ITEM", item: name, quantity: quantite,
          cat: (it?.cat ?? "").toString().slice(0, 60).trim() || null,
          characterName: perso,
          priceEach: Math.max(0, Math.round(Number(it.price) || 0)),
          batchId,
          reason: "Boutique · demande d'objet",
        },
      });
      // Le fil s'ouvre AVEC la demande : il doit exister avant qu'on ait quelque
      // chose à s'y dire, sinon personne ne pense à l'ouvrir et la négociation
      // repart sur un autre outil.
      await ouvrirFilRequete(cree.id, a.user.username, name, cree.quantity, cree.priceEach);
      // Le salon des ventes prévient les détenteurs sur leur téléphone ; le
      // site reste l'endroit où l'on prend la commande.
      void annoncerVente(cree.id);
      count++;
    }
    await notifyHolders(b.items.map((it: any) => it?.name ?? ""), a.user.username, a.user.id);
    return NextResponse.json({ ok: true, count, batchId }, { status: 201 });
  }

  const kind = ["OBJET_IG", "ITEM", "PERINS"].includes(b.kind) ? b.kind : "OBJET_IG";
  const item = (b.item ?? "").toString().slice(0, 200).trim() || null;
  if (kind !== "PERINS" && !item) return NextResponse.json({ error: "Indique l'objet demandé." }, { status: 400 });

  const r = await prisma.bankRequest.create({
    data: {
      userId: a.user.id, username: a.user.username, discordId: a.user.discordId,
      kind, item, quantity: Math.max(1, Math.floor(Number(b.quantity) || 1)),
      reason: (b.reason ?? "").toString().slice(0, 500).trim() || null,
      characterName: perso,
      // L'objet exact venu du builder. Normalisé AVANT d'entrer en base : ce qui
      // arrive est du JSON écrit par un client, il ne doit jamais être stocké tel
      // quel pour être réaffiché à quelqu'un d'autre.
      spec: specDepuisJson(b.spec) ?? undefined,
    },
  });
  await ouvrirFilRequete(r.id, a.user.username, item, r.quantity, null);
  if (kind !== "PERINS" && item) {
    await notifyHolders([item], a.user.username, a.user.id);
    void annoncerVente(r.id);
  }
  return NextResponse.json(ser(r), { status: 201 });
}
