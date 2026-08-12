import { ESPACES } from "@/config/nav";
import type { IconName } from "@/components/Icon";
import type { Porte } from "@/components/accueil/PortesSite";
import { fr, moisAn, pl, type Dashboard, type Profil } from "./donnees";

/**
 * LES PORTES DE L'ACCUEIL DE GUILDE — les pages réservées, avec ce qui t'y attend.
 *
 * ┌─ CE QUI DISTINGUE CETTE PAGE DE /sommaire, parce que la question se pose ─┐
 * │ /sommaire est l'INDEX : toutes les pages du site, la description de       │
 * │ chacune, rien d'autre. C'est le filet de sécurité — on y vient quand on   │
 * │ ne sait plus où une chose est rangée.                                     │
 * │ Cet accueil-ci montre les pages QU'ON OUVRE TOUS LES JOURS, et il montre  │
 * │ en plus ce que /sommaire ne peut pas montrer : COMBIEN attendent. Trois   │
 * │ candidatures, deux absents, huit objets sous le seuil. C'est cette        │
 * │ mesure, pas la liste, qui répond à « pour cliquer plus facilement ».      │
 * │ Le wiki public (donjons, prestige, astuces, classes, monstres, PNJ) n'est │
 * │ donc PAS ici : il est sur l'accueil public et dans le menu, et le         │
 * │ recopier aurait fait de cette page un second /sommaire. Une porte, en     │
 * │ bas, mène à l'index complet.                                             │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * LE LIBELLÉ ET LA DESCRIPTION SE LISENT DANS `config/nav.ts`, ils ne sont pas
 * réécrits ici. C'est le seul moyen de ne pas dériver : la nav appelle
 * /compositions « Chambres Secrètes » depuis la refonte, et la page qui gardait
 * l'ancien nom a mis six mois à s'en apercevoir. Le fichier de nav n'est pas
 * modifié — il est LU comme une donnée, ce qui est son rôle.
 *
 * Deux adresses n'y sont pas, et c'est volontaire de la part de la nav (« Mon
 * profil n'est PAS dans la navigation »). Elles portent donc leur propre libellé,
 * marqué comme tel.
 */

/** Toutes les entrées de la nav, à plat, par adresse. */
const NAV = new Map(ESPACES.flatMap((e) => e.liens.map((l) => [l.href, l] as const)));

type Def = {
  href: string;
  /** Repli quand l'adresse est absente de la nav — et seulement dans ce cas. */
  titre?: string;
  texte?: string;
  icon?: IconName;
  /**
   * CE QUI ATTEND, calculé sur les relevés. Rend `null` quand il n'y a rien à
   * mesurer, et alors la porte n'affiche pas de ligne de chiffre.
   *
   * C'est le point le plus important du fichier : on ne remplit pas la ligne avec
   * une promesse (« tout le stuff », « à jour ») pour faire joli. Une page dont on
   * ne sait rien compter n'affiche rien, et c'est une information honnête.
   */
  compte?: (d: Dashboard | null, p: Profil | null) => { texte: string; ton?: string } | null;
};

export type GroupePortes = {
  clef: string;
  titre: string;
  icon: IconName;
  /** Absent quand le titre se suffit — voir la note des GROUPES. */
  sous?: string;
  /** Réservé au staff : le groupe entier disparaît pour les autres. */
  admin?: boolean;
  defs: Def[];
};

/* Les teintes des chiffres. Ce sont des ÉTATS (« ça attend », « c'est en cours »),
   pas des grandeurs : une teinte qui code une grandeur est interdite sur ce site,
   et c'est pour ça que les barres de l'état de la guilde n'en ont qu'une seule.
   Ici la couleur ne remplace jamais le mot — « 3 en attente » se lit sans elle. */
const ATTENTE = "var(--red)";
const ENCOURS = "var(--blue)";

