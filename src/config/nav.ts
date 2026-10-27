import type { IconName } from "@/components/Icon";
import type { Role } from "@prisma/client";
import { canAccessAdmin, canAccessGuild } from "@/config/roles";
import { ESPACES_OUVRABLES, REGLAGE_AMIS_DEFAUT } from "@/config/amis";
import { DEV_ROLE } from "@/lib/devAccess";

/**
 * La navigation, en un seul endroit.
 *
 * Ce qui ne marchait pas : les menus portaient les noms des OUTILS (AirBuilder,
 * AirGuild, GuildViewer). Il fallait donc connaître le vocabulaire maison avant
 * de savoir où cliquer, et l'économie était éclatée sur cinq pages. Les espaces
 * portent désormais le nom de ce qu'on vient y FAIRE, et chaque entrée dit en
 * une ligne ce qu'on y trouve — c'est cette ligne, plus que le regroupement,
 * qui répond à « je m'y perds ».
 *
 * Les noms d'outils ne disparaissent pas pour autant : ils restent dans les
 * descriptions et sur les pages elles-mêmes. Ce sont les produits d'iBeats, on
 * ne les efface pas — on cesse juste de s'en servir comme panneaux indicateurs.
 *
 * CE FICHIER EST AUSSI L'INDEX DU SITE. La barre, le panneau « Tout » et le plan du
 * site (en bas de l'accueil) se génèrent tous trois d'ici, par `espacesPour`. Une
 * page vivante absente d'ici n'existe pour personne — et une entrée retirée d'un
 * espace fait aussi disparaître sa tuile de l'accueil d'un membre (« Mes outils »).
 */
/**
 * `guild` : la guilde — et, dans un espace que le rôle Discord Friend ouvre (config/amis.ts),
 * les amis de la guilde. C'est `peutOuvrir` qui le dit, avec l'espace de la ligne.
 */
export type Acces = "public" | "guild" | "admin";

/**
 * Le nom stable d'un espace, celui que portent le réglage des amis (`Setting` acces_amis)
 * et le jeton (`token.amis`). Le libellé peut changer ; la clé, non — sinon un réglage
 * enregistré fermerait en silence l'espace renommé.
 */
export type CleEspace = "airbuilder" | "astuces" | "guilde" | "bras-droits";

export type Lien = {
  label: string;
  href: string;
  icon: IconName;
  /** Une ligne, à la deuxième personne : ce qu'on vient y faire. */
  desc: string;
  acces?: Acces;
  /** Le sous-titre sous lequel le lien se range dans un déroulant à rubriques. */
  groupe?: string;
  /**
   * `false` : la page est déclarée — plan du site, « Tout », droits des onglets —
   * mais n'a pas de ligne dans la barre. C'est ce qui permet de raccourcir la barre
   * sans laisser une page vivante hors de la carte.
   */
  barre?: false;
  /**
   * Un appel à rejoindre : la barre le rend en bouton, à droite, et personne de la
   * guilde ne le voit, nulle part — on ne propose pas d'entrer à qui est entré.
   */
  appel?: true;
  /**
   * La face PUBLIQUE d'une page que la guilde a, en mieux, ailleurs : personne de la
   * guilde ne voit cette ligne, nulle part — la même règle que `appel`, sans le bouton.
   * C'est « La guilde » (/#la-guilde) : un membre a Information Guilde, qui la contient
   * en entier ; un visiteur n'a qu'elle, et c'est elle qui garde l'espace Guilde dans sa
   * barre — un espace vidé par le filtre disparaît (`espacesPour`).
   */
  horsGuilde?: true;
};

export type Espace = {
  cle: CleEspace;
  label: string;
  icon: IconName;
  /** Page ouverte si on clique sur l'espace lui-même. */
  href: string;
  /**
   * Où mène le libellé quand `href` est fermé à celui qui regarde. Sans lui, un
   * visiteur qui cliquait « Guilde » était renvoyé vers la connexion par une page
   * qu'on ne lui avait jamais montrée.
   */
  hrefVisiteur?: string;
  acces: Acces;
  liens: Lien[];
};

