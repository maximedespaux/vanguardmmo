import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import { PageHeader } from "@/components/PageHeader";
import { BandeauVitrine } from "@/components/BandeauVitrine";
import { Etabli } from "@/components/crafts/Etabli";
import { etatVisiteur } from "@/lib/vitrine";

/**
 * CE QU'ON DÉCROCHE À LA LONGUE — les crafts ET les collections.
 *
 * LES CRAFTS étaient la demande la plus ancienne de Maxime. Le site savait
 * nommer 13 000 objets sans jamais dire comment on en fabrique un. Les recettes
 * Airborn avaient été déclarées « côté serveur » lors d'une passe précédente :
 * c'est faux pour une bonne moitié d'entre elles, et la conclusion a coûté des
 * mois d'attente. Elles sont dans le client, à deux endroits qu'on ne regardait
 * pas — le fichier d'échange des PNJ pour les quantités et les statuts, les
 * descriptions françaises des ingrédients pour l'arbre du farm.
 *
 * LES COLLECTIONS avaient leur propre page, /collections : titres d'honneur,
 * succès, carnets de cartes, karma PK. Deux adresses
 * pour une seule question — « qu'est-ce que je peux viser, et qu'est-ce que ça
 * demande » —, alors que fabriquer et collectionner sont les deux faces du même
 * jeu de longue haleine. Elles sont réunies ici, en deux familles dans un seul
 * rail ; /collections redirige.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 *  ELLE EST PASSÉE EN VITRINE, ET LA LIGNE DE COUPE PASSE AU MILIEU D'ELLE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Demande de Maxime : « avoir l'espace boutique en visualisation publique pour
 * attirer et donner envie, pareil pour astuces et fonctionnalité mais inutilisable
 * sans connexion ». Cette page était le dernier mur de l'espace Astuces avec
 * /objets et /worldboss.
 *
 * ELLE ÉTAIT FERMÉE POUR UNE RAISON D'ÉDITION, et cette raison ne couvre pas toute
 * la page. Le relevé dit quelles recettes sont ÉTEINTES — commentées dans le client,
 * donc infaisables par qui que ce soit. C'est le seul endroit du site qui le dise, et
 * une guilde rivale qui lit cette colonne s'épargne des semaines de farm dans le
 * vide : on continue donc à ne pas la SERVIR à un visiteur.
 *
 * ATTENTION, ET C'EST À DIRE SANS DÉTOUR : CE N'EST PAS UN SECRET GARDÉ. Le relevé
 * des crafts vit dans `public/wiki/crafts.json` — 283 Ko, statique, servi par Next à
 * qui connaît l'adresse, ses 130 lignes « éteintes » comprises. Exactement comme
 * `public/wiki/collections.json`. Les DEUX moitiés de cette page sont donc
 * téléchargeables sans compte depuis toujours, et ni le garde de page ni celui
 * de /api/crafts n'y ont jamais rien changé : le commentaire de tête de
 * src/app/api/crafts/route.ts le dit déjà en toutes lettres. Ce que le verrou fait
 * vraiment, c'est empêcher qu'on serve la donnée en clair DANS L'INTERFACE, sans plus.
 * Si Maxime veut que la colonne des recettes éteintes soit réellement hors de portée,
 * il faut sortir crafts.json de public/ (le lire depuis un dossier privé dans
 * /api/crafts et dans la fonction chiffres() ci-dessous) — c'est un autre lot, et
 * personne ne doit croire que celui-ci l'a fait.
 *
 * MAIS L'AUTRE MOITIÉ DE LA PAGE N'A JAMAIS RIEN CACHÉ, et là c'est un choix
 * d'édition assumé. Titres d'honneur, succès, carnets de cartes, karma PK : le jeu
 * les affiche dans sa propre fenêtre de collection, à tout
 * le monde, sans rien demander. Les fermer ne protégeait rien — ça privait juste un
 * joueur de passage de la seule page du site qui les rassemble. Et la coupe existait
 * DÉJÀ dans le chargement, sans qu'on l'ait voulue : les crafts passent par
 * /api/crafts, les collections par un fetch direct du fichier statique. Le garde de
 * page fermait donc une porte dont personne ne surveillait la fenêtre.
 *
 * D'OÙ CETTE PAGE : elle rend pour tout le monde, montre le rail entier — ses douze
 * volets, leurs titres, leurs comptes — laisse LIRE les collections, et neutralise
 * les six volets de crafts pour qui n'est pas membre. Le visiteur voit qu'il y a
 * quelque chose, et pourquoi il ne l'a pas.
 *
 * AUCUNE ROUTE /api N'A ÉTÉ OUVERTE À UN VISITEUR. /api/crafts se garde par
 * apiEspace("astuces") depuis le 2026-10-21 — la guilde, et les amis à qui le rôle
 * Friend ouvre Astuces (SPEC-INFORMATION-GUILDE §9) : le refus n'est pas décoratif,
 * c'est le serveur qui le prononce. La page se contente de ne
 * plus DEMANDER quand elle sait que la réponse sera non — un 403 par volet dans la
 * console d'un visiteur n'informe personne et ressemble à une panne.
 *
 * La page est un composant serveur ; tout l'écran vit dans <Etabli />.
 */
