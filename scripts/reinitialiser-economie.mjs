/**
 * Remise à zéro de l'économie : demandes, conversations, quêtes.
 *
 * Écrit pour repartir d'une base propre après une série d'essais. Ça efface
 * POUR DE BON — d'où le mode `sauve`, à passer avant `vide` : la sauvegarde est
 * la seule chose qui rende l'opération réversible.
 *
 *   node scripts/reinitialiser-economie.mjs compte
 *   node scripts/reinitialiser-economie.mjs sauve sauvegarde-economie.json
 *   node scripts/reinitialiser-economie.mjs vide
 *
 * Ce qui part : BankRequest, RequestMessage, OffreVente, Quete,
 * QueteContribution, et les seules notifications qui pointaient vers eux.
 * Ce qui reste : les comptes, les personnages, les builds, le coffre, les
 * candidatures, les absences, les compositions — rien de tout cela n'est touché.
 */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const mode = process.argv[2];

const compter = async () => ({
  demandes: await p.bankRequest.count(),
  messages: await p.requestMessage.count(),
  offres: await p.offreVente.count(),
  quetes: await p.quete.count(),
  contributions: await p.queteContribution.count(),
  notifications: await p.notification.count(),
});

if (mode === "compte") {
  console.log(JSON.stringify(await compter(), null, 1));
}

if (mode === "sauve") {
  const fichier = process.argv[3];
  if (!fichier) { console.error("Donne un nom de fichier."); process.exit(1); }
  // Les prix sont des BigInt : JSON.stringify les refuse, on les passe en texte.
  const lisible = (o) => JSON.parse(JSON.stringify(o, (_k, v) => (typeof v === "bigint" ? String(v) : v)));
  const dump = lisible({
    _quand: new Date().toISOString(),
    bankRequest: await p.bankRequest.findMany(),
    requestMessage: await p.requestMessage.findMany(),
    offreVente: await p.offreVente.findMany(),
    quete: await p.quete.findMany(),
    queteContribution: await p.queteContribution.findMany(),
    notification: await p.notification.findMany(),
  });
  const fs = await import("node:fs");
  fs.writeFileSync(fichier, JSON.stringify(dump));
  console.log(
    "sauvegarde ecrite dans " + fichier + " :",
    Object.entries(dump).filter(([k]) => k[0] !== "_").map(([k, v]) => `${k}=${v.length}`).join(" "),
  );
}

if (mode === "vide") {
  const avant = await compter();
  // Les enfants d'abord : on ne dépend d'aucune cascade, et rien ne reste
  // orphelin si une suppression s'arrête en chemin.
  const supprime = {};
  supprime.contributions = (await p.queteContribution.deleteMany({})).count;
  supprime.quetes = (await p.quete.deleteMany({})).count;
  supprime.messages = (await p.requestMessage.deleteMany({})).count;
  supprime.offres = (await p.offreVente.deleteMany({})).count;
  supprime.demandes = (await p.bankRequest.deleteMany({})).count;
  // Seulement les notifications qui menaient à ce qu'on vient d'effacer : une
  // notification de candidature ou de world boss n'a rien à voir avec ça.
  supprime.notifications = (await p.notification.deleteMany({
    where: { type: { in: ["QUETE", "DEMANDE", "MESSAGE", "VENTE"] } },
  })).count;
  console.log(JSON.stringify({ avant, supprime, apres: await compter() }, null, 1));
}

if (!["compte", "sauve", "vide"].includes(mode)) {
  console.error("Usage : compte | sauve <fichier> | vide");
  process.exit(1);
}

await p.$disconnect();
