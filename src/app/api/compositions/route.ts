import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiAuth } from "@/lib/access";
import { canAccessGuild } from "@/config/roles";
import { fusionnerLu, normaliserCompo, type CompoState } from "@/lib/compositions";
import { sauverPrecedent } from "@/lib/compositions-serveur";

// Composition des Chambres Secrètes — un blob JSON partagé par toute la guilde
// (inscriptions + candidats + sélection). Lecture/écriture ouvertes aux membres de guilde ;
// les actions sensibles (sélection, reset) sont gardées côté page (rôle admin).
async function guard() {
  const a = await apiAuth();
  if ("error" in a) return { error: a.error as NextResponse };
  if (!canAccessGuild(a.user.role)) return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  return { ok: true as const, user: a.user };
}

/** `userId` ne sort jamais vers la page : c'est l'id d'un compte, et la page n'en a pas besoin
 *  (le serveur le retrouve à l'écriture, ci-dessous). */
const sansComptes = (e: CompoState): CompoState => ({
  ...e,
  signups: e.signups.map(({ userId: _u, ...x }) => x),
  presences: e.presences.map(({ userId: _u, ...x }) => x),
});

export async function GET() {
  const g = await guard(); if ("error" in g) return g.error;
  const row = await prisma.compositionState.findUnique({ where: { id: "main" } });
  // Toujours une forme garantie : le bot lit les memes donnees pour annoncer
  // l'effectif manquant, il ne peut pas s'appuyer sur un blob libre.
  // `lu` : l'instant de CETTE lecture (spec §5.4, lot 3). La page le renvoie avec son prochain
  // enregistrement ; ce qui a été posé depuis — par le bot, depuis Discord, ou par un autre
  // membre — n'est plus effacé par un état qu'elle a lu 15 s plus tôt.
  return NextResponse.json({ ...sansComptes(normaliserCompo(row?.data)), lu: row?.updatedAt.getTime() ?? 0 });
}

/**
 * Une composition entiere se perd en un seul PUT mal forme : l'etat est un blob
 * remplace en bloc, il n'y a pas de fusion. C'est arrive (11 inscriptions et 9
 * postes renommes effaces par un appel qui envoyait signups: []), et seule la
 * lecture des versions mortes de la ligne PostgreSQL a permis de les retrouver.
 *
 * Trois protections, chacune couvrant ce que les autres laissent passer :
 *  - un effacement TOTAL exige `force: true`, que seul le bouton
 *    « Reinitialiser » envoie ;
 *  - une CHUTE brutale du nombre d'inscriptions est refusee elle aussi : elle ne
 *    passe jamais par zero, donc le premier controle ne la voyait pas, et c'est
 *    pourtant le cas le plus dangereux (un client qui publie un etat qu'il
 *    n'avait pas fini de lire) ;
 *  - l'etat precedent est conserve a chaque ecriture, pour que meme un
 *    effacement legitime mais regrette reste rattrapable.
 */
const SEUIL_EFFACEMENT = 3;
/**
 * Une chute d'au moins autant d'inscriptions en UNE ecriture n'est pas un geste
 * normal : la page en retire une a la fois. C'est en revanche la signature d'un
 * client qui publie un etat qu'il n'avait pas fini de lire — cas qui effacait
 * les inscriptions des autres joueurs sans jamais passer par zero, donc sans
 * declencher le garde-fou d'effacement total.
 */
const CHUTE_SUSPECTE = 3;

