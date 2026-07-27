import { prisma } from "@/lib/prisma";

/**
 * Fil d'une demande : discussion + journal, au même endroit.
 *
 * Remplace le salon d'échange Discord. Les événements qui partaient en embed
 * (engagement de remboursement, versement enregistré, décision) sont désormais
 * écrits ici, en clair : couper Discord sans cela aurait fait disparaître toute
 * la traçabilité du suivi des dettes.
 *
 * Un message système ne porte pas d'auteur — c'est ce qui le distingue d'un
 * message humain à l'affichage, et ce qui empêche de le confondre avec une prise
 * de position de quelqu'un.
 */
export async function ecrireSysteme(debtId: string, body: string): Promise<void> {
  // Jamais bloquant : un fil qui n'a pas pu s'écrire ne doit pas annuler le
  // remboursement ou l'engagement qui vient d'être enregistré.
  await prisma.requestMessage
    .create({ data: { debtId, kind: "system", body: body.slice(0, 2000) } })
    .catch(() => null);
}

/** Message humain. `author` est figé à l'écriture (voir le schéma). */
export async function ecrireMessage(
  debtId: string,
  userId: string,
  author: string,
  body: string
): Promise<boolean> {
  const texte = body.trim().slice(0, 2000);
  if (!texte) return false;
  const r = await prisma.requestMessage
    .create({ data: { debtId, userId, author, kind: "chat", body: texte } })
    .catch(() => null);
  return !!r;
}

export async function lireFil(debtId: string) {
  return prisma.requestMessage.findMany({
    where: { debtId },
    orderBy: { createdAt: "asc" },
    take: 300,
  });
}
