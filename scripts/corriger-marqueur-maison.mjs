/**
 * LE MARQUEUR « CONTENU AIRBORN » DES MONSTRES — vérifié, corrigé, et rendu rejouable.
 *
 * POURQUOI CE SCRIPT EXISTE. Maxime : « estime déjà que si un monstre à plusieurs barres
 * c'est qu'il fait partie d'Airborn, faut juste vérifier et corriger avec les données ».
 * Son intuition était juste, et elle a révélé que le marqueur `maison` de
 * public/wiki/monstres.json est INCOMPLET : sur les 94 monstres à plusieurs vies, 73
 * étaient marqués et 21 ne l'étaient pas.
 *
 * ┌──────── CE QUI REND CE SCRIPT NÉCESSAIRE, ET PAS SEULEMENT UTILE ────────┐
 * │ Le critère d'origine n'est PAS reproductible : monstres.json a été       │
 * │ généré le 2026-08-11 et AUCUN script versionné ne fabrique son champ     │
 * │ `maison`. Le générateur est perdu. On ne peut donc pas corriger la cause │
 * │ — seulement poser un critère écrit, et le rejouer.                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * LA RÈGLE APPLIQUÉE : `vies > 1` implique du contenu Airborn.
 *
 * ELLE N'EST PAS CRUE SUR PAROLE, elle est corroborée par les identifiants du client
 * eux-mêmes. Les préfixes des 94 monstres à plusieurs vies sont :
 *   FASHION×16, CHAMBER×9, ICE×9, MNSTR×7, CHAMBRE×7, DONJON×7, ARCANIQUE×6,
 *   GARDEN×6, ANNIV×6, SHOGUN×4 …
 * Tous désignent du contenu ajouté — les Chambres Secrètes, le système de mode, le
 * Paradis Arcanique, les événements d'anniversaire. Et DEUX SONT DES MOTS FRANÇAIS,
 * `CHAMBRE` et `DONJON` : le client de base est écrit par des Coréens avec des
 * identifiants anglais, donc un identifiant français ne peut être qu'un ajout du
 * serveur. Aucune barre de vie multiple ne vient du Flyff d'origine.
 *
 * CE QUE LA RÈGLE NE DIT PAS, et qu'il faut savoir : la réciproque est FAUSSE. 162
 * monstres à une seule vie sont marqués maison — Airborn a ajouté beaucoup de contenu
 * ordinaire. On ne peut donc PAS déduire l'origine de l'absence de plusieurs vies, et ce
 * script n'enlève JAMAIS un marqueur : il n'en ajoute que.
 *
 * Rejouable : node scripts/corriger-marqueur-maison.mjs
 */
import fs from "node:fs";

const CHEMIN = "public/wiki/monstres.json";
const brut = JSON.parse(fs.readFileSync(CHEMIN, "utf8"));
const liste = Array.isArray(brut) ? brut : (brut.monstres ?? []);

const plusieursVies = (m) => (m.vies ?? 1) > 1;

const ajoutes = [];
for (const m of liste) {
  if (plusieursVies(m) && !m.maison) {
    m.maison = true;
    ajoutes.push({ id: m.id, nom: m.nom, vies: m.vies, niv: m.niv });
  }
}

/* Les compteurs de l'en-tête doivent suivre, sinon la page afficherait « 235 ajoutés par
   Airborn » au-dessus d'un catalogue qui en contient 256 — exactement le genre d'écart
   entre un compteur et sa liste qui a déjà été corrigé ailleurs sur ce site. */
const maison = liste.filter((m) => m.maison).length;
const vies = liste.filter(plusieursVies).length;
if (brut.compteurs) {
  brut.compteurs.maison = maison;
  brut.compteurs.vies = vies;
}

/* La règle est écrite DANS le fichier : le prochain qui l'ouvre doit pouvoir savoir
   pourquoi ce champ vaut ce qu'il vaut, sans relire ce script. */
brut.marqueurMaison = {
  regle: "maison = maison d'origine OU vies > 1",
  pourquoi:
    "Un monstre à plusieurs barres de vie est du contenu Airborn : les 94 concernés portent des préfixes d'identifiant qui le disent tous (FASHION, CHAMBER, CHAMBRE, DONJON, ARCANIQUE, ANNIV, SHOGUN…), et deux de ces préfixes sont des mots FRANÇAIS — impossible dans un client de base écrit en anglais.",
  reciproqueFausse:
    "162 monstres à une seule vie sont marqués maison : Airborn a ajouté beaucoup de contenu ordinaire. On ne déduit donc jamais l'origine de l'ABSENCE de plusieurs vies, et ce script n'enlève aucun marqueur.",
  critereOriginePerdu:
    "monstres.json a été généré le 2026-08-11 sans script versionné : le critère qui a posé les 235 premiers marqueurs n'est pas reproductible. Celui-ci l'est.",
  ajoutesParCetteRegle: ajoutes.length,
};

fs.writeFileSync(CHEMIN, JSON.stringify(brut, null, 1));

console.log(`monstres : ${liste.length}`);
console.log(`a plusieurs vies : ${vies}`);
console.log(`marques Airborn : ${maison}  (${ajoutes.length} ajoutes par cette regle)`);
if (ajoutes.length) {
  console.log("\najoutes :");
  for (const a of ajoutes) console.log(`   ${String(a.vies).padStart(2)} vies · niv ${String(a.niv).padStart(3)} · ${a.nom}`);
}