export const metadata: Metadata = {
  title: "Crafts et collections — GENESIS",
  /* La description mène par ce qui est OUVERT. Elle promettait « les recettes
     d'échange » en premier : sur un aperçu de lien collé dans un Discord public,
     c'était appâter avec la moitié fermée. Les collections sont nommées — comme le
     faisait /collections avant la fusion — et les recettes sont annoncées pour ce
     qu'elles sont.
     ELLES ÉTAIENT SIX, ELLES SONT QUATRE : la maîtrise d'arme et les anges sont
     partis sur /mecaniques, ce sont des mécaniques de build. Les promettre
     ici enverrait chercher sur cette page ce qui n'y est plus. */
  description: "Ce qu’on collectionne dans Airborn, relevé dans le client : les titres d’honneur, les succès, les carnets de cartes et le karma PK. Les recettes d’échange et l’arbre du farm sont réservés aux membres de GENESIS.",
  /* LE noindex EST TOMBÉ, et c'est réfléchi. Il protégeait deux choses : le
     référencement d'une page réservée, et l'aperçu d'un lien collé en public. Les
     deux motifs ont disparu avec le mur — et surtout, la moitié réservée n'est PAS
     dans le HTML : les recettes arrivent par /api/crafts, côté navigateur, après
     une vérification de session. Un moteur de recherche n'en verra jamais une
     ligne. Ce qu'il indexe, c'est l'invitation. */
};

type Chiffres = {
  recettes: number; arbres: number; titres: number;
  succes: number; cartes: number; karma: number;
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
    /* Ni `anges` ni `maitrise` ne sont lus ici : ces deux mécaniques ont quitté la
       page pour /mecaniques. Les compter encore ferait annoncer par
       l'en-tête un contenu que le rail ne porte plus. */
    const k = lire<{
      titres: unknown[]; nbSucces: number;
      decks: unknown[]; karma: unknown[];
    }>("collections.json");

    CACHE = {
      recettes: c.recettes.length,
      arbres: c.arbres.length,
      titres: k.titres.length,
      succes: k.nbSucces,
      cartes: k.decks.length,
      karma: k.karma.length,
    };
  } catch {
    CACHE = null;
  }
  return CACHE;
}

const fr = (n: number) => n.toLocaleString("fr-FR");

export default async function CraftsPage() {
  /* L'état SANS rediriger — c'est toute la différence avec requireGuild(), que le
     layout de (guild) appelait quand la page y vivait. Voir src/lib/vitrine.ts. */
  /* L'espace de la page : un ami à qui le rôle Friend ouvre Astuces y agit comme un membre
     (SPEC-INFORMATION-GUILDE §9) — /api/crafts le lui sert par la même décision. */
  const etat = await etatVisiteur("astuces");
  const n = chiffres();
  // La provenance est DANS le sous-titre, pas dans la colonne de droite du
  // PageHeader : cette colonne partage la largeur avec le sous-titre, et sur un
  // téléphone une phrase de deux lignes s'y étirait à un mot par ligne. L'en-tête
  // grandissait alors assez pour découvrir le logo de l'éditeur et la barre de
  // chargement incrustés dans le bas de l'artwork, que le recadrage doit cacher.
  const sous = n
    ? `${fr(n.recettes)} échanges de PNJ, ${n.arbres} arbres de craft maison, ${n.titres} titres, ${fr(n.succes)} succès, ${n.cartes} carnets de cartes et ${n.karma} grades de karma. Relevé sur le client d’octobre 2025 ; chaque volet porte sa source.`
    : "Ce qu’on fabrique et ce qu’on collectionne, relevé sur le client d’octobre 2025.";

  return (
    <div style={{ padding: "24px 32px 56px", maxWidth: 1300, margin: "0 auto" }}>
      {/* Un coffre ouvert et des pièces étalées : la matière première d'un craft,
          et ce qu'on finit par décrocher. */}
      <div className="cr-tete">
        <PageHeader art="/jeu/chargement/maploading_ibless.webp" icon="hammer" title="Crafts et collections"
          subtitle={sous} />
      </div>
      {/* Le bandeau ne se rend QUE pour qui ne peut pas agir — un membre ne le voit
          pas exister. Il est posé APRÈS l'en-tête : les comptes du sous-titre sont
          l'invitation, et c'est eux qu'on lit d'abord. Le bandeau explique ensuite ce
          qui manque pour ouvrir la moitié fermée. */}
      <BandeauVitrine etat={etat} quoi="le relevé du client d’Airborn" action="ouvrir les recettes et l’arbre du farm" />
      <Etabli etat={etat} />
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
