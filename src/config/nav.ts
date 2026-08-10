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
      { label: "Donjons", href: "/donjons", icon: "skull", desc: "Les instances, leur niveau et leurs butins." },
      { label: "Guide de progression", href: "/astuces", icon: "compass", desc: "Par où commencer, et quoi viser ensuite." },
      { label: "Prestige", href: "/prestige", icon: "star", desc: "Ce que coûte un prestige, ce qu'il rapporte." },
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
    label: "Économie",
    icon: "coins",
    href: "/boutique",
    /* Etait "public" : la boutique s'ouvrait a tout compte connecte, y compris
       un Recrue. Un Recrue est un visiteur — le stock commun et les commandes
       ne le regardent pas. L'espace entier descend au niveau guilde. */
    acces: "guild",
    liens: [
      { label: "Boutique", href: "/boutique", icon: "cart", desc: "Le coffre commun, ou une pièce sur mesure." },
      { label: "Mes demandes & messages", href: "/messages", icon: "message", desc: "Tes demandes en cours, et la discussion qui va avec." },
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
    href: "/compositions",
    acces: "guild",
    liens: [
      { label: "Compositions", href: "/compositions", icon: "castle", desc: "Chambres Secrètes : postes et présences." },
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
  { label: "Accueil", href: "/histoire", icon: "book", desc: "La guilde, son histoire et ses règles.", acces: "public" },
  { label: "Candidature", href: "/candidature", icon: "user-plus", desc: "Rejoindre Vanguard.", acces: "public" },
];
