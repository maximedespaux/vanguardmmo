import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";
import { normaliserCompo } from "@/lib/compositions";

// Composition des Chambres Secrètes — un blob JSON partagé par toute la guilde
// (inscriptions + candidats + sélection). Lecture/écriture ouvertes aux membres de guilde ;
// les actions sensibles (sélection, reset) sont gardées côté page (rôle admin).
async function guard() {
  const a = await apiAuth();
  if ("error" in a) return { error: a.error as NextResponse };
  if (!canAccessGuild(a.user.role)) return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  return { ok: true as const };
}

export async function GET() {
  const g = await guard(); if ("error" in g) return g.error;
  const row = await prisma.compositionState.findUnique({ where: { id: "main" } });
  // Toujours une forme garantie : le bot lit les memes donnees pour annoncer
  // l'effectif manquant, il ne peut pas s'appuyer sur un blob libre.
  return NextResponse.json(normaliserCompo(row?.data));
}

/** Copie de l'etat precedent, gardee a chaque ecriture. Meme table, autre cle. */
const CLE_PRECEDENT = "main:precedent";

/**
 * Une composition entiere se perd en un seul PUT mal forme : l'etat est un blob
 * remplace en bloc, il n'y a pas de fusion. C'est arrive (11 inscriptions et 9
 * postes renommes effaces par un appel qui envoyait signups: []), et seule la
 * lecture des versions mortes de la ligne PostgreSQL a permis de les retrouver.
 *
 * Deux protections, la seconde parce que la premiere ne couvre pas tout :
 *  - un effacement massif exige `force: true`, que seul le bouton
 *    « Reinitialiser » envoie. Un appel distrait ou un client incomplet est donc
 *    refuse au lieu d'etre applique en silence ;
 *  - l'etat precedent est conserve a chaque ecriture, pour que meme un
 *    effacement legitime mais regrette reste rattrapable.
 */
const SEUIL_EFFACEMENT = 3;

export async function PUT(req: NextRequest) {
  const g = await guard(); if ("error" in g) return g.error;
  const brut = await req.json().catch(() => null);
  if (brut == null || typeof brut !== "object") return NextResponse.json({ error: "data invalide" }, { status: 400 });
  // On normalise AVANT d'ecrire : rien d'inattendu n'entre en base, et les
  // bornes de taille sont appliquees champ par champ (plus sur qu'un seul
  // controle sur la taille totale).
  const data = normaliserCompo(brut);

  const avant = await prisma.compositionState.findUnique({ where: { id: "main" } });
  const precedent = normaliserCompo(avant?.data);
  const force = (brut as { force?: unknown }).force === true;

  const videTout = data.signups.length === 0 && precedent.signups.length >= SEUIL_EFFACEMENT;
  const perdSlotMeta =
    Object.keys(data.slotMeta).length === 0 && Object.keys(precedent.slotMeta).length > 0;
  if (!force && (videTout || perdSlotMeta)) {
    return NextResponse.json(
      {
        error:
          "Cet enregistrement effacerait la composition partagée. " +
          "Renvoie l'état complet, ou passe force: true si l'effacement est voulu.",
        aurait_efface: { inscriptions: precedent.signups.length, postes_renommes: Object.keys(precedent.slotMeta).length },
      },
      { status: 409 }
    );
  }

  if (avant) {
    await prisma.compositionState
      .upsert({
        where: { id: CLE_PRECEDENT },
        create: { id: CLE_PRECEDENT, data: avant.data as object },
        update: { data: avant.data as object },
      })
      .catch(() => null); // une sauvegarde ratee ne doit pas bloquer l'ecriture
  }

  await prisma.compositionState.upsert({
    where: { id: "main" },
    create: { id: "main", data: data as object },
    update: { data: data as object },
  });
  return NextResponse.json({ ok: true });
}