export const GROUPES: GroupePortes[] = [
  /* TROIS DES QUATRE `sous` ONT ÉTÉ RETIRÉS. « Mes affaires · Ce qui n'appartient
     qu'à toi », « Jouer ensemble · Ce qui se prépare à plusieurs », « Tenir la
     guilde · Les outils du staff » : la seconde moitié traduisait la première en
     plus de mots. Le quatrième reste parce qu'il porte un FAIT qu'on ne devine pas
     — pourquoi ces pages-là sont réservées. */
  {
    clef: "moi", titre: "Mes affaires", icon: "user",
    defs: [
      {
        href: "/profil", icon: "user-check",
        titre: "Mon profil", texte: "Ton identité Discord, tes commandes et tes mouvements de périns.",
        // Volontairement absent de la nav : le panneau du haut-droite y mène déjà.
        compte: (_d, p) => {
          const depuis = moisAn(p?.identite.membreDepuis);
          return depuis ? { texte: `membre depuis ${depuis}` } : null;
        },
      },
      {
        href: "/personnages",
        compte: (_d, p) => (p ? { texte: pl(p.compteurs.personnages, "personnage") } : null),
      },
      {
        href: "/builder",
        compte: (_d, p) => (p ? { texte: `${pl(p.compteurs.stuffs, "stuff")} enregistré${p.compteurs.stuffs > 1 ? "s" : ""}` } : null),
      },
      {
        href: "/absences",
        // Guilde entière et non « mes » absences : c'est ce que le relevé compte,
        // et savoir qui manque en ce moment est justement l'usage de la page.
        compte: (d) => (d?.absences.active ? { texte: `${pl(d.absences.active, "absent")} en ce moment`, ton: "var(--purple)" } : null),
      },
      {
        href: "/boutique",
        compte: (_d, p) => (p?.compteurs.enCours ? { texte: `${pl(p.compteurs.enCours, "commande")} en cours`, ton: ENCOURS } : null),
      },
    ],
  },
  {
    clef: "jouer", titre: "Jouer ensemble", icon: "swords",
    defs: [
      // Ni /compositions ni /quetes ne se comptent : le relevé de guilde ne dit
      // rien du nombre de créneaux ouverts ni des quêtes en cours, et l'inventer
      // serait pire que de laisser la ligne vide.
      { href: "/compositions" },
      {
        href: "/worldboss",
        compte: (d) => (d?.worldboss.upcoming ? { texte: `${pl(d.worldboss.upcoming, "passage")} à venir`, ton: ATTENTE } : null),
      },
      { href: "/quetes" },
    ],
  },
  {
    /* LE SOUS-TITRE « Réservé aux membres — la concurrence lit aussi » EST PARTI :
       il n'est plus vrai des trois pages. /objets vit bien dans (guild), mais
       /crafts est passée en VITRINE (groupe (vitrine), aucun garde : un visiteur la
       lit, seule la colonne des recettes éteintes lui est refusée) et
       /builder/mecaniques est dans (verified), donc ouverte à tout membre du serveur
       Discord, candidat compris. Un groupe qui annonce un verrou que deux de ses
       trois pages n'ont pas ment sur l'accès — exactement ce que ce fichier
       reproche aux lignes de chiffre inventées. */
    clef: "savoir", titre: "Ce que la guilde sait", icon: "book",
    defs: [
      { href: "/objets" },
      { href: "/crafts" },
      { href: "/builder/mecaniques" },
    ],
  },
  {
    clef: "staff", titre: "Tenir la guilde", icon: "shield", admin: true,
    defs: [
      {
        href: "/guildviewer",
        compte: (d) => (d ? { texte: `${fr(d.members.total)} membres · ${fr(d.members.active)} actifs` } : null),
      },
      {
        href: "/candidatures",
        compte: (d) => {
          if (!d) return null;
          if (d.candidatures.pending) return { texte: `${d.candidatures.pending} en attente`, ton: ATTENTE };
          if (d.candidatures.waiting) return { texte: `${d.candidatures.waiting} en suivi`, ton: ENCOURS };
          return d.candidatures.total ? { texte: `${fr(d.candidatures.total)} au total` } : null;
        },
      },
      {
        href: "/coffre",
        compte: (d) => {
          if (!d) return null;
          if (d.coffre.under) return { texte: `${pl(d.coffre.under, "objet")} sous le seuil`, ton: ATTENTE };
          return d.coffre.total ? { texte: `${pl(d.coffre.total, "objet")} suivi${d.coffre.total > 1 ? "s" : ""}` } : null;
        },
      },
      {
        href: "/plan-farm",
        // « 8 à combler » et non « 8 objets sous le seuil » : la porte du coffre,
        // juste au-dessus, dit déjà ce chiffre avec ce mot-là. Deux voisines qui
        // répètent la même phrase font douter qu'elles parlent de la même chose.
        compte: (d) => (d?.coffre.under ? { texte: `${d.coffre.under} à combler` } : null),
      },
      {
        /* PAS DE COMPTE ICI, et c'est un retrait réfléchi. La porte affichait
           « N persos à accompagner », pris sur characters.withoutBuild — or
           /statistiques ne montre RIEN de ce chiffre : elle compte les livraisons,
           les demandes et les quêtes (voir la page). Un chiffre sous une porte est
           une promesse sur ce qu'on va trouver derrière ; celui-là envoyait
           chercher des personnages sans build sur un écran qui n'en parle pas.
           Le fait n'est pas perdu : la barre « Personnages avec un build » le dit
           en note, et le moteur de priorités le pousse vers /personnages. */
        href: "/statistiques",
      },
      { href: "/journal" },
      { href: "/gestion-worldboss" },
      { href: "/discord" },
      { href: "/annonce" },
      { href: "/events" },
      { href: "/mes-ventes" },
    ],
  },
];

/**
 * La porte de sortie : l'index complet. Elle est à part et pas dans un groupe —
 * ce n'est pas un outil, c'est le filet de sécurité (voir la note du haut).
 */
export const PORTE_SOMMAIRE: Porte = {
  href: "/sommaire", icon: "grid", titre: "Tout le site",
  texte: "Chaque page, avec ce qu'on y fait. Quand tu ne sais pas où chercher, c'est là.",
};

/**
 * Une définition devient une porte : le libellé et la description viennent de la
 * nav, le chiffre du relevé.
 *
 * Une adresse absente de la nav ET sans repli écrit ici rend `null` plutôt qu'une
 * porte à moitié vide — ça n'arrive que si quelqu'un retire une entrée de la nav,
 * et une porte sans titre serait plus déroutante qu'une porte en moins.
 */
export function porteDe(def: Def, d: Dashboard | null, p: Profil | null): Porte | null {
  const nav = NAV.get(def.href);
  const titre = def.titre ?? nav?.label;
  const texte = def.texte ?? nav?.desc;
  const icon = def.icon ?? nav?.icon;
  if (!titre || !texte || !icon) return null;
  const c = def.compte?.(d, p) ?? null;
  return { href: def.href, icon, titre, texte, chiffre: c?.texte, ton: c?.ton };
}
