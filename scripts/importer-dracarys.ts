/**
 * REPRENDRE L'HISTORIQUE DU BOT PYTHON — SPEC-CHAMBRES-RECENSEMENT §8.10, lot 10 (facultatif).
 *
 *   npx tsx scripts/importer-dracarys.ts chemin/vers/data_chambre.json            # importe
 *   npx tsx scripts/importer-dracarys.ts chemin/vers/data_chambre.json --essai    # dit ce qu'il ferait, n'écrit rien
 *
 * En production, depuis le dossier du dépôt sur le VPS, le fichier copié à côté (l'image
 * contient `src/` et `scripts/`, pas le dossier du bot Python) :
 *   docker compose -f docker-compose.prod.yml run --rm -v "$PWD/data_chambre.json:/app/data_chambre.json:ro" bot \
 *     npx tsx scripts/importer-dracarys.ts data_chambre.json --essai
 *
 * Le fichier, c'est `data/data_chambre.json` du bot Python (DATA_DIR, bot.py:307-309), tiré du
 * serveur GENESIS. On en reprend, pour chaque Chambre d'un mercredi ou d'un dimanche :
 * - le débrief PUBLIÉ (`debriefs`) : étapes, statuts, chronos et remarques MOT POUR MOT, résultat
 *   et « à retenir » — les records et la comparaison « vs la dernière fois » repartent alors de
 *   l'historique existant ;
 * - la clôture (`historique`) : qui était là et qui ne l'était pas, avec ses salles (`c3` → `s3`)
 *   et sa place chez les jumeaux. L'uid Discord devient le compte (`User.discordId`).
 * Les dates qui ne tombent ni un mercredi ni un dimanche, et ce qui est illisible, sont LISTÉS.
 *
 * REFUSÉ (rien n'est écrit) : un fichier illisible, ou dont AUCUN uid ne correspond à un compte
 * du site — le même bot a d'abord servi la guilde Dracarys (`SERVEUR_GUILDE_ID`, bot.py:45), et
 * ses records se mêleraient aux nôtres.
 *
 * IDEMPOTENT, par la clé de la séance (`cs_2026-10-18_dim`) : relancé, il ne double rien et ne
 * réécrit rien d'identique. Il ne touche jamais une séance débriefée, chronométrée, clôturée ou
 * annulée sur le site (lib/import-dracarys.ts, `planDebriefDracarys` et `planParticipants`).
 * Chaque écriture passe par `majSeance`, sous le verrou de version de la séance, comme toute autre
 * (lib/import-dracarys-serveur.ts, vérifié sur une base en mémoire par verifier-seances.ts).
 *
 * Sortie : 0 (écrit, ou rien à faire), 2 (refusé), 1 (erreur).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { lireDracarys } from "@/lib/import-dracarys";
import { importerDracarys } from "@/lib/import-dracarys-serveur";

async function main() {
  const args = process.argv.slice(2);
  const essai = args.includes("--essai");
  const chemin = args.find((x) => !x.startsWith("--"));
  if (!chemin) {
    console.error("Donne le chemin du fichier : npx tsx scripts/importer-dracarys.ts chemin/vers/data_chambre.json [--essai]\nSans ce fichier, l'historique des Chambres démarre à vide (§8.10).");
    return 1;
  }
  const fichier = resolve(process.cwd(), chemin);
  let json: unknown;
  try { json = JSON.parse(readFileSync(fichier, "utf8")); } catch (e) {
    console.error(`Fichier illisible : ${fichier}\n${(e as Error).message}`);
    return 1;
  }
  const lu = lireDracarys(json);
  if (!lu.ok) { console.error(`Le fichier est refusé, rien n'est importé :\n${lu.erreurs.map((x) => `  - ${x}`).join("\n")}`); return 2; }
  const l = lu.l;

  const db = new PrismaClient();
  try {
    // Le fichier vient-il bien du serveur GENESIS ? Au moins un uid doit être un compte du site.
    const trouves = l.uids.length ? await db.user.findMany({ where: { discordId: { in: l.uids } }, select: { id: true, username: true, discordId: true } }) : [];
    if (!trouves.length) {
      console.error(`Le fichier est refusé, rien n'est importé : aucun des joueurs du fichier (${l.uids.length}) n'a de compte sur le site. Est-ce bien le fichier du serveur GENESIS (et non celui de Dracarys) ?`);
      return 2;
    }
    const comptes = new Map(trouves.map((u) => [u.discordId, { id: u.id, username: u.username }]));
    console.log(`${fichier}\n  ${l.seances.length} séance${l.seances.length > 1 ? "s" : ""} de Chambre · ${comptes.size} joueur${comptes.size > 1 ? "s" : ""} sur ${l.uids.length} retrouvé${comptes.size > 1 ? "s" : ""} sur le site${essai ? " · ESSAI : rien n'est écrit" : ""}`);
    for (const x of l.ecartees) console.log(`  écarté   ${x}`);
    for (const x of l.avertissements) console.log(`  réserve  ${x}`);

    const rapport = await importerDracarys(db, l, comptes, { essai });
    const dit = (v: { quoi: string; message: string }) => `${essai && v.quoi === "ecrire" ? "à écrire : " : essai && v.quoi === "refus" ? "refusé : " : ""}${v.message}`;
    for (const r of rapport) {
      console.log(`\n${r.cle} — ${r.label} (« ${r.origine} »)`);
      console.log(`  débrief  ${dit(r.debrief)}`);
      console.log(`  clôture  ${dit(r.cloture)}`);
      if (r.sansCompte.length) console.log(`  réserve  sans compte sur le site (gardés au nom du perso) : ${r.sansCompte.join(", ")}`);
    }
    const refus = rapport.filter((r) => r.debrief.quoi === "refus" || r.cloture.quoi === "refus").length;
    console.log(refus ? `\n${refus} séance${refus > 1 ? "s" : ""} refusée${refus > 1 ? "s" : ""} en partie : rien n'y a été écrasé.` : "\nTerminé.");
    return refus ? 2 : 0;
  } finally {
    await db.$disconnect();
  }
}

main().then((code) => { process.exitCode = code; }, (e) => { console.error(e); process.exitCode = 1; });
