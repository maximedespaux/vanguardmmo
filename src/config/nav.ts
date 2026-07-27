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
};

export const ESPACES: Espace[] = [
  {
    label: "Jouer",
    icon: "sword",
    href: "/dashboard",
    acces: "guild",
    liens: [
      { label: "Tableau de bord", href: "/dashboard", icon: "gauge", desc: "Ta progression, et l'état de la guilde d'un coup d'œil." },
      { label: "Mon build", href: "/builder", icon: "shirt", desc: "Monte ton stuff sur AirBuilder et partage-le." },
      { label: "Mes personnages", href: "/personnages", icon: "users", desc: "Tes persos, leur classe et leur build." },
      { label: "Compositions", href: "/compositions", icon: "castle", desc: "Chambres Secrètes : postes, présences et consignes." },
      { label: "Donjons", href: "/donjons", icon: "skull", desc: "Les instances, leur niveau et ce qu'elles rapportent." },
      { label: "World Boss", href: "/worldboss", icon: "dragon", desc: "Les prochains passages et qui vient." },
      { label: "Guide de progression", href: "/astuces", icon: "compass", desc: "Par où commencer, et quoi viser ensuite." },
      { label: "Prestige", href: "/prestige", icon: "star", desc: "Ce que coûte un prestige et ce qu'il rapporte." },
      { label: "Mes absences", href: "/absences", icon: "moon", desc: "Préviens quand tu ne seras pas là." },
    ],
  },
  {
    label: "Économie",
    icon: "coins",
    href: "/boutique",
    acces: "public",
    liens: [
      { label: "Boutique", href: "/boutique", icon: "cart", desc: "Les objets du coffre commun, à l'achat ou en dette." },
      { label: "Mes demandes & messages", href: "/messages", icon: "message", desc: "Ce que tu as demandé, son état, et la discussion qui va avec." },
      { label: "Quêtes", href: "/quetes", icon: "target", desc: "Ce dont la guilde a besoin, et qui s'en charge.", acces: "guild" },
      { label: "Coffre & crafts", href: "/coffre", icon: "vault", desc: "Le stock réel de la guilde, coffre par coffre.", acces: "admin" },
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
      { label: "World Boss — gestion", href: "/gestion-worldboss", icon: "dragon", desc: "Planifier les passages et suivre les participations." },
      { label: "Bot Discord", href: "/discord", icon: "discord", desc: "Créneaux, rappels et interrupteurs du bot." },
      { label: "Annonce", href: "/annonce", icon: "megaphone", desc: "Écrire un message à toute la guilde sur Discord." },
      { label: "Events du jeu", href: "/events", icon: "calendar", desc: "Les événements AirFlyff annoncés par le bot." },
    ],
  },
];

/** Entrées hors espaces : elles ne se rangent nulle part, et c'est très bien. */
export const HORS_ESPACES: Lien[] = [
  { label: "Accueil", href: "/histoire", icon: "book", desc: "La guilde, son histoire et ses règles.", acces: "public" },
  { label: "Candidature", href: "/candidature", icon: "user-plus", desc: "Rejoindre Vanguard.", acces: "public" },
];
