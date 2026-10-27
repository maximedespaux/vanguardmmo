/**
 * IMPORTER UN DÉBRIEF TENU AILLEURS — décision 11 de Maxime : le débrief du 18/10/2026 devient la
 * PREMIÈRE séance de l'historique des Chambres (SPEC-CHAMBRES-RECENSEMENT, lot 6).
 *
 *   npx tsx scripts/importer-debrief.ts                 # le 18/10/2026 (le fichier par défaut)
 *   npx tsx scripts/importer-debrief.ts autre.json      # un autre débrief retranscrit, même forme
 *   npx tsx scripts/importer-debrief.ts --essai         # dit ce qu'il ferait, n'écrit rien
 *
 * En production, depuis le dossier du dépôt sur le VPS (l'image contient `src/` et `scripts/`) :
 *   docker compose -f docker-compose.prod.yml run --rm bot npx tsx scripts/importer-debrief.ts
 *
 * Le fichier par défaut est la copie EMBARQUÉE de la retranscription, dans `src/data/` : l'original,
 * `assets/genesis/refonte/debrief-2026-10-18.json`, vit dans `assets/`, que l'image ne reçoit pas
 * (.dockerignore). verifier-seances.ts vérifie que les deux sont identiques, octet pour octet.
 *
 * Le fichier est une RETRANSCRIPTION fidèle de l'image du bot Python (« Retour Chambre —
 * 18/10/2026 ») : statuts et remarques mot pour mot, aucun chrono (il n'en avait pas été pris),
 * gagné, 10 joueurs. La liste des joueurs, elle, n'existe nulle part : la séance n'a AUCUNE ligne
 * de participant, et elle n'est pas clôturée — le staff peut la clôturer plus tard s'il retrouve
 * qui était là. Elle compte donc dans les résultats et les comparaisons, pas dans les
 * participations de chacun.
 *
 * IDEMPOTENT (`planImport`) : relancé, il ne double rien et ne réécrit rien d'identique ; il ne
 * remplace jamais un débrief fait sur le site, ni l'import une fois retouché ou repassé en
 * brouillon par le staff, ni un débrief repris du fichier du bot Python
 * (scripts/importer-dracarys.ts, lot 10 : la donnée d'origine l'emporte sur la retranscription). L'écriture passe par `majSeance`, sous le verrou de
 * la séance, comme toute autre. Sortie : 0 (écrit, ou rien à faire), 2 (refusé), 1 (erreur).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";
import { seanceCS } from "@/lib/evenements";
import { LIBELLE_STATUT, fmtDuree, lireDebriefImporte, planImport, type PlanImport } from "@/lib/chambres";
import { majSeance } from "@/lib/seances-serveur";

const DEFAUT = "src/data/chambres-debrief-2026-10-18.json";

async function main() {
  const args = process.argv.slice(2);
  const essai = args.includes("--essai");
  const fichier = resolve(process.cwd(), args.find((x) => !x.startsWith("--")) ?? DEFAUT);
  let json: unknown;
  try { json = JSON.parse(readFileSync(fichier, "utf8")); } catch (e) {
    console.error(`Fichier illisible : ${fichier}\n${(e as Error).message}`);
    return 1;
  }
  const lu = lireDebriefImporte(json);
  if (!lu.ok) {
    console.error(`Le fichier est refusé, rien n'est importé :\n${lu.erreurs.map((x) => `  - ${x}`).join("\n")}`);
    return 2;
  }
  const d = lu.d;
  const s = seanceCS(d.date, d.creneau);
  const notes = Object.values(d.notes);
  console.log(`${d.titre} → séance ${s.cle} (${s.label})`);
  console.log(`  ${d.etapes.length} étapes · ${notes.filter((n) => n.statut).length} statuts (${(["bien", "moyen", "mal"] as const).map((k) => `${notes.filter((n) => n.statut === k).length} ${LIBELLE_STATUT[k].toLowerCase()}`).join(", ")}) · ${notes.filter((n) => n.remarque).length} remarques`);
  console.log(`  chronos : ${notes.some((n) => n.chrono !== null) ? notes.map((n) => fmtDuree(n.chrono)).join(" ") : "aucun"} · résultat : ${d.resultat ?? "—"} · joueurs : ${d.joueurs ?? "?"} (liste inconnue : aucun participant écrit)`);

  const db = new PrismaClient();
  try {
    if (essai) {
      const x = await db.seanceGuilde.findUnique({ where: { cle: s.cle } });
      const plan = planImport(x, d, Date.now());
      const verdict = plan.quoi === "ecrire" ? (x ? "à écrire" : "à écrire, la séance serait créée") : plan.quoi === "rien" ? "rien à faire" : "refusé";
      console.log(`Essai, rien n'est écrit — ${verdict} : ${plan.message}`);
      return plan.quoi === "refus" ? 2 : 0;
    }
    let plan: PlanImport | null = null;
    const res = await majSeance(db, s, (x) => {
      // Une ligne que `majSeance` vient de créer est vide : le plan la traite comme une séance neuve.
      plan = planImport(x, d, Date.now());
      if (plan.quoi !== "ecrire") return { ok: false, status: plan.quoi === "rien" ? 200 : 409, message: plan.message };
      const w = plan.data;
      return {
        ok: true, message: plan.message,
        patch: {
          etapes: w.etapes as unknown as Prisma.InputJsonValue, debrief: w.debrief as Prisma.InputJsonValue,
          resultat: w.resultat, aRetenir: w.aRetenir, debriefPar: w.debriefPar, debriefPublieAt: w.debriefPublieAt,
        },
      };
    });
    if (res.ok) { console.log(res.message); return 0; }
    console.log(res.message);
    return res.status === 200 ? 0 : 2;
  } finally {
    await db.$disconnect();
  }
}

main().then((code) => { process.exitCode = code; }, (e) => { console.error(e); process.exitCode = 1; });
