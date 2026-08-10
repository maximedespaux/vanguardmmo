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
    label: "Jouer",
    icon: "sword",
    // Le tableau de bord n'ouvre plus l'espace : il redisait les statistiques
    // sans rien apporter, et personne n'y allait pour jouer.
    href: "/personnages",
    acces: "guild",
    liens: [
      { label: "Mes personnages", href: "/personnages", icon: "users", desc: "Tes persos, et le stuff de chacun." },
      { label: "AirBuilder", href: "/builder", icon: "shirt", desc: "Monte ton stuff, pièce par pièce." },
      { label: "Compositions", href: "/compositions", icon: "castle", desc: "Chambres Secrètes : postes et présences." },
      { label: "World Boss", href: "/worldboss", icon: "dragon", desc: "Les prochains passages, et qui vient." },
      { label: "Mes absences", href: "/absences", icon: "moon", desc: "Préviens quand tu ne seras pas là." },
    ],
  },
  {
    // Ouvert à tout le monde, connecté ou non : c'est de la connaissance du
    // JEU, pas de l'activité de la guilde. C'est aussi par là qu'un joueur de
    // passage découvre Vanguard — d'où des pages indexables.
    label: "Le jeu",
    icon: "compass",
    href: "/donjons",
    acces: "public",
    liens: [
      { label: "Donjons", href: "/donjons", icon: "skull", desc: "Les instances, leur niveau et leurs butins." },
      { label: "Guide de progression", href: "/astuces", icon: "compass", desc: "Par où commencer, et quoi viser ensuite." },
      { label: "Prestige", href: "/prestige", icon: "star", desc: "Ce que coûte un prestige, ce qu'il rapporte." },
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
    acces: "public",
    liens: [
      { label: "Boutique", href: "/boutique", icon: "cart", desc: "Le coffre commun, ou une pièce sur mesure." },
      { label: "Mes demandes & messages", href: "/messages", icon: "message", desc: "Tes demandes en cours, et la discussion qui va avec." },
      { label: "Mes ventes", href: "/mes-ventes", icon: "coins", desc: "Ce que tu as fourni, et ce que ça t'a rapporté." },
      { label: "Coffre", href: "/coffre?tab=bank", icon: "vault", desc: "Le stock réel, coffre par coffre.", acces: "admin" },
      { label: "Crafts", href: "/coffre?tab=craft", icon: "hammer", desc: "Les recettes, et ce qu'elles coûtent.", acces: "admin" },
      { label: "Base des objets", href: "/coffre?tab=set", icon: "settings", desc: "Les objets, leurs catégories et leurs seuils.", acces: "admin" },
      { label: "Plan de farm", href: "/plan-farm", icon: "sprout-farm", desc: "Ce qui manque au seuil, par catégorie.", acces: "admin" },
    ],
  },
  {
    label: "Guilde",
    icon: "shield",
    href: "/guildviewer",
    acces: "admin",
    liens: [
      { label: "Membres & builds", href: "/guildviewer", icon: "users", desc: "Qui est là, avec quel perso et quel stuff." },
      { label: "Candidatures", href: "/candidatures", icon: "user-plus", desc: "Les demandes d'entrée, à accepter ou refuser." },
      { label: "Statistiques", href: "/statistiques", icon: "bar-chart", desc: "Qui livre, qui demande, et si l'activité tient." },
      { label: "Journal", href: "/journal", icon: "list", desc: "Le détail, événement par événement." },
      { label: "World Boss — gestion", href: "/gestion-worldboss", icon: "dragon", desc: "Programmer les passages, suivre les venues." },
      { label: "Bot Discord", href: "/discord", icon: "discord", desc: "Créneaux, rappels et interrupteurs du bot." },
      { label: "Annonce", href: "/annonce", icon: "megaphone", desc: "Un message à toute la guilde, sur Discord." },
      { label: "Events du jeu", href: "/events", icon: "calendar", desc: "Les événements AirFlyff annoncés par le bot." },
    ],
  },
];

/** Entrées hors espaces : elles ne se rangent nulle part, et c'est très bien. */
export const HORS_ESPACES: Lien[] = [
  { label: "Accueil", href: "/histoire", icon: "book", desc: "La guilde, son histoire et ses règles.", acces: "public" },
  { label: "Candidature", href: "/candidature", icon: "user-plus", desc: "Rejoindre Vanguard.", acces: "public" },
];
