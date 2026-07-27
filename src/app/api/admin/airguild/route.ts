import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessAdmin } from "@/config/roles";
import { donnerXp, pointsDepot } from "@/lib/xp";
import { BAREME_CREDITS, bougerCredits } from "@/lib/credits";

// État complet de l'AirGuild (app d'iBeats) — un seul blob JSON partagé (modèle AirGuildState).

// Migration coffre v2 (une seule fois, marquée par _csetup=2) : suppression du « Commun ».
// Le stock du Commun est fusionné dans le coffre principal de la guilde = le coffre membre d'iBeats.
// Idempotent même en accès concurrent : chaque GET part de l'état d'origine et produit le même merge
// (le dernier write gagne avec le même résultat, jamais de double-comptage). Aucune perte : le Total guilde
// (somme de tous les coffres) reste identique, on ne fait que déplacer/consolider entre coffres.
function migrateCoffreState(S: any): boolean {
  if (!S || typeof S !== "object" || S._csetup === 2) return false;
  const isObj = (v: unknown) => !!v && typeof v === "object" && !Array.isArray(v);
  S.inv = isObj(S.inv) ? S.inv : {};
  S.members = Array.isArray(S.members) ? S.members : [];
  const norm = (s: string) => (s || "").trim().toLowerCase().replace(/^\.+/, "");
  const hasDot = (s: string) => /^\.+/.test((s || "").trim());
  const findKey = (want: string) =>
    Object.keys(S.inv).find((k) => norm(k) === want) ||
    S.members.find((m: string) => norm(m) === want);
  const main = findKey("ibeats") || "ibeats";
  const mainN = norm(main);
  if (!isObj(S.inv[main])) S.inv[main] = {};
  const mergeInto = (src: unknown) => {
    if (!isObj(src)) return;
    const s = src as Record<string, unknown>;
    for (const id of Object.keys(s)) {
      S.inv[main][id] = (Number(S.inv[main][id]) || 0) + (Number(s[id]) || 0);
    }
  };
  // Coffre principal = ex-« Commun » + TOUTE variante du coffre principal (casse/point/espace, ex. « iBeats » vs « ibeats »)
  // → consolidés dans une seule clé `main`. Aucune perte : on ne fait que déplacer, le Total guilde reste identique.
  for (const k of Object.keys(S.inv)) {
    if (k !== main && (norm(k) === "commun" || norm(k) === mainN)) { mergeInto(S.inv[k]); delete S.inv[k]; }
  }
  // Nettoyage du compte parasite « .dexoz » — variante à POINT uniquement (jamais un vrai joueur nommé « Dexoz »).
  for (const k of Object.keys(S.inv)) {
    if (k !== main && hasDot(k) && norm(k) === "dexoz") { mergeInto(S.inv[k]); delete S.inv[k]; }
  }
  S.members = S.members.filter((m: string) => {
    if (m === main) return true;
    if (norm(m) === "commun" || norm(m) === mainN) return false;
    if (hasDot(m) && norm(m) === "dexoz") return false;
    return true;
  });
  if (!S.members.includes(main)) S.members.push(main);
  if (!S.members.includes(S.cur) && S.cur !== "__total__") S.cur = "__total__";
  S.mainCoffre = main;
  S._csetup = 2;
  return true;
}

async function guard() {
  const a = await apiAuth();
  if ("error" in a) return { error: a.error as NextResponse };
  if (!canAccessAdmin(a.user.role)) return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  return { ok: true as const };
}

export async function GET() {
  const g = await guard(); if ("error" in g) return g.error;
  const row = await prisma.airGuildState.findUnique({ where: { id: "main" } });
  const data = (row?.data ?? null) as Record<string, unknown> | null;
  if (data && migrateCoffreState(data)) {
    await prisma.airGuildState.upsert({ where: { id: "main" }, create: { id: "main", data: data as object }, update: { data: data as object } });
  }
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const g = await guard(); if ("error" in g) return g.error;
  const data = await req.json().catch(() => null);
  if (data == null || typeof data !== "object") return NextResponse.json({ error: "data invalide" }, { status: 400 });

  // L'état d'AVANT, lu avant de l'écraser : c'est la seule façon de savoir ce
  // qui vient d'entrer au coffre. Le stock réel vit ici, par membre — pas dans
  // la table CoffreItem, restée déconnectée.
  const precedent = await prisma.airGuildState.findUnique({ where: { id: "main" } }).catch(() => null);

  await prisma.airGuildState.upsert({
    where: { id: "main" },
    create: { id: "main", data: data as object },
    update: { data: data as object },
  });

  // XP de dépôt, hors du chemin critique : la sauvegarde du coffre est déjà
  // faite, une récompense qui échoue ne doit rien annuler.
  void crediterDepots(precedent?.data, data).catch(() => {});
  return NextResponse.json({ ok: true });
}

