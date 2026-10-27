"use client";
import ICONES from "@/data/icones-objets.json";
import dungeonsData from "@/data/dungeons.json";
import { Icon, type IconName } from "@/components/Icon";
import { NomObjet } from "@/components/objets/NomObjet";

/**
 * LES BRIQUES DES DEUX GUIDES — /astuces et /prestige.
 *
 * Ces deux pages voisines redessinaient les mêmes trois choses chacune de son côté :
 * la barre à une seule teinte, l'icône d'une ressource de prestige, et la pastille du
 * cadenas. Trois copies qui divergeaient déjà — la barre de Fashion.tsx et celle de
 * prestige/page.tsx n'avaient pas le même plancher. Une brique, une règle.
 */

export const fr = (n: number) => n.toLocaleString("fr-FR");

/** 1 300 000 se compare mal ; « 1,3 M » se lit d'un coup d'œil. */
export function court(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  if (n >= 1e3) return `${Math.round(n / 1e3).toLocaleString("fr-FR")} k`;
  return fr(n);
}

/**
 * UNE BARRE. Deux règles, vérifiées, et les mêmes partout sur le site :
 *
 *  · UNE SEULE teinte, celle que le chiffre voisin emploie déjà. C'est la LONGUEUR qui
 *    porte la grandeur. Colorer par valeur ne marche pas : le vert et le doré de la
 *    charte ne se distinguent pas pour un daltonien protan (écart mesuré 5,8 de deltaE).
 *  · Plancher à 1,5 %. Sans lui une valeur minuscule perd sa barre, et une barre absente
 *    se lit comme une donnée manquante et non comme un petit nombre. Le zéro, lui, ne
 *    reçoit rien : là, l'absence EST la donnée.
 *
 * Tout est en style en ligne, sans classe : la brique se pose dans n'importe quelle
 * page sans lui demander d'accueillir une règle CSS de plus.
 */
export function Barre({ part, teinte = "var(--gold)", hauteur = 5 }: { part: number; teinte?: string; hauteur?: number }) {
  if (!(part > 0)) return null;
  return (
    <span aria-hidden="true" style={{
      display: "block", width: "100%", height: hauteur, borderRadius: 3, overflow: "hidden",
      background: "color-mix(in srgb, var(--border) 70%, transparent)",
    }}>
      <span style={{
        display: "block", height: "100%", borderRadius: 3, background: teinte,
        width: `${Math.max(1.5, Math.min(100, part * 100))}%`,
      }} />
    </span>
  );
}

/**
 * LES NEUF RESSOURCES DE PRESTIGE ET LEUR VRAIE ICÔNE DU JEU.
 *
 * La page de prestige dessinait ces neuf icônes en SVG — médailles, orbes, bouclier —
 * avec une machinerie qui préchargeait un PNG au même nom et basculait dessus s'il
 * existait. Les neuf PNG existent tous depuis, dans public/assets/items/prestige/ :
 * la machinerie et ses quatre-vingts lignes de SVG ne servaient plus qu'à retarder
 * d'un tour de rendu des images déjà présentes. Ce sont les icônes du client, en
 * 32x32, celles que le joueur a dans son inventaire.
 *
 * Une clé absente ne rend RIEN plutôt qu'une image cassée : si un palier réclame un
 * jour une ressource nouvelle, son nom s'affichera seul, ce qui est lisible.
 */
export const ICONE_RESSOURCE: Record<string, string> = {
  "Badge Jardin Prestigieux": "/assets/items/prestige/badge-jardin-prestigieux.png",
  "Nucléus neutre": "/assets/items/prestige/nucleus-neutre.png",
  "Emblème de protection": "/assets/items/prestige/embleme-de-protection.png",
  "Badge de la Tour": "/assets/items/prestige/badge-de-la-tour.png",
  "Périn": "/assets/items/prestige/perin.gif",
  "Nucléus parfait": "/assets/items/prestige/nucleus-parfait.png",
  "Badge World Boss prestigieux": "/assets/items/prestige/badge-world-boss-prestigieux.png",
  "Badge de donjon mineur": "/assets/items/prestige/badge-de-donjon-mineur.png",
  "Badge Donjon": "/assets/items/prestige/badge-donjon.png",
};

