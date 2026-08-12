import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import { PageHeader } from "@/components/PageHeader";
import { Etabli } from "@/components/crafts/Etabli";

/**
 * CE QU'ON DÉCROCHE À LA LONGUE — les crafts ET les collections.
 *
 * LES CRAFTS étaient la demande la plus ancienne de Maxime. Le site savait
 * nommer 13 000 objets sans jamais dire comment on en fabrique un. Les recettes
 * AirFlyff avaient été déclarées « côté serveur » lors d'une passe précédente :
 * c'est faux pour une bonne moitié d'entre elles, et la conclusion a coûté des
 * mois d'attente. Elles sont dans le client, à deux endroits qu'on ne regardait
 * pas — le fichier d'échange des PNJ pour les quantités et les statuts, les
 * descriptions françaises des ingrédients pour l'arbre du farm.
 *
 * LES COLLECTIONS avaient leur propre page, /collections : titres d'honneur,
 * succès, anges, maîtrise d'arme, carnets de cartes, karma PK. Deux adresses
 * pour une seule question — « qu'est-ce que je peux viser, et qu'est-ce que ça
 * demande » —, alors que fabriquer et collectionner sont les deux faces du même
 * jeu de longue haleine. Elles sont réunies ici, en deux familles dans un seul
 * rail ; /collections redirige.
 *
 * Réservée à la guilde, pour la même raison que /astuces-guilde : la page dit
 * quelles recettes sont ÉTEINTES, c'est-à-dire pour lesquelles la concurrence
 * farme dans le vide.
 *
 * La page est un composant serveur ; tout l'écran vit dans <Etabli />, qui va
 * chercher les crafts sur /api/crafts (gardée par apiGuild) et les collections
 * sur /wiki/collections.json. Le relevé ne part donc pas dans un fichier JS
 * statique servi à qui connaît l'adresse.
 */
export const metadata: Metadata = {
  title: "Crafts et collections — Vanguard",
  // Les six systèmes des collections sont NOMMÉS, comme le faisait la description
  // de /collections avant la fusion : les carnets de cartes et le karma PK y
  // étaient et n'avaient aucune raison d'en tomber.
  description: "Ce qu’on fabrique et ce qu’on collectionne : les recettes d’échange, l’arbre du farm, les titres d’honneur, les succès, les anges, la maîtrise d’arme, les carnets de cartes et le karma PK — relevés dans le client d’AirFlyff.",
  // Réservée : ni dans un moteur de recherche, ni résumée dans un aperçu de lien
  // collé sur un Discord public.
  robots: { index: false, follow: false },
};

type Chiffres = {
  recettes: number; arbres: number; titres: number;
  succes: number; anges: number; maitrises: number; poudres: number;
};

/** `undefined` = pas encore lu, `null` = illisible. Le nul est un résultat : on
 *  ne relit pas le disque à chaque rendu pour retrouver la même absence. */
let CACHE: Chiffres | null | undefined;

/**
 * LES CHIFFRES DE L'EN-TÊTE, LUS SUR LES DEUX RELEVÉS.
 *
 * Ils étaient écrits à la main dans le sous-titre (« 834 échanges de PNJ, 39
 * arbres ») : un compteur en dur devient faux au prochain versement, et c'est
 * exactement ce qu'on ne peut pas se permettre sur une page dont l'intérêt est
 * d'être juste. On les compte donc sur les fichiers, une fois par processus.
 *
 * Le relevé des crafts pèse 283 Ko : il est lu ici pour ses LONGUEURS
 * seulement — le contenu, lui, passe par /api/crafts, qui garde son propre
 * cache. Et si un fichier manque, l'en-tête se contente d'une phrase : l'écran
 * sait déjà dire que le relevé n'a pas pu être chargé, la page ne doit pas
 * tomber pour autant.
 */
function chiffres(): Chiffres | null {
  if (CACHE !== undefined) return CACHE;
  try {
    const lire = <T,>(f: string): T =>
      JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "wiki", f), "utf8")) as T;

    const c = lire<{ recettes: unknown[]; arbres: unknown[] }>("crafts.json");
    const k = lire<{
      titres: unknown[]; nbSucces: number;
      anges: { montable: boolean; cumul: number }[];
      maitrise: { armes: unknown[] };
    }>("collections.json");

    CACHE = {
      recettes: c.recettes.length,
      arbres: c.arbres.length,
      titres: k.titres.length,
      succes: k.nbSucces,
      anges: k.anges.length,
      maitrises: k.maitrise.armes.length,
      // Le coût d'un ange menté du niveau 1 au dernier : le chiffre qui dit
      // à lui seul ce que « à la longue » veut dire.
      poudres: k.anges.find((a) => a.montable)?.cumul ?? 0,
    };
  } catch {
    CACHE = null;
  }
  return CACHE;
}

const fr = (n: number) => n.toLocaleString("fr-FR");

export default function CraftsPage() {
  const n = chiffres();
  // La provenance est DANS le sous-titre, pas dans la colonne de droite du
  // PageHeader : cette colonne partage la largeur avec le sous-titre, et sur un
  // téléphone une phrase de deux lignes s'y étirait à un mot par ligne. L'en-tête
  // grandissait alors assez pour découvrir le logo de l'éditeur et la barre de
  // chargement incrustés dans le bas de l'artwork, que le recadrage doit cacher.
  const sous = n
    ? `${fr(n.recettes)} échanges de PNJ, ${n.arbres} arbres de craft maison, ${n.titres} titres, ${fr(n.succes)} succès, ${n.anges} anges, ${n.maitrises} maîtrises d’arme — et ${fr(n.poudres)} poudres féeriques pour monter un seul ange au bout. Relevé sur le client d’octobre 2025 ; chaque volet porte sa source.`
    : "Ce qu’on fabrique et ce qu’on collectionne, relevé sur le client d’octobre 2025.";

  return (
    <div style={{ padding: "24px 32px 56px", maxWidth: 1300, margin: "0 auto" }}>
      {/* Un coffre ouvert et des pièces étalées : la matière première d'un craft,
          et ce qu'on finit par décrocher. */}
      <div className="cr-tete">
        <PageHeader art="/jeu/chargement/maploading_ibless.webp" icon="hammer" title="Crafts et collections"
          subtitle={sous} />
      </div>
      <Etabli />
      {/* LE LOGO DE L'ÉDITEUR NE DOIT PAS APPARAÎTRE. Les 35 écrans de chargement
          du client portent « Flyff », une barre de progression et le copyright
          incrustés dans leur tiers bas ; .vg-pagehead-art les recadre en comptant
          sur un en-tête LARGE et BAS. Sur un téléphone, l'en-tête est presque
          aussi haut que large : le recadrage n'a plus de marge et la bande
          remonte dans l'image. On agrandit donc l'artwork à cette largeur-là — le
          conteneur est en overflow:hidden, ce qui rend le rognage au recadrage.
          Réglé ici et pas dans globals.css : la règle globale sert d'autres pages,
          elle ne se change pas depuis un lot. */}
      <style>{`@media(max-width:760px){.cr-tete .vg-pagehead-art{transform:scale(1.7)}}`}</style>
    </div>
  );
}
