import { NextResponse } from "next/server";
import { calculer, chargerTables, type Personnage } from "@/lib/statistiques";
import { EPREUVES } from "@/lib/statistiques/epreuves";

/**
 * LE CALCUL DES STATISTIQUES FINALES — la route qui le sert.
 *
 * Pourquoi une route et pas un import : les relevés lus par le moteur pèsent
 * 1,1 Mo (objets-stats.json) et 512 Ko (bonus-sources.json). La règle de poids de
 * la maison envoie tout ce qui dépasse 120 Ko dans une route API qui lit avec
 * `fs` et garde son index en mémoire. Le navigateur ne télécharge donc que le
 * résultat, pas les tables.
 *
 * Trois usages :
 *   GET  /api/statistiques                → les tables de lecture : les couples
 *        (absolu, pourcentage) du dictionnaire, l'ordre des neuf statistiques de
 *        sertissage, les plafonds, ce qui n'est pas calculable. De quoi construire
 *        une interface sans deviner.
 *   GET  /api/statistiques?epreuve=1..5   → une des cinq épreuves, calculée.
 *        `?epreuve=toutes` les rend toutes les cinq.
 *   POST /api/statistiques                → un personnage en corps JSON.
 *
 * Pas de vérification d'accès : c'est de la connaissance du JEU, comme
 * /api/competences, et les fichiers lus sont déjà dans `public/` pour trois
 * d'entre eux.
 */

export const dynamic = "force-dynamic";

export async function GET(requete: Request) {
  const url = new URL(requete.url);
  const epreuve = url.searchParams.get("epreuve");
  const tables = chargerTables();

  if (epreuve) {
    if (epreuve === "toutes") {
      return NextResponse.json({ epreuves: EPREUVES.map((p) => calculer(p, tables)) });
    }
    const rang = Number(epreuve) - 1;
    const personnage = EPREUVES[rang];
    if (!personnage) {
      return NextResponse.json(
        { erreur: `Épreuve inconnue. Il y en a ${EPREUVES.length}, numérotées de 1 à ${EPREUVES.length}.` },
        { status: 404 },
      );
    }
    return NextResponse.json(calculer(personnage, tables));
  }

  const mechArme = tables.mech.arme as Record<string, unknown>;
  const mechBijou = tables.mech.bijou as Record<string, unknown>;
  const mechArmure = tables.mech.armure as Record<string, unknown>;
  const mechMode = tables.mech.mode as Record<string, unknown>;

  return NextResponse.json({
    quoi: "Les tables de lecture du calcul de statistiques. Aucun personnage ici — voir ?epreuve=1..5 ou POST.",
    /** Là où la confusion absolu/pourcentage est mécaniquement possible. Compté, pas écrit. */
    couples: (() => {
      const codes = [...tables.dictionnaire.keys()];
      const out: { absolu: string; absoluFr: string | null; pourcentage: string; pourcentageFr: string | null }[] = [];
      for (const code of codes) {
        const m = /^(.*?)_(RATE|PERCENT)$/.exec(code);
        if (!m || !tables.dictionnaire.has(m[1])) continue;
        out.push({
          absolu: m[1], absoluFr: tables.dictionnaire.get(m[1])?.fr ?? null,
          pourcentage: code, pourcentageFr: tables.dictionnaire.get(code)?.fr ?? null,
        });
      }
      return out.sort((a, b) => a.absolu.localeCompare(b.absolu));
    })(),
    dictionnaire: {
      codes: tables.dictionnaire.size,
      avecLibelle: [...tables.dictionnaire.values()].filter((e) => e.fr).length,
      sansLibelle: [...tables.dictionnaire.values()].filter((e) => !e.fr).map((e) => e.code),
      employes: [...tables.dictionnaire.values()].filter((e) => e.objets > 0).length,
    },
    sertissage: {
      ordre: tables.ordreSertissage,
      pourquoi:
        "L'ordre de GEMU colle neuf fois sur neuf à celui du client (sertissage.ultimes). DIASTATS porte les mêmes neuf dans un AUTRE ordre : lire une valeur de GEMU à l'index d'un nom de DIASTATS donne le bon nom avec le mauvais effet.",
      logements: {
        gemmes: mechArme.upgrade_normal, artefact: mechArme.artefact,
        costume: mechMode.gemmes,
      },
      holographiques: tables.holographiques,
    },
    plafonds: {
      bijou: mechBijou.upgrade,
      armure: mechArmure.upgrade,
      percageArme: mechArme.percage_max,
      eveil: tables.plafondEveil,
    },
    panoplies: {
      dansLeClient: tables.panoplies.length,
      signaturesDuBuilder: tables.signatures.size,
      lignesNegatives: tables.panoplies.reduce(
        (n, p) => n + p.paliers.filter((l) => (l.valeur ?? 0) < 0).length, 0),
      avertissement: (mechArmure.panoplies as Record<string, string> | undefined)?.avertissement ?? null,
    },
    paliersAccessoire: {
      bijoux: tables.paliers.size,
      regle: "REMPLACEMENT — la valeur du palier remplace la précédente, elle ne s'y ajoute pas.",
    },
    nonCalculable: [
      (mechArme.nonCalculable as string) ?? "",
      ((mechArmure.upgrade as Record<string, string> | undefined)?.nonCalculable) ?? "",
      ((mechMode.upgrade as Record<string, string> | undefined)?.nonCalculable) ?? "",
      "Le facteur d'arme de l'ARC : propJob.inc nomme sept familles (SWD, AXE, STAFF, STICK, KNUCKLE, WAND, YOYO) et l'arc n'en fait pas partie. L'attaque d'un arc n'est donc pas chiffrable.",
      "Les 15 de départ par attribut et le budget « niveau × 2 − 2 » ne sont écrits dans aucun fichier détenu : ce sont les valeurs du Flyff officiel.",
    ].filter(Boolean),
    sources: tables.sources,
    epreuves: EPREUVES.map((p, i) => ({ numero: i + 1, nom: p.nom })),
  });
}

export async function POST(requete: Request) {
  let corps: unknown;
  try {
    corps = await requete.json();
  } catch {
    return NextResponse.json({ erreur: "Corps JSON illisible." }, { status: 400 });
  }
  const p = corps as Partial<Personnage>;
  if (!p || typeof p.classe !== "string" || typeof p.niveau !== "number") {
    return NextResponse.json(
      { erreur: "Il faut au moins `classe` (nom français ou code du client) et `niveau`." },
      { status: 400 },
    );
  }
  const personnage: Personnage = {
    nom: typeof p.nom === "string" ? p.nom : undefined,
    classe: p.classe,
    sexe: p.sexe === "F" ? "F" : "G",
    niveau: p.niveau,
    attributs: p.attributs ?? {},
    equipement: p.equipement ?? {},
    carnets: p.carnets ?? [],
  };
  return NextResponse.json(calculer(personnage, chargerTables()));
}
