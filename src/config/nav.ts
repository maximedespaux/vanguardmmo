import type { IconName } from "@/components/Icon";

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
 * Aucune URL ne change : rien n'a bougé sur le disque, seule la carte change.
 */
export type Acces = "public" | "guild" | "admin";

export type Lien = {
  label: string;
  href: string;
  icon: IconName;
  /** Une ligne, à la deuxième personne : ce qu'on vient y faire. */
  desc: string;
  acces?: Acces;
};

export type Espace = {
  label: string;
  icon: IconName;
  /** Page ouverte si on clique sur l'espace lui-même. */
  href: string;
  acces: Acces;
  liens: Lien[];
  /**
   * Entrée qui mène DIRECTEMENT à sa page, sans menu déroulant. Réservé à ce
   * qu'on ouvre tous les jours : un déroulant à une seule ligne ajoute un clic
   * pour rien, et enterre justement ce qu'on veut mettre en avant.
   */
  direct?: boolean;
};

export const ESPACES: Espace[] = [
  {
    // L'espace porte le nom de l'outil, parce que c'est CE qu'on vient y faire :
    // monter son stuff. Les deux pages qui restent sont les deux faces du meme
    // geste — qui je joue, et avec quoi.
    label: "AirBuilder",
    icon: "shirt",
    href: "/builder",
    /* PUBLIC, comme ses deux pages : elles vivent dans le groupe (public) et le
       middleware les en a explicitement sorties. Le menu, lui, exigeait encore
       la guilde — un visiteur, et surtout un CANDIDAT, ne trouvait donc pas le
       builder alors que sa candidature lui demande un build. On compose sans
       compte ; c'est enregistrer et partager qui exigent la connexion, et les
       routes le verifient d'elles-memes. */
    acces: "public",
    liens: [
      { label: "Mes personnages", href: "/personnages", icon: "users", desc: "Tes persos, et le stuff de chacun." },
      { label: "AirBuilder", href: "/builder", icon: "shirt", desc: "Monte ton stuff, pièce par pièce." },
      // Le lexique des mécaniques : ce que veut dire « éveil R1 » ou « perçage
      // Fulgur », avec les icônes du jeu. Rattaché au builder parce que c'est là
      // qu'on rencontre ces mots.
      { label: "Les mécaniques", href: "/builder/mecaniques", icon: "info", desc: "Artefact, rareté, gemmes, runes, perçage : ce que chaque mot veut dire." },
    ],
  },
  {
    // Ouvert à tout le monde, connecté ou non : c'est de la connaissance du
    // JEU, pas de l'activité de la guilde. C'est aussi par là qu'un joueur de
    // passage découvre Vanguard — d'où des pages indexables.
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
      // sommaire, qui est généré depuis ce fichier.
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
      { label: "Objets", href: "/objets", icon: "package", desc: "Cherche un objet, ses stats et d'où il vient." },
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
         · Astuces de guilde → /builder/mecaniques, désigné « pas utile » comme page
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
      // Réservée à la guilde : la page dit quelles recettes sont ÉTEINTES, donc où
      // la concurrence farme dans le vide. Le libellé porte les deux sujets depuis
      // que les collections l'ont rejointe.
      { label: "Crafts & collections", href: "/crafts", icon: "hammer", desc: "Les recettes, l'arbre du farm, les titres, succès, anges et maîtrises.", acces: "guild" },
      // Le World Boss est une connaissance du JEU — quand il passe, ce qu'il
      // lache — avant d'etre une affaire de guilde. Sa page reste reservee aux
      // membres : c'est le lien qui porte l'exigence, pas l'espace.
      { label: "World Boss", href: "/worldboss", icon: "dragon", desc: "Les prochains passages, et qui vient.", acces: "guild" },
    ],
  },
  {
    label: "Quête Guilde",
    icon: "target",
    href: "/quetes",
    acces: "guild",
    direct: true,
    liens: [
      { label: "Quête Guilde", href: "/quetes", icon: "target", desc: "Ce que la guilde cherche, et qui s'en charge." },
    ],
  },
  {
    /* Elle s'appelait « Économie » : un mot de gestionnaire pour un endroit où
       l'on vient acheter. Et « Mes demandes & messages » en était une entrée
       séparée, alors qu'on ne suit pas une commande ailleurs qu'à l'endroit où
       on l'a passée — le suivi est devenu un onglet DE la Boutique. */
    label: "Boutique",
    icon: "cart",
    href: "/boutique",
    /* Etait "public" : la boutique s'ouvrait a tout compte connecte, y compris
       un Recrue. Un Recrue est un visiteur — le stock commun et les commandes
       ne le regardent pas. L'espace entier descend au niveau guilde. */
    acces: "guild",
    liens: [
      { label: "Boutique", href: "/boutique", icon: "cart", desc: "Le coffre commun, une pièce sur mesure, et le suivi de ta commande." },
      // « Mon profil » n'est PAS dans la navigation : ses affaires perso ne sont pas
      // une destination de l'espace Boutique. On y entre par le panneau du
      // haut-droite, qui affiche déjà l'essentiel et mène au détail — deux portes
      // pour la même chose auraient fait douter qu'il s'agisse de la même.
      // La page /profil existe et reste atteignable par ce panneau.
      { label: "Mes ventes", href: "/mes-ventes", icon: "coins", desc: "Ce que tu as fourni, et ce que ça t'a rapporté.", acces: "admin" },
      // Coffre, Crafts et Base des objets etaient trois entrees pour UNE page :
      // ce sont les onglets d'AirGuild, pas des destinations differentes — elles
      // s'allumaient d'ailleurs toutes les trois ensemble, l'adresse etant la
      // meme. Une seule entree, dont le libelle dit ce qu'on vient y FAIRE et la
      // description ce qu'on y trouve : « AirGuild » seul ne l'apprend a personne.
      { label: "Coffre & crafts", href: "/coffre", icon: "vault", desc: "Le stock, les recettes et la base des objets — l'outil AirGuild.", acces: "admin" },
      { label: "Plan de farm", href: "/plan-farm", icon: "sprout-farm", desc: "Ce qui manque au seuil, par catégorie.", acces: "admin" },
    ],
  },
  {
    /* L'espace descend au niveau GUILDE. Il etait reserve au staff : y ranger
       Compositions et Mes absences les aurait fait disparaitre pour les membres,
       puisque l'espace entier se serait masque. Ce sont donc les LIENS qui
       portent l'exigence — ceux du staff restent marques `admin`. */
    label: "Guilde",
    icon: "shield",
    /* L'ESPACE OUVRE SUR SON ACCUEIL, plus sur les Chambres Secrètes. Demande de
       Maxime : « faire un même système pour l'accueil guilde (par défaut l'accueil de
       la guilde) ». /dashboard est devenu cet accueil — le même système de portes que
       l'accueil public — et il n'était atteignable que par une porte de la page
       publique, jamais par le menu. Cliquer « Guilde » tombait donc directement sur
       une composition, ce qui n'est pas ce qu'on cherche en arrivant. */
    href: "/dashboard",
    acces: "guild",
    liens: [
      { label: "Accueil de la guilde", href: "/dashboard", icon: "home", desc: "Où j'en suis, et tout ce qui est réservé aux membres." },
      /* « Chambres Secrètes » et non « Compositions » — demande de Maxime, et la
         bannière de la page portait déjà ce nom : le menu était le seul endroit à
         dire autre chose. L'ADRESSE, elle, reste /compositions : des inscriptions,
         des créneaux et des liens de build en base pointent dessus, et la renommer
         casserait plus que ça n'éclaircit. */
      { label: "Chambres Secrètes", href: "/compositions", icon: "castle", desc: "Qui vient, à quel poste, et comment on joue chaque salle." },
      { label: "Mes absences", href: "/absences", icon: "moon", desc: "Préviens quand tu ne seras pas là." },
      { label: "Membres & builds", href: "/guildviewer", icon: "users", desc: "Qui est là, avec quel perso et quel stuff.", acces: "admin" },
      { label: "Candidatures", href: "/candidatures", icon: "user-plus", desc: "Les demandes d'entrée, à accepter ou refuser." , acces: "admin" },
      { label: "Statistiques", href: "/statistiques", icon: "bar-chart", desc: "Qui livre, qui demande, et si l'activité tient." , acces: "admin" },
      { label: "Journal", href: "/journal", icon: "list", desc: "Le détail, événement par événement." , acces: "admin" },
      { label: "World Boss — gestion", href: "/gestion-worldboss", icon: "dragon", desc: "Programmer les passages, suivre les venues." , acces: "admin" },
      { label: "Bot Discord", href: "/discord", icon: "discord", desc: "Créneaux, rappels et interrupteurs du bot." , acces: "admin" },
      { label: "Annonce", href: "/annonce", icon: "megaphone", desc: "Un message à toute la guilde, sur Discord." , acces: "admin" },
      { label: "Events du jeu", href: "/events", icon: "calendar", desc: "Les événements AirFlyff annoncés par le bot." , acces: "admin" },
    ],
  },
];

