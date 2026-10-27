import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES } from "@/config/roles";
import { audit } from "@/lib/audit";
import { normaliserCompo } from "@/lib/compositions";
import { monstreParId } from "@/components/monstres/catalogue";
import { normaliserParametres, prochaineSeanceParis, prochaineSeanceGS, validerParametres, type Evenement, type ParametresGS } from "@/lib/evenements";
import { enregistrerParametres, lireParametres } from "@/lib/seances-serveur";
import { espaceLibre, occupationVideos } from "@/lib/videos-serveur";

/**
 * LE PARAMÉTRAGE DES ÉVÉNEMENTS — l'écran /discord/evenements des bras droits (spec §6, routes
 * 1 et 2 ; §9). Salons, rappels, étapes et phases, monstres par étape, postes, consignes du
 * récap, textes des messages, affichage des dégâts : tout ce que le site et le bot lisent pour
 * les Chambres et le Guild Siege.
 *
 * LIRE ET ÉCRIRE : les quatre rangs bras droits (`apiRole(ADMIN_ROLES)`), comme les
 * interrupteurs des rappels (/api/admin/settings). La décision 10 de Maxime le range dans
 * l'espace Bras droits, « réservé aux 4 rangs staff ». Si la règle de `canParametrer` (Vanguard
 * et plus) devait s'appliquer ici, c'est une ligne dans le PUT.
 */

const lireEvenement = (v: unknown): Evenement | null => (v === "cs" || v === "gs" ? v : null);

export async function GET(req: Request) {
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error;
  const ev = lireEvenement(new URL(req.url).searchParams.get("evenement") ?? "cs");
  if (!ev) return NextResponse.json({ error: "Événement inconnu : cs ou gs." }, { status: 400 });

  const [p, salons, publics, interrupteur, compo] = await Promise.all([
    lireParametres(prisma, ev),
    // Les salons du cache du bot (`syncGuildChannels`) : texte, annonces, et forum pour les
    // débriefs. Vide en local, où le bot ne tourne pas contre le serveur.
    prisma.guildChannel.findMany({ where: { type: { in: ["text", "announcement", "forum"] } }, orderBy: [{ position: "asc" }, { name: "asc" }], select: { id: true, name: true, type: true } }),
    // Les salons visibles de @everyone, écrits par le bot au lot 3 (§9.3) : null tant qu'il ne
    // l'a jamais fait — l'écran le dit, plutôt que de les croire tous fermés.
    prisma.setting.findUnique({ where: { key: "salons_publics" } }),
    prisma.setting.findUnique({ where: { key: `${ev}_rappels_actifs` } }),
    ev === "cs" ? prisma.compositionState.findUnique({ where: { id: "main" } }) : Promise.resolve(null),
  ]);
  let salonsPublics: string[] | null = null;
  try { const v = publics ? JSON.parse(publics.value) : null; salonsPublics = Array.isArray(v) ? v.map(String) : null; } catch { /* illisible : inconnu */ }
  // Les titres renommés sur la page (« Renommer le poste ») : l'écran les montre à côté du
  // titre du paramétrage, pour qu'on sache lequel s'affiche.
  const slotMeta = compo ? normaliserCompo(compo.data).slotMeta : {};
  const postesRenommes = Object.fromEntries(Object.entries(slotMeta).filter(([, m]) => m.label).map(([k, m]) => [k, m.label!]));

  const maintenant = new Date();
  const prochaine = ev === "cs" ? prochaineSeanceParis(maintenant) : prochaineSeanceGS(maintenant, (p.data as ParametresGS).creneaux);
  // L'espace des vidéos de débrief (lot 8, §9.4) : ce qu'elles occupent (les envois en cours
  // compris, comme le quota les compte), et ce qu'il reste sur le disque du serveur.
  const videos = ev === "cs" ? { ...(await occupationVideos(prisma, maintenant.getTime())), libre: await espaceLibre() } : null;
  return NextResponse.json({
    evenement: ev,
    data: p.data,
    defauts: normaliserParametres(ev, {}),
    version: p.version,
    parQui: p.parQui,
    modifieLe: p.modifieLe,
    modifies: p.modifies,
    salons,
    salonsPublics,
    rappelsActifs: interrupteur?.value === "1",
    postesRenommes,
    // De quoi remplir l'aperçu des textes avec la séance qui vient.
    prochaine: prochaine ? { cle: prochaine.cle, date: prochaine.date, label: prochaine.label, debut: prochaine.debut.getTime() } : null,
    videos,
  });
}

/**
 * PUT { evenement, data, version } — le paramétrage ENTIER tel que l'écran le montre. Il est
 * VALIDÉ (400, avec la liste des raisons), puis NORMALISÉ, puis seules les clés qui diffèrent
 * du défaut partent en base. Une version vieillie reçoit 409 avec l'état actuel : l'écran garde
 * la saisie et propose de recharger.
 */
export async function PUT(req: Request) {
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error;
  const b = await req.json().catch(() => null) as { evenement?: unknown; data?: unknown; version?: unknown } | null;
  const ev = lireEvenement(b?.evenement);
  if (!b || !ev || !b.data || typeof b.data !== "object") return NextResponse.json({ error: "Paramétrage illisible." }, { status: 400 });
  const version = typeof b.version === "number" && Number.isInteger(b.version) && b.version >= 0 ? b.version : null;
  if (version === null) return NextResponse.json({ error: "Version manquante : recharge la page." }, { status: 400 });

  const [salons, autre] = await Promise.all([
    prisma.guildChannel.findMany({ select: { id: true, type: true } }),
    lireParametres(prisma, ev === "cs" ? "gs" : "cs"),
  ]);
  const details = validerParametres(ev, b.data, {
    salons, autre: autre.data,
    // Un identifiant de monstre doit mener à une fiche : le catalogue est lu ici, côté serveur.
    monstreConnu: (id) => !!monstreParId(id),
  });
  if (details.length) {
    return NextResponse.json({ error: details.length > 1 ? `${details.length} points à corriger avant d'enregistrer.` : details[0], details }, { status: 400 });
  }

  const propre = normaliserParametres(ev, b.data);
  const res = await enregistrerParametres(prisma, ev, propre, version, a.user.username);
  if (!res.ok) {
    const actuel = await lireParametres(prisma, ev);
    return NextResponse.json({
      error: `${actuel.parQui ?? "Quelqu'un"} a enregistré entre-temps (version ${actuel.version}). Ta saisie reste à l'écran : recharge pour repartir de la sienne.`,
      actuel: { data: actuel.data, version: actuel.version, parQui: actuel.parQui, modifieLe: actuel.modifieLe, modifies: actuel.modifies },
    }, { status: 409 });
  }
  // La trace d'un réglage qui fait parler le bot à toute la guilde.
  await audit(a.user.username, "evenements.parametrer", ev, `v${version} → v${res.version} · surchargé : ${Object.keys(res.stocke).join(", ") || "(tout au défaut)"}`);
  return NextResponse.json({ data: propre, version: res.version, parQui: a.user.username, modifieLe: new Date(), modifies: Object.keys(res.stocke) });
}