export async function PUT(req: NextRequest) {
  const g = await guard(); if ("error" in g) return g.error;
  const brut = await req.json().catch(() => null);
  if (brut == null || typeof brut !== "object") return NextResponse.json({ error: "data invalide" }, { status: 400 });
  const force = (brut as { force?: unknown }).force === true;
  const luBrut = (brut as { lu?: unknown }).lu;
  const lu = typeof luBrut === "number" && Number.isFinite(luBrut) ? luBrut : null;

  /* L'ÉCRITURE NE PASSE QUE SI LA LIGNE N'A PAS BOUGÉ depuis sa lecture ici (verrou sur
     `updatedAt`, comme `modifierCompo` du bot) : un « Je viens » cliqué sur Discord pendant
     ce PUT ne se perd plus entre la lecture et l'écriture. Trois conflits de suite : 409. */
  for (let essai = 0; essai < 3; essai++) {
    const avant = await prisma.compositionState.findUnique({ where: { id: "main" } });
    const precedent = normaliserCompo(avant?.data);
    // On normalise AVANT d'ecrire : rien d'inattendu n'entre en base, et les
    // bornes de taille sont appliquees champ par champ (plus sur qu'un seul
    // controle sur la taille totale). Puis le correctif `lu` (spec §5.4) : ce que le client ne
    // pouvait pas connaître, posé après sa lecture par un autre que lui, revient.
    const data = fusionnerLu(normaliserCompo(brut), precedent, lu, avant?.updatedAt.getTime() ?? null, { id: g.user.id, username: g.user.username });

    /* LE COMPTE DE CHAQUE ANNONCE ET DE CHAQUE INSCRIPTION (spec §5.3, renfort du lot 2). Le
       client ne le choisit jamais : une entrée déjà connue garde celui qu'elle avait, une entrée
       NOUVELLE prend celui de l'appelant — c'est lui qui vient de la poser. Les participants
       d'une séance et ses bilans s'y relient sans dépendre d'un nom Discord qui vieillit
       (piège n° 2). Les entrées d'avant restent sans compte et se résolvent par le nom du
       personnage.
       Une annonce se reconnaît à son créneau, son perso ET son `ts` : la même annonce refaite la
       semaine suivante remplace l'ancienne (page, `basculerPresence`) avec un `ts` neuf — c'est
       une annonce NOUVELLE, qui prend le compte de son auteur, au lieu d'hériter à jamais de
       l'absence de compte d'une annonce d'avant le 21/10.
       Et une entrée « nouvelle » ne prend le compte de l'appelant que si elle se dit DE lui
       (`player`) : la page renvoie l'état lu jusqu'à 15 s plus tôt, et une annonce qu'un autre
       vient de retirer peut ainsi réapparaître (spec §5.4) — elle serait sinon attribuée à
       celui qui a cliqué, et ses bilans compteraient la soirée d'un autre. */
    const moi = g.user.username.toLowerCase();
    const aMoi = (player: string) => (player.toLowerCase() === moi ? g.user.id : undefined);
    const cleAnnonce = (p: { creneau: string; pseudo: string; ts: number }) => `${p.creneau}|${p.pseudo.toLowerCase()}|${p.ts}`;
    const comptePresence = new Map(precedent.presences.map((p) => [cleAnnonce(p), p.userId]));
    const compteSignup = new Map(precedent.signups.map((x) => [x.id, x.userId]));
    data.presences = data.presences.map((p) => {
      const cle = cleAnnonce(p);
      return { ...p, userId: comptePresence.has(cle) ? comptePresence.get(cle) : aMoi(p.player) };
    });
    data.signups = data.signups.map((x) => ({ ...x, userId: compteSignup.has(x.id) ? compteSignup.get(x.id) : aMoi(x.player) }));

    const videTout = data.signups.length === 0 && precedent.signups.length >= SEUIL_EFFACEMENT;
    const chuteBrutale = precedent.signups.length - data.signups.length >= CHUTE_SUSPECTE;
    const perdSlotMeta =
      Object.keys(data.slotMeta).length === 0 && Object.keys(precedent.slotMeta).length > 0;
    if (!force && (videTout || chuteBrutale || perdSlotMeta)) {
      return NextResponse.json(
        {
          error:
            "Cet enregistrement effacerait la composition partagée. " +
            "Renvoie l'état complet, ou passe force: true si l'effacement est voulu.",
          aurait_efface: {
            inscriptions: precedent.signups.length - data.signups.length,
            postes_renommes: Object.keys(precedent.slotMeta).length - Object.keys(data.slotMeta).length,
          },
        },
        { status: 409 }
      );
    }

    if (!avant) {
      try { await prisma.compositionState.create({ data: { id: "main", data: data as object } }); return NextResponse.json({ ok: true }); }
      catch { continue; } // créée entre-temps par un autre : on relit
    }
    const n = await prisma.compositionState.updateMany({ where: { id: "main", updatedAt: avant.updatedAt }, data: { data: data as object, updatedAt: new Date() } });
    if (n.count === 1) {
      await sauverPrecedent(prisma, avant.data);
      return NextResponse.json({ ok: true });
    }
  }
  return NextResponse.json({ error: "La composition vient d'être modifiée. Recharge et réessaie." }, { status: 409 });
}