/** Un nucléus parfait s'échange contre le nucléus élémentaire qu'on veut : les cinq. */
export const NUCLEUS_ELEMENTS: [string, string][] = [
  ["Feu", "/assets/items/prestige/nucleus-feu.png"],
  ["Eau", "/assets/items/prestige/nucleus-eau.png"],
  ["Foudre", "/assets/items/prestige/nucleus-foudre.png"],
  ["Vent", "/assets/items/prestige/nucleus-vent.png"],
  ["Terre", "/assets/items/prestige/nucleus-terre.png"],
];

/**
 * L'icône d'une ressource. `alt` par défaut le NOM : quand l'icône remplace le mot,
 * elle porte l'information et doit s'annoncer. Passer `alt=""` là où le nom est écrit
 * juste à côté, sinon un lecteur d'écran lit deux fois la même chose.
 */
export function IconeRessource({ nom, taille = 22, alt }: { nom: string; taille?: number; alt?: string }) {
  const src = ICONE_RESSOURCE[nom];
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? nom} title={nom} width={taille} height={taille}
      style={{ objectFit: "contain", display: "inline-block", verticalAlign: "middle", flexShrink: 0 }} />
  );
}

/**
 * Le mot-clé qui retrouve la ressource dans le catalogue d'objets.
 *
 * Pourquoi une table et pas le nom affiché : le client n'écrit pas ces noms comme le
 * wiki de prestige. Le badge s'y appelle « Badge du Jardin Préstigieux » — avec un
 * « du » et un accent — et celui de world boss « Badge Worldboss Préstigieux », en un
 * mot. Un lien bâti sur le nom affiché tombait sur zéro résultat, ce qui est PIRE
 * qu'une absence de lien : ça laisse croire que l'objet n'existe pas.
 *
 * Les neuf valeurs ont été rejouées une à une contre /api/objets. Une seule ne tenait
 * pas : « jardin prestigieux » ramenait d'abord le TICKET d'instance. Le mot-clé porte
 * donc le mot « badge », et le badge revient seul.
 */
export const RECHERCHE_OBJET: Record<string, string> = {
  "Badge Jardin Prestigieux": "badge du jardin",
  "Nucléus neutre": "nucleus neutre",
  "Emblème de protection": "embleme de protection",
  "Badge de la Tour": "badge de la tour",
  "Périn": "perin",
  "Nucléus parfait": "nucleus parfait",
  "Badge World Boss prestigieux": "worldboss",
  "Badge de donjon mineur": "badge de donjon mineur",
  "Badge Donjon": "badge des donjons",
};

/** Un objet du jeu, avec son icône quand le croisement la connaît (src/data/icones-objets.json). */
export function Objet({ nom, texte, taille = 17 }: { nom: string; texte?: string; taille?: number }) {
  const src = (ICONES as Record<string, string>)[nom];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={taille} height={taille} style={{ objectFit: "contain", flexShrink: 0 }} />
      )}
      {texte ?? nom}
    </span>
  );
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 *  UN OBJET NOMMÉ MÈNE À SA FICHE, À SA PROVENANCE, ET À LA REQUÊTE.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `Objet` juste au-dessus pose une icône et un mot, et s'arrête là : le guide nommait
 * quatorze objets sans qu'aucun ne mène nulle part. `NomObjet`
 * (components/objets/NomObjet.tsx) fait les trois choses qui manquaient — la fiche du
 * catalogue, « d'où ça vient », et « je le veux » déposé dans la boutique. On ne le
 * redessine donc pas : on l'appelle.
 *
 * MAIS PAS SUR N'IMPORTE QUEL NOM, et c'est tout l'objet de cette brique.
 * `NomObjet` se sert du nom AFFICHÉ pour chercher dans le catalogue. Or le client
 * n'écrit pas ces noms comme le wiki de prestige : le badge du Jardin s'y appelle
 * « Badge du Jardin Préstigieux » — avec un « du » et un accent de trop — et celui des
 * donjons « Badge des donjons ». Un lien bâti sur notre orthographe tombe alors sur ZÉRO
 * résultat, ce qui est PIRE que pas de lien : ça laisse croire que l'objet n'existe pas.
 * (Le même piège est documenté sur `RECHERCHE_OBJET`, quelques lignes plus haut.)
 *
 * Les douze noms cités par les deux guides ont donc été rejoués un par un contre
 * /api/objets. HUIT répondent, QUATRE non — « Badge Jardin Prestigieux », « Badge World
 * Boss prestigieux », « Badge Donjon » et « Perles niv 3 » ramènent zéro résultat. Ces
 * quatre gardent l'icône et le mot, sans lien mort. Ce qui les débloquerait est une prop
 * `recherche` sur `NomObjet`, qui séparerait le mot AFFICHÉ du mot CHERCHÉ ; le fichier
 * n'appartient pas à cette passe, la demande est portée au compte rendu.
 *
 * La fiche du catalogue vit dans le groupe (guild) : sur ces deux pages PUBLIQUES, le
 * cadenas « membres » doit être annoncé une fois près de la liste — pas quatorze fois
 * au fil du texte (voir la légende des priorités de /astuces).
 */
