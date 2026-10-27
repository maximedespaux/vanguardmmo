import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRole } from "@/lib/access";
import { ADMIN_ROLES } from "@/config/roles";
import { ESPACES, type Lien } from "@/config/nav";
import {
  CLE_REGLAGE_AMIS, ESPACES_OUVRABLES, MAX_ROLES_AMIS, REGLAGE_AMIS_DEFAUT, estAmi, estIdDiscord, lireReglageAmis,
  type ReglageAmis,
} from "@/config/amis";
import { oublierReglageAmis } from "@/lib/amis";
import { audit } from "@/lib/audit";

/**
 * LE RÉGLAGE DES AMIS — la page « Accès des amis » des bras droits (rubrique Outils).
 *
 * SPEC-INFORMATION-GUILDE §9, Maxime : « avoir un espace paramétrable si jamais on souhaite
 * changer ». Deux listes, rangées dans `Setting` (clé `acces_amis`, du JSON) : les rôles
 * Discord qui font d'un compte un ami, et les espaces de la carte qu'ils lui ouvrent. La
 * règle qui les lit est dans config/amis.ts ; cette route ne fait que les écrire.
 *
 * LIRE et ÉCRIRE : les quatre rangs bras droits (Maxime, 2026-10-21), comme toute la
 * rubrique — la garde `apiRole(ADMIN_ROLES)` suffit, chaque écriture laisse sa trace.
 */

/** Ce que la page montre d'un espace ouvrable : son nom, et ce qu'un ami y GAGNE. */
function ouvrables() {
  return ESPACES_OUVRABLES.map((cle) => {
    const e = ESPACES.find((x) => x.cle === cle)!;
    // Ce qu'un visiteur connecté n'a pas : les lignes réservées de l'espace.
    const reservees = e.liens.filter((l: Lien) => (l.acces ?? e.acces) === "guild").map((l) => l.label);
    return { cle, label: e.label, pages: e.liens.map((l) => l.label), reservees };
  });
}

export async function GET() {
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error;
  const [ligne, comptes] = await Promise.all([
    prisma.setting.findUnique({ where: { key: CLE_REGLAGE_AMIS } }),
    prisma.user.findMany({ where: { discordRoles: { isEmpty: false } }, select: { role: true, discordRoles: true } }),
  ]);
  const reglage = lireReglageAmis(ligne?.value);
  // Les noms des rôles, lus dans le cache du bot (`GuildRole`) : un identifiant seul ne dit
  // pas si c'est le bon rôle. Vide tant que le bot n'a pas tourné (en local, toujours).
  const roles = await prisma.guildRole.findMany({
    where: { managed: false },
    select: { id: true, name: true, color: true, position: true },
    orderBy: { position: "desc" },
  });
  return NextResponse.json({
    reglage,
    defaut: REGLAGE_AMIS_DEFAUT,
    /** Jamais enregistré : c'est le défaut qui s'applique. */
    parDefaut: !ligne,
    majLe: ligne?.updatedAt ?? null,
    ouvrables: ouvrables(),
    rolesServeur: roles.map(({ id, name, color }) => ({ id, nom: name, couleur: color })),
    /** Combien de comptes ce réglage reconnaît comme amis, aujourd'hui. */
    amis: comptes.filter((u) => estAmi(u.role, u.discordRoles, reglage)).length,
    peutRegler: true,
    maxRoles: MAX_ROLES_AMIS,
  });
}

/**
 * POST { roles: string[], espaces: string[] } — le réglage ENTIER, comme la page le montre.
 * Une saisie invalide est REFUSÉE avec sa raison, pas nettoyée en silence : un identifiant
 * mal collé qu'on écarterait sans le dire laisserait croire que l'ami a son accès.
 */
export async function POST(req: Request) {
  const a = await apiRole(ADMIN_ROLES); if ("error" in a) return a.error;
  const b = await req.json().catch(() => null) as { roles?: unknown; espaces?: unknown } | null;
  if (!b || !Array.isArray(b.roles) || !Array.isArray(b.espaces)) {
    return NextResponse.json({ error: "Réglage illisible." }, { status: 400 });
  }
  const roles = [...new Set(b.roles.map((x) => String(x ?? "").trim()).filter(Boolean))];
  const invalides = roles.filter((r) => !estIdDiscord(r));
  if (invalides.length) {
    return NextResponse.json({ error: `Identifiant de rôle invalide : ${invalides.join(", ")} — un identifiant Discord, ce sont 17 à 20 chiffres (clic droit sur le rôle → Copier l'identifiant).` }, { status: 400 });
  }
  if (roles.length > MAX_ROLES_AMIS) return NextResponse.json({ error: `${MAX_ROLES_AMIS} rôles au plus.` }, { status: 400 });
  const inconnus = b.espaces.map(String).filter((e) => !(ESPACES_OUVRABLES as readonly string[]).includes(e));
  if (inconnus.length) {
    return NextResponse.json({ error: `Espace qu'on ne peut pas ouvrir à un ami : ${inconnus.join(", ")}.` }, { status: 400 });
  }
  const reglage: ReglageAmis = { roles, espaces: ESPACES_OUVRABLES.filter((e) => (b.espaces as unknown[]).includes(e)) };

  const avant = await prisma.setting.findUnique({ where: { key: CLE_REGLAGE_AMIS } });
  const value = JSON.stringify(reglage);
  await prisma.setting.upsert({ where: { key: CLE_REGLAGE_AMIS }, update: { value }, create: { key: CLE_REGLAGE_AMIS, value } });
  oublierReglageAmis();
  // Qui a ouvert ou fermé quoi : la trace d'un réglage qui donne des droits.
  await audit(a.user.username, "acces-amis.regler", CLE_REGLAGE_AMIS, `${avant?.value ?? "(défaut)"} → ${value}`);
  return NextResponse.json({ ok: true, reglage });
}