export const ESPACES: Espace[] = [
  {
    // L'espace porte le nom de l'outil, parce que c'est CE qu'on vient y faire :
    // monter son stuff. Les deux pages qui restent sont les deux faces du meme
    // geste — qui je joue, et avec quoi.
    cle: "airbuilder",
    label: "AirBuilder",
    icon: "shirt",
    href: "/builder",
    /* PUBLIC, comme ses deux pages : elles vivent dans le groupe (public) et le
       middleware n'en garde aucune. Le menu, lui, exigeait encore
       la guilde — un visiteur, et surtout un CANDIDAT, ne trouvait donc pas le
       builder alors que sa candidature lui demande un build. On compose sans
       compte ; c'est enregistrer et partager qui exigent la connexion, et les
       routes le verifient d'elles-memes. */
    acces: "public",
    liens: [
      /* Une VUE, plus un formulaire (2026-10-21) : la page reflète ce que l'AirBuilder
         a publié, et chaque perso, chaque stuff s'y rouvre dans le builder. Créer,
         modifier, rendre principal, supprimer : tout se fait dans l'AirBuilder. */
      { label: "Mes personnages", href: "/personnages", icon: "users", desc: "Tes persos et leurs stuffs, tels que l'AirBuilder les publie." },
      { label: "AirBuilder", href: "/builder", icon: "shirt", desc: "Monte ton stuff, pièce par pièce." },
      // « Les mécaniques » est partie dans Astuces le 2026-10-21 (Maxime : « c'est des
      // astuces en soi »), à l'adresse /mecaniques.
    ],
  },
  {
    // Ouvert à tout le monde, connecté ou non : c'est de la connaissance du
    // JEU, pas de l'activité de la guilde. C'est aussi par là qu'un joueur de
    // passage découvre Vanguard — d'où des pages indexables.
    cle: "astuces",
    label: "Astuces",
    icon: "compass",
    href: "/donjons",
    acces: "public",
    liens: [
      /* La description dit les TROIS blocs de la page depuis que l'Oasis l'a
         rejointe : un contenu que le menu ne promet pas ne se trouve pas.

         ┌──── ELLE ANNONÇAIT « 23 » ET « 52 », ET C'EST PARTI ────┐
         │ Les deux nombres étaient JUSTES — 23 instances dans      │
         │ dungeons.json, 52 vagues dans oasis-vagues.json, tous    │
         │ deux recomptés. Mais ils étaient écrits À LA MAIN dans   │
         │ un bloc servi sur LES VINGT ROUTES du site : le premier  │
         │ versement de données qui ajoute une instance rendait la  │
         │ navigation menteuse partout d'un coup, en silence.       │
         │                                                          │
         │ On ne les CALCULE pas non plus, et c'est mesuré :        │
         │ `Shell.tsx` est un composant client, donc tout ce que ce │
         │ fichier importe part dans le paquet du navigateur —      │
         │ competences.json pèse 196 Ko. Cent quatre-vingt-seize    │
         │ kilo-octets sur chaque page pour afficher « 197 ».       │
         │                                                          │
         │ La règle 4 se satisfait donc ici par le RETRAIT : une    │
         │ description de menu dit ce qu'il y a derrière le lien,   │
         │ pas combien. Les pages, elles, comptent — et elles       │
         │ comptent juste.                                          │
         └──────────────────────────────────────────────────────────┘ */
      { label: "Donjons", href: "/donjons", icon: "skull", desc: "Les instances du téléporteur, la Tour Oubliée, et les vagues de l'Oasis." },
      { label: "Guide de progression", href: "/astuces", icon: "compass", desc: "Par où commencer, et quoi viser ensuite." },
      { label: "Prestige", href: "/prestige", icon: "star", desc: "Ce que coûte un prestige, ce qu'il rapporte." },
      // Les objets et les classes viennent du client du jeu, pas de la guilde :
      // ils appartiennent donc à cet espace-là. Sans ces deux entrées, les pages
      // n'étaient atteignables qu'en tapant leur adresse — et absentes du
      // plan du site, qui est généré depuis ce fichier.
      /* LE WIKI EN PREMIER, parce que c'est la porte de tout le reste. La page cherche
         d'un seul coup dans les 12 134 objets, les 1 124 monstres, les 834 recettes et
         les 293 PNJ — là où le site portait AU MOINS DIX recherches séparées, chacune
         sur son îlot. Un joueur qui tape « Âme de démon » ne savait pas s'il devait
         aller sur /objets, /monstres ou /crafts.

         Elle a été créée sans entrée de menu, comme six pages avant elle : c'est la
         troisième fois que ça arrive dans ce chantier, et c'est toujours la même cause —
         j'interdis `nav.ts` aux passes parallèles pour éviter les conflits d'écriture,
         puis j'oublie de poser l'entrée derrière. */
      { label: "Le wiki", href: "/wiki", icon: "search", desc: "Cherche n'importe quoi : un objet, un monstre, une recette, un PNJ." },
      /* ┌──── `acces: "guild"` — ET J'AI D'ABORD CORRIGÉ ÇA À L'ENVERS ────┐
           L'entrée ne portait pas d'`acces`, donc elle héritait du PUBLIC de
           l'espace Astuces, alors que la page vit sous `(guild)` : le visiteur
           voyait « Objets » au menu, cliquait, et se faisait rediriger.

           J'ai d'abord déplacé la PAGE vers `(public)`, en m'appuyant sur un
           relevé que j'avais mal fait : je cherchais `apiGuild|requireGuild`
           dans les routes, et `/api/objets` se garde avec `apiAuth()` +
           `canAccessGuild()`. La route REFUSE donc un visiteur — la page
           publique s'affichait, et sa recherche répondait 403 sans rien dire.
           Une page qui a l'air de marcher et ne renvoie rien est pire que la
           redirection qu'elle remplaçait.

           On remet donc la page sous garde et c'est le MENU qui dit vrai. Ouvrir
           vraiment le catalogue au public demanderait d'ouvrir aussi
           `/api/objets`, et ça, c'est une décision sur ce qu'on expose — pas une
           correction de cohérence. Elle appartient à Maxime.

           `/api/pnj` et `/api/monstres`, eux, n'ont bien aucune garde : c'est
           pourquoi /pnj et /monstres sont publics sans rien casser.          */
      /* `guild` dit « la guilde », et depuis le 2026-10-21 aussi « les amis » : la page vit
         dans le groupe (espace-astuces), dont la garde est `requireEspace("astuces")`, et sa
         route dans `apiEspace("astuces")` — le rôle Friend l'ouvre si son réglage ouvre
         Astuces (config/amis.ts). Toujours rien pour un visiteur ni un candidat. */
      { label: "Objets", href: "/objets", icon: "package", desc: "Cherche un objet, ses stats et d'où il vient.", acces: "guild" },
      /* LE LEXIQUE DES MÉCANIQUES, venu de l'espace AirBuilder le 2026-10-21 (Maxime :
         « c'est des astuces en soi ») : ce que veut dire « éveil R1 » ou « perçage
         Fulgur », avec les icônes du jeu. Juste sous Objets, parce que ce sont les mots
         des objets. Publique : un lexique du jeu, qui ne lit aucune route membre.
         `gem`, comme son bouton dans l'AirBuilder et sa tuile du guide ; aucun voisin
         ne la porte. L'ancienne adresse /builder/mecaniques redirige ici (308). */
      { label: "Les mécaniques", href: "/mecaniques", icon: "gem", desc: "Artefact, rareté, gemmes, runes, perçage : ce que chaque mot veut dire." },
      /* QUATRE ENTRÉES ONT DISPARU D'ICI, et ce n'est pas une perte de contenu :
         les pages ont FUSIONNÉ dans le compartiment qui les concernait. Demande de
         Maxime, mot pour mot : « le but est d'avoir le moins de page possible mais
         retrouver les informations dans les bons compartiment ».

         · Compétences → /classes. Une compétence n'existe que dans la lignée qui
           l'apprend ; les deux écrans se lisaient l'un avec l'autre.
         · Protection de l'Oasis → /donjons, troisième bloc après les 23 donjons et
           la Tour Oubliée. Même question : dans quoi j'entre, et qu'est-ce qui m'y
           attend.
         · Collections → /crafts. Fabriquer et collectionner sont les deux faces du
           même jeu de longue haleine.
         · Astuces de guilde → /mecaniques, désigné « pas utile » comme page
           par Maxime alors que ses FAITS sont la meilleure matière des mécaniques.

         Les quatre adresses restent vivantes en redirection : elles ont pu circuler
         sur le Discord. Mais on ne navigue plus par elles — les liens internes du
         site pointent la destination directement. Douze entrées, huit désormais. */
      // « les 197 compétences » : même retrait, même raison qu'au-dessus.
      { label: "Classes & compétences", href: "/classes", icon: "sword-cross", desc: "La chaîne de promotion, et les compétences qu'elle apprend." },
      // « paw » et non « skull » : Donjons porte déjà skull dans ce groupe, et
      // deux voisins de la même liste avec la même icône ne se distinguent plus.
      { label: "Monstres", href: "/monstres", icon: "paw", desc: "PV, dégâts, élément — et les boss à plusieurs vies." },
      { label: "PNJ", href: "/pnj", icon: "users", desc: "Qui vend quoi, et où le trouver." },
      /* PUBLIQUE, et c'était le menu qui mentait. La page vit dans (vitrine), sans
         garde : un visiteur y lit les collections, les recettes lui restent fermées
         (/api/crafts est gardée) et un bandeau le lui dit. Le menu la disait
         « guilde » et la cachait donc à ceux pour qui elle a été refaite. Le libellé
         porte les deux sujets depuis que les collections l'ont rejointe. */
      { label: "Crafts & collections", href: "/crafts", icon: "hammer", desc: "Les recettes, l'arbre du farm, les titres, succès, anges et maîtrises." },
      // Le World Boss est parti dans Guilde : sa page dit qui vient au prochain
      // passage, c'est un rendez-vous de la guilde, et elle est fermée aux visiteurs.
    ],
  },
  {
    /* LA BARRE EST PASSÉE DE HUIT ENTRÉES À QUATRE, et c'est surtout ici que ça se
       joue. « Quête Guilde » et « Boutique » étaient deux espaces à elles seules, et
       les pages du staff s'éparpillaient sous deux menus. Demande de Maxime : « retire
       boutique et quête guilde, je veux qu'une page accueil mais complète ».

       QUÊTE GUILDE A QUITTÉ LE SITE le 2026-10-21 (Maxime : « Enlever le bouton Quêtes
       devenu inutile » — « Quêtes » = TOUT Quête Guilde). Sa page, ses routes et l'onglet
       du dossier sont partis ; ses lignes restent en base, et /quetes mène à Information
       Guilde (next.config.js). La Boutique était partie le même jour avec le coffre et
       les ventes : ses adresses redirigent vers l'accueil.

       L'espace est PUBLIC parce qu'un visiteur y trouve « La guilde ». Chaque lien
       réservé porte donc `acces: "guild"` EN TOUTES LETTRES : un lien sans `acces` hérite
       de l'espace, et un visiteur verrait alors au menu des pages qui le renvoient vers
       la connexion. */
    cle: "guilde",
    label: "Guilde",
    icon: "shield",
    /* Le libellé mène à Information Guilde, la première ligne du menu et la page où un
       membre arrive après la connexion (/api/arrivee). Il menait aux Chambres Secrètes,
       qui restent à une ligne de là. Un visiteur, lui, ne peut pas l'ouvrir : il arrive
       sur la présentation publique de la guilde, sur l'accueil. */
    href: "/guilde",
    hrefVisiteur: "/#la-guilde",
    acces: "public",
    liens: [
      /* INFORMATION GUILDE — « La guilde et ses règles » renommée et devenue une page
         (SPEC-INFORMATION-GUILDE §2) : le récap, qui est qui (Discord et persos), les
         classes, le recensement, le suivi des mesures, et « La guilde » en entier. Le
         RECENSEMENT n'a plus de ligne : c'est une section de cette page, et /recensement
         y redirige (#recensement). `landmark` : la maison de la guilde ; aucun voisin
         ne la porte. */
      { label: "Information Guilde", href: "/guilde", icon: "landmark", desc: "Qui est qui, les classes, le recensement — et les règles de la guilde.", acces: "guild" },
      /* SA FACE PUBLIQUE : la section « La guilde » de l'accueil, la seule ligne d'un
         visiteur (et donc ce qui garde l'espace dans sa barre, où il devient un lien
         direct). Un membre ne la voit pas : Information Guilde la contient en entier. */
      { label: "La guilde", href: "/#la-guilde", icon: "book", desc: "Son histoire, ce qu'on attend de chacun, et les règles.", acces: "public", horsGuilde: true },
      /* « Chambres Secrètes » et non « Compositions » — demande de Maxime, et la
         bannière de la page portait déjà ce nom : le menu était le seul endroit à
         dire autre chose. L'ADRESSE, elle, reste /compositions : des inscriptions,
         des créneaux et des liens de build en base pointent dessus, et la renommer
         casserait plus que ça n'éclaircit. */
      { label: "Chambres Secrètes", href: "/compositions", icon: "castle", desc: "Qui vient, à quel poste, qui tient quoi à chaque phase, le chrono en direct, et comment on joue chaque salle.", acces: "guild" },
      // Venu d'Astuces : un passage de World Boss est un rendez-vous de la guilde.
      { label: "World Boss", href: "/worldboss", icon: "dragon", desc: "Les prochains passages, et qui vient.", acces: "guild" },
      { label: "Mes absences", href: "/absences", icon: "moon", desc: "Préviens quand tu ne seras pas là.", acces: "guild" },
      // « Accueil de la guilde » (/dashboard) est partie : l'accueil est unique et public.
    ],
  },
  {
    /* LES BRAS DROITS — les quatre rangs du staff, la règle de `canAccessAdmin`.
       Leurs pages étaient rangées sous DEUX menus, Boutique et Guilde, mêlées aux
       pages des membres. Elles ont désormais leur espace, et leurs rubriques
       (`groupe`) : on cherche « les membres » ou « un outil », pas un nom de page.

       Statistiques, Journal, Coffre & crafts, Plan de farm et Mes ventes ont quitté
       le site le 2026-10-21 (décision de Maxime) ; leurs adresses redirigent vers le
       tableau de bord. « Suivi » les remplace par ce que Maxime a demandé : « un suivi
       du stuff, dashboard, les classes de la guilde, dégâts etc… les choses utiles ».

       LE TABLEAU DE BORD EST DEVENU TOUT-EN-UN le 2026-10-21 (SPEC-INFORMATION-GUILDE §3,
       Maxime : « tout en un pour éviter les multiples pages ») : le GuildViewer, ses
       absences, le Suivi et les Candidatures sont des SECTIONS de /staff (`?section=`),
       et leurs anciennes adresses y redirigent avec leur requête (next.config.js). Les
       lignes de la rubrique « Tableau de bord » sont ces sections : elles donnent aussi
       les onglets de la page (staff/page.tsx), qui les lit ici. Des vues d'une page, pas
       des pages — la barre ne les allume donc pas (Shell, `?`) ; l'onglet de la page le
       fait.

       La rubrique « Outils » garde ses pages, qui ont des formulaires à elles ; leur
       barre d'onglets (SectionTabs `rubrique`) se lit toujours ici. Cet espace ne donne
       aucun droit : les mêmes quatre rangs ouvraient déjà tout, et les gardes n'ont pas
       bougé. */
    cle: "bras-droits",
    label: "Bras droits",
    icon: "crown",
    href: "/staff",
    acces: "admin",
    liens: [
      { label: "Tableau de bord", href: "/staff", icon: "gauge", desc: "Ce qui attend un geste du staff, le plus urgent d'abord.", groupe: "Tableau de bord" },
      { label: "Membres & builds", href: "/staff?section=membres", icon: "users", desc: "Qui est là, avec quel perso et quel stuff — et son dossier.", groupe: "Tableau de bord" },
      { label: "Absences", href: "/staff?section=absences", icon: "moon", desc: "Qui est absent, qui revient, et depuis quand.", groupe: "Tableau de bord" },
      { label: "Suivi", href: "/staff?section=suivi", icon: "bar-chart", desc: "Le stuff de chacun, les classes, les dégâts et PV mesurés.", groupe: "Tableau de bord" },
      { label: "Candidatures", href: "/staff?section=candidatures", icon: "user-plus", desc: "Les demandes d'entrée, à accepter ou refuser.", groupe: "Tableau de bord" },
      { label: "Bot Discord", href: "/discord", icon: "discord", desc: "Créneaux, rappels, embeds et giveaways du bot.", groupe: "Outils" },
      /* LE PARAMÉTRAGE DES CHAMBRES ET DU GUILD SIEGE (SPEC-CHAMBRES-RECENSEMENT §9, lot 2 ;
         décisions 5 et 10 de Maxime : « tout paramétrable », dans l'espace Bras droits) :
         étapes, phases, monstres par étape, postes, consignes, textes, rappels, dégâts.
         Déclarée dans le même mouvement que sa page. Hors de la barre (`barre: false`), comme
         le dit la spec : on y vient depuis Bot Discord, la page des Chambres (« Paramétrer »)
         et les onglets de la rubrique Outils — mais le plan du site et « Tout » la portent.
         `settings` : aucun voisin ne la porte. L'accès est celui de l'espace (`admin`). */
      { label: "Paramétrage des événements", href: "/discord/evenements", icon: "settings", desc: "Étapes, monstres, postes, textes et rappels des Chambres et du Guild Siege.", groupe: "Outils", barre: false },
      { label: "World Boss — gestion", href: "/gestion-worldboss", icon: "dragon", desc: "Programmer les passages, suivre les venues.", groupe: "Outils" },
      // « Annonce » est partie dans l'onglet Embed du Bot Discord : c'était la même
      // commande (/annonce y redirige).
      { label: "Events du jeu", href: "/events", icon: "calendar", desc: "Les événements Airborn annoncés par le bot.", groupe: "Outils" },
      /* LE RÉGLAGE DES AMIS (SPEC-INFORMATION-GUILDE §9, Maxime : « avoir un espace
         paramétrable si jamais on souhaite changer ») : quels rôles Discord font un ami, et
         quels espaces ils lui ouvrent. `key` : une clé qu'on confie ; aucun voisin ne la
         porte. */
      { label: "Accès des amis", href: "/acces-amis", icon: "key", desc: "Le rôle Discord Friend : qui le porte, et ce qu'il ouvre.", groupe: "Outils" },
    ],
  },
];

