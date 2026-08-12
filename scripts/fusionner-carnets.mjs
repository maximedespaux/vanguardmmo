/**
 * FUSION DES CARNETS DES ARCANES — le carnet fait main de Maxime, plus les
 * illustrations du client.
 *
 * POURQUOI CE SCRIPT EXISTE. Deux relevés décrivaient les mêmes quinze carnets, et une
 * passe précédente a choisi le mauvais : elle a écarté le carnet fait main en jugeant
 * que « le builder leur prête des bonus très pauvres », et affiché à la place la clé
 * non traduite du client (`TID_DECK_ARCANE_4`) faute de nom français — alors que les
 * noms français existaient, écrits à la main.
 *
 * CE QUE CHAQUE SOURCE APPORTE, mesuré et non suppose :
 *   Le carnet fait main (public/airbuilder/data.json → CARNETS)
 *     · les NOMS français des 15 carnets .......... le client en a ZÉRO
 *     · la rareté, la couleur, le palier, les copies, la difficulté
 *     · la quantité et la rareté de chacune des 63 cartes
 *   Le relevé du client (public/wiki/collections.json → decks)
 *     · 59 ILLUSTRATIONS de carte ................. le carnet fait main en a zéro
 *     · le bonus ÉVEILLÉ de chaque carnet
 *     · le sujet et le niveau de chaque carte
 *     · des libellés de bonus plus précis (« Vitesse de déplacement % » là où le
 *       carnet fait main écrit « Vitesse »)
 *
 * LA CLÉ DE JONCTION, ET C'EST TOUT L'ENJEU. On ne joint PAS par l'index : les deux
 * numérotations diffèrent. Vérifié carnet par carnet — les carnets 1 à 4 coïncident,
 * puis le carnet 5 du fait-main (« Recherche de Gloire ») occupe la position 15 chez le
 * client, et les carnets 6 à 15 du fait-main correspondent aux 5 à 14 du client. Une
 * jonction par index aurait donc attribué les illustrations du mauvais carnet à onze
 * des quinze — et rien ne l'aurait signalé.
 *
 * On joint donc par la SIGNATURE DES CARTES : la liste des noms de cartes d'un carnet.
 * Elle est identique dans les deux relevés (63 cartes de part et d'autre) et elle est
 * unique. Si une signature ne se retrouve pas, le script REFUSE de deviner et le dit.
 *
 * Regénérable : node scripts/fusionner-carnets.mjs
 */
import fs from "node:fs";

const lire = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const main = lire("public/airbuilder/data.json").CARNETS ?? [];
const client = lire("public/wiki/collections.json").decks ?? [];

/** Le nom d'une carte, normalisé : les deux relevés écrivent « Carte X », mais l'un
 *  double parfois le mot (« Carte Carte Bob »), et les accents varient. */
const clef = (s) =>
  String(s ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/\bcarte\b/g, "").replace(/[^a-z0-9]/g, "");

const signature = (cartes) => (cartes ?? []).map((c) => clef(c.nom ?? c.n)).sort().join("|");

const parSignature = new Map();
for (const d of client) parSignature.set(signature(d.cartes), d);

const fusionnes = [];
const orphelins = [];

for (const [i, m] of main.entries()) {
  const sig = signature(m.cartes);
  const c = parSignature.get(sig);
  if (!c) { orphelins.push({ rang: i + 1, nom: m.nom, pourquoi: "aucun carnet du client ne porte les mêmes cartes" }); continue; }

  // Les cartes, appariées par nom : la quantité et la rareté viennent du fait-main,
  // l'illustration et le sujet du client. Une carte sans illustration reste dans la
  // liste — c'est une carte qui existe, seule son image manque.
  const artParClef = new Map((c.cartes ?? []).map((x) => [clef(x.n ?? x.nom), x]));
  const cartes = (m.cartes ?? []).map((x) => {
    const k = clef(x.nom ?? x.n);
    const cc = artParClef.get(k);
    return {
      nom: x.nom ?? x.n,
      rarete: x.rarete ?? null,
      quantite: x.qte ?? null,
      art: cc?.art ?? null,
      sujet: cc?.sujet ?? null,
      niveau: cc?.niv ?? null,
    };
  });

  fusionnes.push({
    // Le rang du fait-main est celui qu'on AFFICHE : c'est l'ordre des étuis tel que
    // Maxime l'a établi. L'identifiant du client est conservé à côté, parce que c'est
    // lui qui relie au jeu.
    rang: i + 1,
    idClient: c.id ?? null,
    nom: m.nom ?? null,
    etui: m.etui ?? c.etui ?? null,
    rarete: m.rarete ?? null,
    couleur: m.col ?? null,
    palier: m.tier ?? null,
    copies: m.copies ?? null,
    difficulte: m.diff ?? null,
    complet: m.complet ?? null,
    /* LES VALEURS VIENNENT DU FAIT-MAIN, les libellés du client quand il en a un plus
       précis pour la même valeur. Les deux relevés donnent les mêmes NOMBRES sur les
       quinze carnets — ce qui a été verifié — donc il n'y a pas de conflit à arbitrer,
       seulement un vocabulaire à choisir, et « Vitesse de déplacement % » dit mieux que
       « Vitesse » ce que le bonus fait. */
    bonus: (m.base ?? []).map(([label, valeur], j) => {
      const cb = (c.bonus ?? [])[j];
      const memeValeur = cb && cb[1] === valeur;
      return { label: memeValeur ? cb[0] : label, valeur, labelFaitMain: label };
    }),
    eveille: c.eveille ?? [],
    cartes,
  });
}

const sortie = {
  genere: "fusion du carnet des arcanes fait main et du relevé du client",
  sources: {
    faitMain: "public/airbuilder/data.json → CARNETS (noms, raretés, quantités)",
    client: "public/wiki/collections.json → decks (illustrations, bonus éveillé, sujets)",
  },
  jonction: "par la signature des cartes, PAS par l'index : les deux numérotations diffèrent (le carnet 5 du fait-main est le 15e du client)",
  carnets: fusionnes.length,
  cartes: fusionnes.reduce((s, d) => s + d.cartes.length, 0),
  illustrations: fusionnes.reduce((s, d) => s + d.cartes.filter((c) => c.art).length, 0),
  orphelins,
  liste: fusionnes,
};

fs.writeFileSync("src/data/carnets-arcanes.json", JSON.stringify(sortie, null, 1));
console.log(`carnets fusionnés : ${sortie.carnets}/${main.length}`);
console.log(`cartes : ${sortie.cartes} · illustrations retrouvées : ${sortie.illustrations}`);
console.log(`orphelins : ${orphelins.length}${orphelins.length ? " → " + JSON.stringify(orphelins) : ""}`);
console.log(`noms français conservés : ${fusionnes.filter((d) => d.nom).length}`);
