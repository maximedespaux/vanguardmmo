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
import { apiGuild } from "@/lib/access";
import { STATUTS_OUVERTS, DELAI_APRES_ABANDON } from "@/lib/commandes";
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
    // Vers /messages : la conversation de la demande vit là. Le lien pointait
    // sur /gestion-dettes, page disparue avec le système de dettes — celui qui
    // détenait l'objet cliquait sa notification et tombait sur un 404.
    await prisma.notification.createMany({ data: recipients.map((u) => ({ userId: u.id, type: "bank_request", title: `${requester} souhaite un objet que tu détiens`, body: [...new Set(itemNames)].join(", ").slice(0, 300), link: "/messages" })) });
  } catch { /* une notif ne doit jamais bloquer la requête */ }
}

// GET /api/bank-request — mes requêtes
export async function GET() {
  const a = await apiGuild(); if ("error" in a) return a.error;
  const reqs = await prisma.bankRequest.findMany({ where: { userId: a.user.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(reqs.map(ser));
}

/** Une date « pour quand » : une vraie date, jamais dans le passé, jamais à
 *  plus d'un an — au-delà ce n'est plus une échéance, c'est du bruit. */
function dateVoulue(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  const min = Date.now() - 86_400_000, max = Date.now() + 366 * 86_400_000;
  return d.getTime() < min || d.getTime() > max ? null : d;
}

// POST /api/bank-request — créer une requête (pré-requis : profil avec au moins un personnage)

export async function POST(req: Request) {
  const a = await apiGuild(); if ("error" in a) return a.error;
  const charCount = await prisma.character.count({ where: { userId: a.user.id } });
  if (charCount === 0) return NextResponse.json({ error: "Complète d'abord ton profil (au moins un personnage) pour faire une requête." }, { status: 400 });

  /**
   * UNE SEULE COMMANDE À LA FOIS.
   *
   * Rien n'empêchait d'en ouvrir trente d'affilée. Chacune mobilise un
   * détenteur, une conversation, une notification et un message Discord — et
   * c'est le staff qui les reçoit toutes. Pire : deux commandes du même membre
   * pour le même objet font travailler deux personnes sur la même livraison.
   *
   * Une commande doit donc aller au bout : être remise, ou être abandonnée.
   * Ajouter un objet ne demande pas d'en ouvrir une seconde — le panier part
   * d'un seul envoi et compte pour UNE commande.
   *
   * Un délai remplaçait cette règle : cinq minutes entre deux envois. Il
   * n'empêchait rien, il ralentissait seulement. On le garde au seul endroit
   * où il sert vraiment — après un ABANDON, pour que « j'abandonne, je
   * recommence » ne devienne pas une façon de tourner en rond.
   */
  const ouverte = await prisma.bankRequest.findFirst({
    where: { userId: a.user.id, status: { in: STATUTS_OUVERTS as never[] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, item: true, status: true },
  });
  if (ouverte) {
    return NextResponse.json({
      error: `Tu as déjà une commande en cours${ouverte.item ? ` (${ouverte.item})` : ""}. Termine-la ou abandonne-la avant d'en ouvrir une autre — et si tu veux autre chose en plus, ajoute-le à celle-ci.`,
      commandeOuverte: ouverte.id,
    }, { status: 409 });
  }

  const abandonnee = await prisma.bankRequest.findFirst({
    where: { userId: a.user.id, status: "ANNULE" },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });
  if (abandonnee) {
    const reste = DELAI_APRES_ABANDON - (Date.now() - abandonnee.updatedAt.getTime());
    if (reste > 0) {
      const min = Math.ceil(reste / 60000);
      return NextResponse.json(
        { error: `Tu viens d'abandonner une commande. Attends encore ${min} minute${min > 1 ? "s" : ""} avant d'en ouvrir une nouvelle.`, reste },
        { status: 429 },
      );
    }
  }

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
    /* L'estimation porte sur le PANIER entier ; les demandes, elles, sont une
       par article. On la répartit au prorata du tarif de chaque ligne, pour que
       la somme des priceEach retombe sur ce que l'acheteur a annoncé. */
    const totalTarif = b.items.reduce((t: number, it: any) => t + Math.max(0, Math.round(Number(it?.price) || 0)) * Math.max(1, Math.floor(Number(it?.quantity) || 1)), 0);
    const estimTotale = Math.max(0, Math.round(Number(b?.prixEstime) || 0));
    let count = 0;
    for (const it of b.items.slice(0, 40)) {
      const name = (it?.name ?? "").toString().slice(0, 200).trim();
      if (!name) continue;
      const quantite = Math.max(1, Math.floor(Number(it.quantity) || 1));
      const tarifLigne = Math.max(0, Math.round(Number(it.price) || 0)) * quantite;
      const estimUnitaire = estimTotale > 0 && totalTarif > 0
        ? Math.round((estimTotale * tarifLigne) / totalTarif / quantite) || null
        : null;
      const cree = await prisma.bankRequest.create({
        data: {
          userId: a.user.id, username: a.user.username, discordId: a.user.discordId,
          kind: "ITEM", item: name, quantity: quantite,
          // Panier de la boutique : l'objet est au coffre, c'est un achat.
          origine: "achat",
          cat: (it?.cat ?? "").toString().slice(0, 60).trim() || null,
          characterName: perso,
          /* L'estimation de l'acheteur PRIME sur le tarif de la guilde quand
             elle existe : c'est ce qu'il est prêt à mettre, et c'est elle qui
             devient la cagnotte si la commande part en quête. Le tarif reste le
             repli — un panier d'avant ce champ n'a rien d'autre. */
          priceEach: estimUnitaire ?? Math.max(0, Math.round(Number(it.price) || 0)),
          batchId,
          modePaiement: ["perins", "airpoints", "mixte"].includes(b?.paiement) ? b.paiement : "perins",
          reason: [(String(b?.precision ?? "").slice(0, 300).trim()), "Boutique · demande d'objet"].filter(Boolean).join(" — "),
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

  // Comment l'acheteur souhaite payer. Ce n'est pas un montant : il ne connaît
  // pas encore le prix, c'est le vendeur qui l'annonce. Mais le détenteur doit
  // le savoir avant de composer son tarif.
  const paiement = ["perins", "airpoints", "mixte"].includes(b?.paiement) ? b.paiement : "perins";

  /* ── Plusieurs pièces sur mesure, en UNE commande ────────────────────────
     L'écran les envoyait une par une, en boucle. Depuis qu'on ne peut avoir
     qu'une commande ouverte, la première passait et toutes les suivantes se
     faisaient refuser : on commandait trois pièces, une seule arrivait. Elles
     partent donc ensemble, sous un même batchId — chacune garde sa fiche, sa
     spec et son estimation, et se négocie séparément dans le fil. */
  if (Array.isArray(b?.pieces) && b.pieces.length) {
    const batchId = (globalThis.crypto && globalThis.crypto.randomUUID) ? globalThis.crypto.randomUUID() : `p${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    const noms: string[] = [];
    let count = 0;
    for (const pc of b.pieces.slice(0, 20)) {
      const nom = (pc?.item ?? "").toString().slice(0, 200).trim();
      if (!nom) continue;
      const ap = Math.max(0, Math.round(Number(pc?.prixEstimeAp) || 0));
      const cree = await prisma.bankRequest.create({
        data: {
          userId: a.user.id, username: a.user.username, discordId: a.user.discordId,
          kind: "ITEM", item: nom, quantity: Math.max(1, Math.floor(Number(pc?.quantity) || 1)),
          origine: "requete", batchId,
          reason: [(pc?.reason ?? "").toString().slice(0, 460).trim(), ap > 0 ? `— ${ap.toLocaleString("fr-FR")} AP proposés` : ""]
            .filter(Boolean).join(" ").trim() || null,
          characterName: perso,
          spec: specDepuisJson(pc?.spec) ?? undefined,
          modePaiement: paiement,
          priceEach: Math.max(0, Math.round(Number(pc?.prixEstime) || 0)) || null,
          dateSouhaitee: dateVoulue(pc?.dateSouhaitee),
        },
      });
      await ouvrirFilRequete(cree.id, a.user.username, nom, cree.quantity, cree.priceEach);
      void annoncerVente(cree.id);
      noms.push(nom); count++;
    }
    if (!count) return NextResponse.json({ error: "Aucune pièce valide dans la commande." }, { status: 400 });
    await notifyHolders(noms, a.user.username, a.user.id);
    return NextResponse.json({ ok: true, count, batchId }, { status: 201 });
  }

  const kind = ["OBJET_IG", "ITEM", "PERINS"].includes(b.kind) ? b.kind : "OBJET_IG";
  const enPerins = Math.max(0, Math.round(Number(b?.prixEstime) || 0));
  const enAp = Math.max(0, Math.round(Number(b?.prixEstimeAp) || 0));
  const item = (b.item ?? "").toString().slice(0, 200).trim() || null;
  if (kind !== "PERINS" && !item) return NextResponse.json({ error: "Indique l'objet demandé." }, { status: 400 });

  const r = await prisma.bankRequest.create({
    data: {
      userId: a.user.id, username: a.user.username, discordId: a.user.discordId,
      kind, item, quantity: Math.max(1, Math.floor(Number(b.quantity) || 1)),
      // Objet sur mesure ou demande libre : il faut d'abord lui trouver un
      // détenteur, ou le farmer. Ce n'est pas un achat au comptoir.
      origine: "requete",
      reason: [(b.reason ?? "").toString().slice(0, 460).trim(), enAp > 0 ? `— ${enAp.toLocaleString("fr-FR")} AP proposés` : ""]
        .filter(Boolean).join(" ").trim() || null,
      characterName: perso,
      // L'objet exact venu du builder. Normalisé AVANT d'entrer en base : ce qui
      // arrive est du JSON écrit par un client, il ne doit jamais être stocké tel
      // quel pour être réaffiché à quelqu'un d'autre.
      spec: specDepuisJson(b.spec) ?? undefined,
      modePaiement: paiement,
      /* L'estimation de l'acheteur. Elle n'etait PAS enregistree : le champ
         arrivait dans la requete et se perdait la. C'est pourtant elle qui dit
         au detenteur ce qu'on est pret a mettre, et elle qui devient la cagnotte
         quand la commande part en quete de guilde — sans elle, la cagnotte reste
         vide et il n'y a rien a partager.
         La part en Airpoints n'a pas de colonne sur la demande : on la porte
         dans la raison, la ou le detenteur la lit, plutot que d'inventer un
         schema pour une valeur que le tarif final remplacera. */
      priceEach: enPerins > 0 ? enPerins : null,
      dateSouhaitee: dateVoulue(b?.dateSouhaitee),
    },
  });
  await ouvrirFilRequete(r.id, a.user.username, item, r.quantity, null);
  if (kind !== "PERINS" && item) {
    await notifyHolders([item], a.user.username, a.user.id);
    void annoncerVente(r.id);
  }
  return NextResponse.json(ser(r), { status: 201 });
}