// ── XP de dépôt ────────────────────────────────────────────────────────────
const inventaire = (etat: unknown): Record<string, Record<string, number>> => {
  const inv = (etat as { inv?: unknown } | null)?.inv;
  return inv && typeof inv === "object" && !Array.isArray(inv) ? (inv as Record<string, Record<string, number>>) : {};
};
const qte = (inv: Record<string, Record<string, number>>, membre: string, id: string) => Number(inv[membre]?.[id]) || 0;

/** Seuil « vert » d'un objet, tel que réglé dans l'AirGuild. Défaut aligné sur
 *  le cas courant du plan de farm — approximatif à dessein : il pondère un
 *  score de jeu, il ne tient pas une comptabilité. */
const seuilDe = (etat: unknown, id: string): number => {
  const t = (etat as { thresh?: Record<string, { ok?: number }> } | null)?.thresh?.[id]?.ok;
  return Number.isFinite(Number(t)) && Number(t) > 0 ? Number(t) : 10;
};

/**
 * Récompense ce qui est ENTRÉ au coffre depuis la dernière sauvegarde.
 *
 * Deux garde-fous, sans quoi le compteur ne voudrait rien dire :
 *  - on ne paie qu'à hauteur de l'entrée NETTE sur l'objet (tous coffres
 *    confondus). Déplacer un objet du coffre d'un membre vers un autre ne crée
 *    pas de richesse, donc pas d'XP ;
 *  - ce qui manquait au seuil vaut trois fois plus que le surplus : le plan de
 *    farm dit ce dont la guilde a besoin, l'XP doit dire la même chose.
 */
async function crediterDepots(avant: unknown, apres: unknown): Promise<void> {
  const invA = inventaire(avant);
  const invB = inventaire(apres);
  if (!Object.keys(invA).length) return; // premier enregistrement : aucun passé, donc aucun dépôt constatable

  const membres = Array.from(new Set([...Object.keys(invA), ...Object.keys(invB)]));
  const objets = new Set<string>();
  for (const m of membres) for (const id of Object.keys(invB[m] ?? {})) objets.add(id);

  const gains: { membre: string; id: string; gain: number; manque: number }[] = [];
  for (const id of objets) {
    const totalA = membres.reduce((s, m) => s + qte(invA, m, id), 0);
    const totalB = membres.reduce((s, m) => s + qte(invB, m, id), 0);
    let net = totalB - totalA;
    if (net <= 0) continue;
    const manque = Math.max(0, seuilDe(apres, id) - totalA);
    for (const m of membres) {
      if (net <= 0) break;
      const g = qte(invB, m, id) - qte(invA, m, id);
      if (g <= 0) continue;
      const paye = Math.min(g, net);
      net -= paye;
      gains.push({ membre: m, id, gain: paye, manque });
    }
  }
  if (!gains.length) return;

  // Les coffres sont nommés par pseudo : on les rattache aux comptes comme
  // partout ailleurs (dettes, présences). Un coffre sans compte ne rapporte
  // rien à personne — et ce n'est pas grave, c'est le coffre de la guilde.
  const comptes = await prisma.user.findMany({
    where: { username: { in: Array.from(new Set(gains.map((x) => x.membre))) } },
    select: { id: true, username: true },
  });
  const jour = new Date().toISOString().slice(0, 10);
  for (const { membre, id, gain, manque } of gains) {
    const compte = comptes.find((c) => c.username.toLowerCase() === membre.toLowerCase());
    if (!compte) continue;
    const points = pointsDepot(gain, manque);
    // Les crédits suivent l'XP : un dépôt qui comble un manque en rapporte
    // davantage, exactement pour la même raison.
    await bougerCredits(
      compte.id,
      Math.floor(points / BAREME_CREDITS.parPointsDepot),
      `${gain} × objet #${id} déposé au coffre`,
      `depot:${jour}:${membre}:${id}:${qte(invB, membre, id)}`
    );
    await donnerXp(
      compte.id,
      "depot",
      points,
      `${gain} × objet #${id} déposé au coffre`,
      // Une même montée, rejouée le même jour, ne paie qu'une fois : l'app
      // sauvegarde en continu, un renvoi du même état ne doit rien créer.
      `depot:${jour}:${membre}:${id}:${qte(invB, membre, id)}`
    );
  }
}
