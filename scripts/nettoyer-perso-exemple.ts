/**
 * Retire le perso d'EXEMPLE « Daiisuke » publié par erreur sur des comptes.
 *
 * Avant le 2026-10-21, l'AirBuilder naissait avec un perso d'exemple nommé « Daiisuke »
 * (Arcaniste, P3, trois stuffs vides), et la synchro le publiait au compte comme s'il était
 * vrai : il devenait le perso principal de qui ouvrait le builder pour la première fois. Le
 * builder nomme désormais l'exemple « Perso 1 » et ne le publie plus ; ce script nettoie ce
 * qui a été publié avant.
 *
 *   npx tsx scripts/nettoyer-perso-exemple.ts               → AFFICHE seulement
 *   npx tsx scripts/nettoyer-perso-exemple.ts --appliquer   → retire
 *   … --exclure=ibeats,autre                               → comptes jamais touchés
 *
 * Un perso n'est retiré que s'il est VIDE aux deux endroits : dans la table Character (aucun
 * stuff ne porte une pièce) ET dans l'état sauvegardé de l'AirBuilder (User.builderBlob : aucun
 * stuff ne porte une pièce). Un « Daiisuke » équipé est un vrai perso : il reste. Par défaut,
 * le compte « ibeats » n'est jamais touché (décision de Maxime, 2026-10-21) — ses persos
 * s'appellent vraiment ainsi.
 *
 * L'état de l'AirBuilder est RE-HORODATÉ (`_ts`) : le builder ne préfère la version du serveur
 * à celle gardée dans le navigateur que si elle est plus récente. Sans cela, la copie locale
 * republiait l'exemple à la première ouverture.
 */
import { PrismaClient, type Prisma } from "@prisma/client";

const NOM = "daiisuke";
const args = process.argv.slice(2);
const appliquer = args.includes("--appliquer");
const exclusArg = args.find((a) => a.startsWith("--exclure="));
const EXCLUS = new Set((exclusArg ? exclusArg.slice("--exclure=".length) : "ibeats")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));

type StuffBlob = { name?: string; eq?: Record<string, unknown> };
type PersoBlob = { name?: string; stuffs?: StuffBlob[] };
type Blob = { chars?: PersoBlob[]; cur?: number; _ts?: number; [k: string]: unknown };

const estNom = (n: unknown) => String(n ?? "").trim().toLowerCase() === NOM;
const stuffVideBlob = (s: StuffBlob) => !Object.keys(s?.eq ?? {}).length;
const plein = (v: unknown) => v != null && !(typeof v === "object" && !Array.isArray(v) && !Object.keys(v as object).length);

async function main() {
  const db = new PrismaClient();
  try {
    const persos = await db.character.findMany({
      where: { name: { equals: "Daiisuke", mode: "insensitive" } },
      include: {
        user: { select: { id: true, username: true, role: true, builderBlob: true } },
        gearProfiles: { select: { name: true, weapon: true, armor: true, jewelry: true, pets: true, cards: true } },
      },
    });

    const aRetirer: { charId: string; userId: string; compte: string; rang: string }[] = [];
    for (const c of persos) {
      const compte = c.user.username;
      const videEnBase = c.gearProfiles.every((g) => ![g.weapon, g.armor, g.jewelry, g.pets, g.cards].some(plein));
      const blob = (c.user.builderBlob ?? {}) as Blob;
      const dansBlob = (blob.chars ?? []).filter((p) => estNom(p?.name));
      const videDansBlob = dansBlob.every((p) => (p.stuffs ?? []).every(stuffVideBlob));
      let verdict = "RETIRÉ";
      if (EXCLUS.has(compte.toLowerCase())) verdict = "gardé (compte exclu)";
      else if (!videEnBase) verdict = "gardé (stuff équipé en base)";
      else if (!videDansBlob) verdict = "gardé (stuff équipé dans l'AirBuilder)";
      console.log(`${compte.padEnd(20)} ${c.user.role.padEnd(10)} ${c.name} (${c.class}, P${c.prestige}${c.isMain ? ", principal" : ""}) → ${verdict}`);
      if (verdict === "RETIRÉ") aRetirer.push({ charId: c.id, userId: c.user.id, compte, rang: c.user.role });
    }

    if (!aRetirer.length) { console.log("\nRien à retirer."); return; }
    if (!appliquer) { console.log(`\n${aRetirer.length} perso(s) seraient retirés. Relancer avec --appliquer pour le faire.`); return; }

    const comptes = [...new Set(aRetirer.map((r) => r.userId))];
    await db.$transaction(async (tx) => {
      // Les GearProfile suivent par la cascade du schéma (onDelete: Cascade).
      await tx.character.deleteMany({ where: { id: { in: aRetirer.map((r) => r.charId) } } });
      for (const userId of comptes) {
        const u = await tx.user.findUnique({ where: { id: userId }, select: { builderBlob: true } });
        const blob = { ...((u?.builderBlob ?? {}) as Blob) };
        const avant = blob.chars ?? [];
        const cur = Number.isInteger(blob.cur) ? (blob.cur as number) : 0;
        const ouvert = avant[cur];
        const restants = avant.filter((p) => !(estNom(p?.name) && (p.stuffs ?? []).every(stuffVideBlob)));
        blob.chars = restants;
        // Le perso ouvert reste ouvert s'il existe encore ; sinon le premier.
        const i = ouvert ? restants.indexOf(ouvert) : -1;
        blob.cur = i >= 0 ? i : 0;
        blob._ts = Date.now();
        await tx.user.update({ where: { id: userId }, data: { builderBlob: blob as unknown as Prisma.InputJsonValue } });
        // Le premier perso restant devient le principal : c'est la règle de la synchro.
        const premier = restants[0]?.name;
        if (premier) {
          await tx.character.updateMany({ where: { userId }, data: { isMain: false } });
          await tx.character.updateMany({ where: { userId, name: premier }, data: { isMain: true } });
        }
      }
    });
    console.log(`\n${aRetirer.length} perso(s) retirés sur ${comptes.length} compte(s). Le prochain passage dans l'AirBuilder republie le reste.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