/** Entrées hors espaces : elles ne se rangent nulle part, et c'est très bien. */
export const HORS_ESPACES: Lien[] = [
  // L'accueil, PUBLIC et NEUTRE (2026-10-21) : la même vitrine pour tous, et en tête
  // les personnages de qui en a. Les infos internes sont parties de là.
  { label: "Accueil", href: "/", icon: "home", desc: "Ce que fait le site, les huit classes, la guilde, et le plan de tout le reste.", acces: "public" },
  /* « Postuler » et non « Candidature » : le bouton dit le geste, pas le formulaire.
     « La guilde » et « Toutes les pages » ont quitté cette liste : la première est une
     ligne de Guilde, la seconde est devenue le plan du site, en bas de l'accueil —
     /sommaire y redirige. */
  { label: "Postuler", href: "/candidature", icon: "user-plus", desc: "Rejoindre GENESIS.", acces: "public", appel: true },
  /* Déclaré pour la première fois. On y entre par le panneau du profil, en haut à
     droite, et une seconde porte dans la barre aurait fait douter qu'il s'agisse de la
     même page — d'où `barre: false`. Mais une page que la carte ignore manque au plan
     du site, et ses onglets la croient réservée au staff (`accesDe`). */
  { label: "Mon profil", href: "/profil", icon: "user-check", desc: "Ton Discord, tes personnages et leurs stuffs.", acces: "guild", barre: false },
];