const NOM_RESOLU = new Set([
  "Jeton d'Air",
  "Badge de la Tour",
  "Badge de donjon mineur",
  "Marteau Runique Yggdrasil",
  "Nucléus parfait",
  "Nucléus neutre",
  "Emblème de protection",
  "Périn",
]);

/**
 * Un objet du jeu, cliquable quand le catalogue sait le retrouver.
 *
 * L'icône est cherchée dans les deux tables du site — `icones-objets.json` pour les
 * objets cités par le guide, `ICONE_RESSOURCE` pour les neuf ressources de prestige —
 * parce qu'aucune des deux ne couvre l'autre : le nucléus parfait n'est que dans la
 * seconde, le marteau Yggdrasil que dans la première.
 *
 * À NE PAS POSER DANS UNE `Bulle` : l'ancre d'une bulle est un `<button>`, et un bouton
 * dans un bouton est du HTML invalide que le navigateur défait à sa façon.
 *
 * `avecIcone={false}` sert la moitié des cas de ces deux pages : la ligne porte DÉJÀ
 * l'icône de l'objet, en grand, dans sa colonne de gauche. La reposer à 17 px trois mots
 * plus loin ne renseigne personne et fait bégayer la ligne.
 */
export function ObjetLie({ nom, taille = 17, avecIcone = true }: {
  nom: string;
  taille?: number;
  avecIcone?: boolean;
}) {
  const icone = (ICONES as Record<string, string>)[nom] ?? ICONE_RESSOURCE[nom] ?? null;
  /* Nom que le catalogue ne retrouve pas : l'icône et le mot, et rien de cliquable —
     même parti pris que `Instance` pour les quatre instances absentes du relevé, qui
     s'affichent en gras plutôt qu'en lien mort. */
  if (!NOM_RESOLU.has(nom)) return avecIcone ? <Objet nom={nom} taille={taille} /> : <b>{nom}</b>;
  return <NomObjet nom={nom} icone={avecIcone ? icone : null} taille={taille} />;
}

/**
 * UNE VUE DU JEU AU BORD D'UN TITRE DE SECTION.
 *
 * Demande de fond de Maxime : « les images parlent beaucoup plus ». Ces deux guides
 * n'avaient d'image que leur en-tête ; leurs sections étaient quatre barres de texte.
 *
 * TROIS PRÉCAUTIONS, chacune pour un piège déjà payé sur ce site :
 *
 * 1. Les vues viennent de `public/jeu/credits/`, le générique du client — les seules
 *    captures du jeu SANS logo d'éditeur, barre de chargement ni avertissement d'âge
 *    incrustés. Les 35 écrans de `chargement/` en portent dans leur tiers bas, et les
 *    six autres fichiers de `accueil/` aussi (vérifié à l'œil, fichier par fichier).
 * 2. LE FORMAT EST 4:3, PAS LIBRE. `shotcredit00` à `10` font 1024x768, `11` à `16`
 *    font 512x256. La vignette est donc en 4:3 exact : la vue entre en entier, rien
 *    n'est recadré. Une source 2:1 posée ici perdrait un tiers de sa largeur.
 * 3. Elle ne remplace aucun mot, donc elle n'en dit aucun : `alt=""` et `aria-hidden`.
 *    C'est de l'ambiance, choisie pour ce que la section raconte, et un lecteur d'écran
 *    n'a pas à entendre « capture du jeu » avant chaque titre.
 */