/** Entrées hors espaces : elles ne se rangent nulle part, et c'est très bien. */
export const HORS_ESPACES: Lien[] = [
  // `/` était un simple renvoi vers /histoire ; c'est désormais une vraie page
  // d'accueil, avec les huit classes et par où commencer. Les deux entrées sont
  // donc distinctes, et « Accueil » mène enfin à l'accueil.
  { label: "Accueil", href: "/", icon: "home", desc: "Le jeu, les huit classes, et par où commencer.", acces: "public" },
  { label: "La guilde", href: "/histoire", icon: "book", desc: "La guilde, son histoire et ses règles.", acces: "public" },
  { label: "Candidature", href: "/candidature", icon: "user-plus", desc: "Rejoindre Vanguard.", acces: "public" },
  /* LE SOMMAIRE N'ÉTAIT ATTEIGNABLE QU'EN TAPANT SON ADRESSE. Un audit des 48 routes du
     dépôt l'a montré : il n'était cité nulle part comme LIEN — seulement dans la table
     des fonds d'écran de Shell, ce qui ne mène à rien. Le panneau « Tout » n'y menait pas
     davantage, puisqu'il rend les entrées de ce fichier et que celle-ci n'existait pas.

     Il est ici et non dans un espace : c'est la page qui liste TOUS les espaces, la
     ranger dans l'un d'eux la subordonnerait à son voisin. Elle se génère depuis ce
     fichier, donc s'y déclarer est un peu circulaire — et sans conséquence : elle
     s'affichera dans sa propre liste, ce qui est exactement ce qu'on attend d'un index.

     Réservée à la guilde, comme la garde du middleware l'exige déjà pour cette adresse. */
  { label: "Toutes les pages", href: "/sommaire", icon: "grid", desc: "L'index du site, espace par espace.", acces: "guild" },
];