/**
 * QUI OUVRE QUOI, lu dans cette carte et nulle part ailleurs.
 *
 * Les barres d'onglets recopiaient leurs adresses sans leurs droits : l'onglet
 * « World Boss » de /donjons s'affichait à un visiteur et l'envoyait sur /login.
 * Le niveau d'une adresse est donc celui de son entrée ici (`l.acces ?? e.acces`,
 * la même règle que la barre), et pas une seconde liste à tenir à jour.
 *
 * Ce n'est qu'un AFFICHAGE : la page et ses routes gardent leur propre garde.
 */
export function accesDe(href: string): Acces | undefined {
  // Ni `?onglet=` ni `#creneaux` ne font partie de l'adresse d'une page.
  const chemin = href.split(/[?#]/)[0];
  for (const e of ESPACES) {
    const l = e.liens.find((x) => x.href.split(/[?#]/)[0] === chemin);
    if (l) return l.acces ?? e.acces;
  }
  const h = HORS_ESPACES.find((x) => x.href.split(/[?#]/)[0] === chemin);
  return h ? (h.acces ?? "public") : undefined;
}

/**
 * L'espace qui range cette adresse — ou une de ses sous-pages (/objets/123 est dans
 * Astuces, /compositions/build/… dans Guilde). La plus longue ligne qui la contient
 * l'emporte ; l'accueil (« / », « /#la-guilde ») ne contient rien d'autre que lui.
 *
 * C'est ce que la décision lit pour savoir si le rôle Friend ouvre une page : le
 * middleware n'a que l'adresse. Une sous-page qui n'est PAS celle de l'espace garde sa
 * propre garde : /builder/<membre> (le build d'un autre) appelle `requireGuild`, que le
 * rôle Friend n'ouvre pas.
 */
export function espaceDe(href: string): CleEspace | undefined {
  const chemin = href.split(/[?#]/)[0];
  let trouve: { cle: CleEspace; long: number } | undefined;
  for (const e of ESPACES) {
    for (const l of e.liens) {
      const base = l.href.split(/[?#]/)[0];
      if (base === "/" || !(chemin === base || chemin.startsWith(base + "/"))) continue;
      if (!trouve || base.length > trouve.long) trouve = { cle: e.cle, long: base.length };
    }
  }
  return trouve?.cle;
}

/**
 * QUI REGARDE — tout ce que la décision lit, et rien d'autre.
 *  · `role` : le rang, `User.role` (Discord) ;
 *  · `devAll` : le « tout ouvert » du dev local (lib/devAccess.ts) ;
 *  · `amis` : les espaces que le rôle Discord Friend ouvre à ce compte (config/amis.ts) —
 *    le jeton les porte (lib/auth.ts), les gardes serveur les recalculent sur le compte.
 */
export type Qui = { role: Role; devAll?: boolean; amis?: readonly string[] };

/**
 * CE COMPTE FRANCHIT-IL CE NIVEAU, DANS CET ESPACE ? — LA décision du site.
 *
 * Une seule fonction, lue partout où l'on décide : le middleware (edge), la barre, le
 * panneau « Tout », le plan du site, les onglets, et les gardes `requireEspace` /
 * `apiEspace` des pages et des routes des espaces ouverts aux amis (lib/access.ts).
 * Recopier la règle à côté, c'était la voir dériver : le sommaire avait déjà pris du
 * retard sur la barre une fois.
 *
 * Le rôle Friend n'ouvre que le niveau `guild`, et seulement dans un espace qu'il ouvre
 * ET que le plafond permet (`ESPACES_OUVRABLES`) : un jeton qui porterait « guilde » ou
 * « bras-droits » n'ouvrirait rien. Le staff (`admin`) reste au rang, sans exception.
 * Sans `espace`, la ligne n'est d'aucun espace (le profil) : le rang seul décide.
 */
export function peutOuvrir(acces: Acces, qui: Qui, espace?: CleEspace): boolean {
  if (qui.devAll || acces === "public") return true;
  if (acces === "admin") return canAccessAdmin(qui.role);
  if (canAccessGuild(qui.role)) return true;
  return espace !== undefined
    && (ESPACES_OUVRABLES as readonly string[]).includes(espace)
    && (qui.amis ?? []).includes(espace);
}

/** La barre ne porte que ses lignes ; le plan du site et « Tout » portent tout. */
export type Vue = "barre" | "plan";

/**
 * CE QUE CE COMPTE VOIT DE LA CARTE — la seule fonction de filtre du site.
 *
 * La barre, le panneau « Tout » et le plan du site recopiaient chacun le même
 * filtre, et le sommaire avait déjà pris du retard sur la barre une fois. Ils
 * lisent maintenant tous ceci. On ne montre que ce qui s'ouvre : annoncer une page
 * pour la refuser ensuite est pire que de la taire. Un espace vidé par le filtre
 * disparaît avec ses lignes.
 *
 * Un ami (`qui.amis`) n'est pas de la guilde : il garde donc « Postuler » et la
 * présentation publique de la guilde, comme un visiteur — seul le RANG les retire.
 */
export function espacesPour(qui: Qui, vue: Vue = "plan"): { espaces: Espace[]; hors: Lien[] } {
  const montre = (l: Lien, defaut: Acces, espace?: CleEspace) =>
    peutOuvrir(l.acces ?? defaut, qui, espace)
    && !(vue === "barre" && l.barre === false)
    && !((l.appel || l.horsGuilde) && canAccessGuild(qui.role));
  const espaces = ESPACES
    .filter((e) => peutOuvrir(e.acces, qui, e.cle))
    .map((e) => ({ ...e, liens: e.liens.filter((l) => montre(l, e.acces, e.cle)) }))
    .filter((e) => e.liens.length > 0);
  return { espaces, hors: HORS_ESPACES.filter((l) => montre(l, "public")) };
}

/**
 * Pour qui la navigation se dessine. `connecte` : la cloche et le profil plutôt que
 * « Se connecter ». `amis` : les espaces que le rôle Friend lui ouvre (vide sinon).
 */
export type Regard = { role: Role; devAll: boolean; connecte: boolean; amis: string[] };

/**
 * Le regard que la navigation montre : celui de la session — ou, en local, celui de
 * DEV_ROLE (voir lib/devAccess.ts), qui coupe alors le « tout ouvert » de DEV_ALL
 * pour que la barre soit vraiment celle de ce rôle.
 */
export function regardDe(session: { user?: unknown } | null | undefined): Regard {
  if (DEV_ROLE === "VISITEUR") return { role: "RECRUE", devAll: false, connecte: false, amis: [] };
  /* Un ami simulé ouvre les espaces du réglage PAR DÉFAUT : le navigateur ne lit pas la
     base, et c'est la barre d'un ami qu'on vient regarder, pas le réglage du jour. */
  if (DEV_ROLE === "AMI") return { role: "RECRUE", devAll: false, connecte: true, amis: [...REGLAGE_AMIS_DEFAUT.espaces] };
  if (DEV_ROLE) return { role: DEV_ROLE, devAll: false, connecte: true, amis: [] };
  const devAll = process.env.NEXT_PUBLIC_DEV_ALL_ACCESS === "1";
  /* Sous DEV_ALL il n'y a pas de session, et le repli RECRUE faisait du compte de dev
     (DIRECTION en base, lib/access.ts) un candidat : « Postuler » s'affichait à côté
     de « Bras droits ». */
  const u = session?.user as { role?: Role; amis?: string[] } | undefined;
  const role = u?.role ?? (devAll ? "DIRECTION" : "RECRUE");
  return { role, devAll, connecte: Boolean(session) || devAll, amis: Array.isArray(u?.amis) ? u.amis : [] };
}