export function Vignette({ vue }: { vue: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/jeu/credits/${vue}.webp`}
      alt=""
      aria-hidden="true"
      width={92}
      height={69}
      loading="lazy"
      decoding="async"
      style={{
        width: 92, height: 69, objectFit: "cover", borderRadius: 9, flexShrink: 0,
        border: "1px solid var(--border)", filter: "saturate(.85) brightness(.82)",
      }}
    />
  );
}

/**
 * LE CADENAS DU JEU, posé sur un lien qui demande plus que d'être là.
 *
 * Les guides qui le posent sont PUBLICS. `/objets` vit dans le groupe (espace-astuces) et
 * passe par requireEspace("astuces") — la guilde, et les amis du rôle Friend : un
 * visiteur qui suit le lien n'atterrit pas sur la page mais
 * sur /login — un mur sans explication. On le dit AVANT le clic. « compte » ne sert
 * plus à personne depuis que `/mecaniques` est passée dans (public) ; le mot
 * reste pour la prochaine page qui exigera une connexion sans exiger la guilde.
 *
 * TROIS MARCHES, DONC TROIS MOTS. Les deux premiers disent une porte fermée :
 * « membres » pour la guilde, « compte » pour une connexion Discord. Le troisième est
 * né du mode vitrine et dit tout autre chose — « en partie » : la porte s'ouvre, une
 * pièce reste fermée. C'est l'état de `/crafts` depuis qu'elle est passée en vitrine :
 * les collections se lisent sans compte, les recettes non. Sans ce mot, le lien
 * mentait dans les deux sens possibles — un cadenas « membres » sur une page qu'on peut
 * visiter, ou aucun cadenas sur une page dont la moitié se refuse.
 *
 * En développement, DEV_ALL_ACCESS masque les deux premières marches — c'est pour ça
 * qu'elles se relisent dans l'arborescence et pas dans le navigateur.
 *
 * L'image est lock.webp, le cadenas du client lui-même (13x16) : le même dessin que le
 * jeu pose sur ce qui n'est pas encore ouvert, qu'un joueur reconnaît sans légende.
 */
const POURQUOI: Record<string, string> = {
  membres: "Réservé aux membres de la guilde",
  compte: "Demande un compte : connexion Discord",
  "en partie": "La page se visite ; une partie est réservée aux membres",
};

export function Verrou({ quoi }: { quoi: "membres" | "compte" | "en partie" }) {
  return (
    <span
      title={POURQUOI[quoi]}
      style={{
        display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 400,
        textTransform: "uppercase", letterSpacing: .6, color: "var(--text-muted)", verticalAlign: 1,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/jeu/interface/lock.webp" alt="" width={11} height={13}
        style={{ objectFit: "contain", imageRendering: "pixelated", opacity: .85 }} />
      {quoi}
    </span>
  );
}

type Donjon = {
  name: string; icon: string; type: string; prestige: number | null;
  hp: number; armor: string | null; prestigeDetail?: string;
};
export const DONJONS = dungeonsData as Donjon[];
export type { Donjon };

/**
 * Une instance citée dans le texte mène à sa fiche du wiki.
 *
 * Le guide nommait des donjons sans y mener : il fallait retenir le nom, ouvrir le
 * wiki, le retrouver dans une grille de vingt-trois cartes. Quatre des instances
 * qu'il nomme ne sont PAS dans le relevé (Vampirique, Tower Defense, la zone de farm
 * du P7, le Jardin Prestigieux) : elles s'affichent alors en gras, sans lien mort.
 */
export function Instance({ nom }: { nom: string }) {
  const d = DONJONS.find((x) => x.name.toLowerCase() === nom.toLowerCase());
  if (!d) return <b>{nom}</b>;
  return (
    <a href={`/donjons?instance=${encodeURIComponent(d.name)}`} className="gd-lien">
      <Icon name={d.icon as IconName} size={13} />{d.name}
    </a>
  );
}
